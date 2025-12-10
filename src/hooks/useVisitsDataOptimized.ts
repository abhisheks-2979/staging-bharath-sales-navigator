import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';

interface UseVisitsDataOptimizedProps {
  userId: string | undefined;
  selectedDate: string;
}

interface PointsData {
  total: number;
  byRetailer: Map<string, { name: string; points: number; visitId: string | null }>;
}

interface ProgressStats {
  planned: number;
  productive: number;
  unproductive: number;
  totalOrders: number;
  totalOrderValue: number;
}

// Helper to check if two arrays have the same content (by ID)
const arraysEqual = (a: any[], b: any[], key = 'id'): boolean => {
  if (a.length !== b.length) return false;
  const aIds = new Set(a.map(item => item[key]));
  const bIds = new Set(b.map(item => item[key]));
  if (aIds.size !== bIds.size) return false;
  for (const id of aIds) {
    if (!bIds.has(id)) return false;
  }
  // Also check for value changes in key fields
  const aMap = new Map(a.map(item => [item[key], item]));
  for (const bItem of b) {
    const aItem = aMap.get(bItem[key]);
    if (!aItem) return false;
    // Check status and total_amount for visits/orders
    if (aItem.status !== bItem.status) return false;
    if (aItem.total_amount !== bItem.total_amount) return false;
  }
  return true;
};

const progressStatsEqual = (a: ProgressStats, b: ProgressStats): boolean => {
  return a.planned === b.planned &&
    a.productive === b.productive &&
    a.unproductive === b.unproductive &&
    a.totalOrders === b.totalOrders &&
    a.totalOrderValue === b.totalOrderValue;
};

export const useVisitsDataOptimized = ({ userId, selectedDate }: UseVisitsDataOptimizedProps) => {
  const [beatPlans, setBeatPlans] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<PointsData>({ total: 0, byRetailer: new Map() });
  const [progressStats, setProgressStats] = useState<ProgressStats>({ 
    planned: 0, 
    productive: 0, 
    unproductive: 0, 
    totalOrders: 0,
    totalOrderValue: 0 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  
  // Track last loaded date to avoid clearing data unnecessarily
  const lastLoadedDateRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // CACHE-FIRST LOADING: Load from cache immediately, sync in background
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!userId || !selectedDate) return;
    
    // Prevent concurrent loads
    if (isLoadingRef.current && !forceRefresh) {
      console.log('⏳ [VisitsData] Skipping load - already loading');
      return;
    }
    
    isLoadingRef.current = true;
    
    // Check if this is a different date - if so, we need to force refresh state
    const isSameDate = lastLoadedDateRef.current === selectedDate;
    const isDateChange = !isSameDate;
    
    if (isDateChange) {
      setIsLoading(true);
      // CRITICAL: Clear previous date's data immediately when switching dates
      // This prevents showing stale retailers from previous date
      console.log('📅 [VisitsData] Date changed from', lastLoadedDateRef.current, 'to', selectedDate, '- clearing all data');
      setBeatPlans([]);
      setVisits([]);
      setRetailers([]);
      setOrders([]);
      setProgressStats({ planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 });
      // Update the ref immediately so we know we're loading for this date
      lastLoadedDateRef.current = selectedDate;
    }
    
    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from IndexedDB immediately (instant)
      const cachedBeatPlans = await offlineStorage.getAll<any>(STORES.BEAT_PLANS);
      const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
      const cachedRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
      const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);

      // Filter beat plans by user and date only
      // Don't filter by beat ownership - allow any beat that's referenced in beat_plans
      const filteredBeatPlans = cachedBeatPlans.filter(
        (plan: any) => 
          plan.user_id === userId && 
          plan.plan_date === selectedDate
      );
      const filteredVisits = cachedVisits.filter(
        (v: any) => v.user_id === userId && v.planned_date === selectedDate
      );

      // Filter orders by order_date (more reliable than created_at)
      const filteredOrders = cachedOrders.filter((o: any) => {
        // Use order_date if available, fallback to created_at
        const orderDateStr = o.order_date || (o.created_at ? o.created_at.split('T')[0] : null);
        return o.user_id === userId && o.status === 'confirmed' && orderDateStr === selectedDate;
      });
      
      console.log('📦 [CACHE] Filtered orders for date:', selectedDate, 'count:', filteredOrders.length);

      // CRITICAL: If no beat plans for this date - show empty state immediately
      // User must have planned beats to see any retailers
      if (filteredBeatPlans.length === 0) {
        console.log('📦 [CACHE] No beat plans for this date - showing empty state');
        setBeatPlans([]);
        setVisits([]);
        setRetailers([]);
        setOrders([]);
        setProgressStats({ planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 });
        hasLoadedFromCache = true;
        setIsLoading(false);
        lastLoadedDateRef.current = selectedDate;
        // Don't process anything else - no beats = no retailers to show
      } else {
        // Get retailer IDs from visits and orders
        const visitRetailerIds = filteredVisits.map((v: any) => v.retailer_id);
        const orderRetailerIds = filteredOrders.map((o: any) => o.retailer_id);

        // Extract retailer IDs from beat_data.retailer_ids if explicitly specified
        let plannedRetailerIds: string[] = [];
        let hasBeatDataWithRetailerIds = false;
        for (const beatPlan of filteredBeatPlans) {
          const beatData = (beatPlan as any).beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
            hasBeatDataWithRetailerIds = true;
            plannedRetailerIds.push(...beatData.retailer_ids);
          }
        }

        // CACHE FALLBACK: If no explicit retailer_ids in beat_data, fall back to beat_id matching
        // This ensures we show retailers even when offline/slow network and beat_data doesn't have retailer_ids
        const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
        if (!hasBeatDataWithRetailerIds && plannedBeatIds.length > 0) {
          const beatRetailers = cachedRetailers.filter((r: any) => 
            r.user_id === userId && plannedBeatIds.includes(r.beat_id)
          );
          plannedRetailerIds = beatRetailers.map((r: any) => r.id);
          console.log('📦 [CACHE] Fallback to beat_id matching:', plannedRetailerIds.length, 'retailers for', plannedBeatIds.length, 'beats');
        }
        
        // Combine all retailer IDs: from visits, explicit beat_data.retailer_ids/beat_id fallback, AND orders
        const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));
        
        // Filter retailers that are in our combined list
        const filteredRetailers = cachedRetailers.filter((r: any) => {
          return allRetailerIds.includes(r.id);
        });

        console.log('📦 [CACHE] Loaded from cache:', {
          beatPlans: filteredBeatPlans.length,
          visits: filteredVisits.length,
          retailers: filteredRetailers.length,
          orders: filteredOrders.length,
          allRetailerIds: allRetailerIds.length,
          selectedDate
        });

        // CRITICAL: Only consider cache "loaded" if we have retailers or no beats planned
        // If we have beats but no retailers in cache, let network fetch handle it
        if (filteredRetailers.length > 0 || filteredBeatPlans.length === 0) {
          // Set state from cache
          setBeatPlans(filteredBeatPlans);
          setVisits(filteredVisits);
          setRetailers(filteredRetailers);
          setOrders(filteredOrders);
          hasLoadedFromCache = true;
          setIsLoading(false);
        } else {
          // Have beat plans but no retailers in cache - wait for network
          // But still set beat plans so UI shows beat name
          console.log('📦 [CACHE] Beats found but no retailers in cache, waiting for network...');
          setBeatPlans(filteredBeatPlans);
          // Don't set hasLoadedFromCache or isLoading(false) - let network handle it
        }

        // Calculate progress stats from cached data only if we loaded data from cache
        if (hasLoadedFromCache) {
          const ordersByRetailer = new Map<string, number>();
          filteredOrders.forEach((o: any) => {
            ordersByRetailer.set(o.retailer_id, (ordersByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
          });

          let planned = 0;
          let productive = 0;
          let unproductive = 0;
          let totalOrders = filteredOrders.length;
          let totalOrderValue = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);

          // Create a set of retailer IDs that have visits
          const visitRetailerIdsSet = new Set(filteredVisits.map((v: any) => v.retailer_id));

          // Group visits by retailer and get the most recent one (handles duplicates)
          const latestVisitsByRetailer = new Map<string, any>();
          filteredVisits.forEach((visit: any) => {
            const existingVisit = latestVisitsByRetailer.get(visit.retailer_id);
            if (!existingVisit || new Date(visit.created_at) > new Date(existingVisit.created_at)) {
              latestVisitsByRetailer.set(visit.retailer_id, visit);
            }
          });

          // CRITICAL: Track retailers with orders - always productive
          const retailersWithOrders = new Set(filteredOrders.map((o: any) => o.retailer_id));
          const countedRetailers = new Set<string>();

          // Count based on the latest visit per retailer only
          latestVisitsByRetailer.forEach((visit: any) => {
            const hasOrder = retailersWithOrders.has(visit.retailer_id);
            countedRetailers.add(visit.retailer_id);
            
            // CRITICAL: If retailer has an order, they are PRODUCTIVE regardless of visit status
            if (hasOrder) {
              productive++;
            } else if (visit.status === 'unproductive') {
              unproductive++;
            } else if (visit.status === 'productive') {
              productive++;
            } else if (visit.status === 'planned') {
              planned++;
            }
          });

          // Count retailers with orders but NO visit record as productive
          retailersWithOrders.forEach((retailerId: string) => {
            if (!countedRetailers.has(retailerId)) {
              productive++;
              countedRetailers.add(retailerId);
            }
          });

          // Count retailers from plannedRetailerIds that don't have visits AND no orders yet as planned
          plannedRetailerIds.forEach((retailerId: string) => {
            if (!countedRetailers.has(retailerId)) {
              planned++;
            }
          });

          const newStats = { planned, productive, unproductive, totalOrders, totalOrderValue };
          setProgressStats(prev => progressStatsEqual(prev, newStats) ? prev : newStats);
          console.log('📊 [CACHE] Progress stats calculated from cache:', { 
            planned, 
            productive, 
            unproductive, 
            totalOrders, 
            totalOrderValue,
            selectedDate
          });
        }
      }
      
      // Update lastLoadedDateRef after cache loading
      lastLoadedDateRef.current = selectedDate;
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

  // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      console.log('🌐 [VisitsData] Device is online, fetching fresh data from network...');
      try {
        // Calculate date range for queries
        const dateStart = new Date(selectedDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(selectedDate);
        dateEnd.setHours(23, 59, 59, 999);

        // Fetch all initial data in parallel for maximum speed
        const [beatPlansResult, visitsResult, pointsResult] = await Promise.all([
          supabase
            .from('beat_plans')
            .select('*')
            .eq('user_id', userId)
            .eq('plan_date', selectedDate),
          supabase
            .from('visits')
            .select('id, retailer_id, status, no_order_reason, planned_date, user_id, check_in_time, check_out_time, created_at')
            .eq('user_id', userId)
            .eq('planned_date', selectedDate),
          supabase
            .from('gamification_points')
            .select('points, reference_id, reference_type')
            .eq('user_id', userId)
            .eq('reference_type', 'order')
            .gte('earned_at', dateStart.toISOString())
            .lte('earned_at', dateEnd.toISOString())
        ]);

        console.log('✅ [VisitsData] Network fetch successful:', {
          beatPlans: beatPlansResult.data?.length || 0,
          visits: visitsResult.data?.length || 0,
          points: pointsResult.data?.length || 0
        });

        if (beatPlansResult.error) throw beatPlansResult.error;
        if (visitsResult.error) throw visitsResult.error;
        if (pointsResult.error) throw pointsResult.error;

        const beatPlansData = beatPlansResult.data || [];
        const visitsData = visitsResult.data || [];
        const pointsRawData = pointsResult.data || [];

        // CRITICAL: If no beat plans exist for this date, show NO retailers
        // We only show retailers when there are explicit beat plans for the day
        // Orders/visits from previous days don't count - user must plan beats first
        if (beatPlansData.length === 0) {
          console.log('📋 No beat plans for this date - showing empty state');
          setBeatPlans([]);
          setVisits([]);
          setRetailers([]);
          setOrders([]);
          setProgressStats({ planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 });
          setIsLoading(false);
          isLoadingRef.current = false;
          lastLoadedDateRef.current = selectedDate;
          return;
        }

        // Get all retailer IDs we need
        const visitRetailerIds = (visitsData || []).map((v: any) => v.retailer_id);
        
        // Extract retailer IDs from beat_data.retailer_ids if specified
        // Only consider retailer_ids defined if the array has actual items
        let plannedRetailerIds: string[] = [];
        let hasBeatDataWithRetailerIdsDefined = false;
        for (const beatPlan of beatPlansData) {
          const beatData = beatPlan.beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
            hasBeatDataWithRetailerIdsDefined = true;
            plannedRetailerIds.push(...beatData.retailer_ids);
          }
        }
        
        console.log('📋 Planned retailer IDs from beat_data:', plannedRetailerIds);
        
        // If no specific retailer IDs are defined in beat_data for any plan, fall back to fetching by beat_id
        if (!hasBeatDataWithRetailerIdsDefined && beatPlansData.length > 0) {
          const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);
          if (plannedBeatIds.length > 0) {
            const { data: plannedRetailers, error: retailersError } = await supabase
              .from('retailers')
              .select('id')
              .eq('user_id', userId)
              .in('beat_id', plannedBeatIds);

            if (retailersError) {
              console.error('Error fetching planned retailers:', retailersError);
            } else {
              plannedRetailerIds = (plannedRetailers || []).map((r: any) => r.id);
              console.log('📋 Found', plannedRetailerIds.length, 'retailers for', plannedBeatIds.length, 'planned beats (fallback by beat_id)');
            }
          }
        } else if (hasBeatDataWithRetailerIdsDefined) {
          console.log('📋 Using', plannedRetailerIds.length, 'specific retailers from beat plan data');
        }

        // IMPORTANT: Also fetch orders for today to get retailer IDs from orders
        // This ensures retailers with orders show up even if not in planned beats or visits
        // Use order_date field for accurate date filtering (more reliable than created_at)
        // Fetch full order data including id for proper tracking
        const { data: ordersForToday, error: ordersPreError } = await supabase
          .from('orders')
          .select('id, retailer_id, total_amount, status, order_date, user_id, created_at')
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .eq('order_date', selectedDate);
        
        if (ordersPreError) {
          console.error('Error fetching orders for today:', ordersPreError);
        }
        
        console.log('📋 [NETWORK] Orders found for date', selectedDate, ':', ordersForToday?.length || 0, 'total value:', (ordersForToday || []).reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0));

        const orderRetailerIds = (ordersForToday || []).map((o: any) => o.retailer_id);

        // Combine all retailer IDs: from visits, planned beats, AND orders
        const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));

        let retailersData: any[] = [];
        // CRITICAL: Use ordersForToday directly as ordersData
        // This ensures orders are always counted for progress stats regardless of retailer IDs
        const ordersData: any[] = ordersForToday || [];
        
        if (allRetailerIds.length > 0) {
          // Fetch retailers only - we already have orders from ordersForToday
          const retailersResult = await supabase
            .from('retailers')
            .select('id, name, address, phone, category, parent_name, potential, user_id, beat_id, pending_amount, latitude, longitude')
            .in('id', allRetailerIds);

          if (retailersResult.error) throw retailersResult.error;
          retailersData = retailersResult.data || [];
        }
          
        console.log('📋 [NETWORK] Final orders for progress:', ordersData.length, 'with total value:', ordersData.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0));

        // OFFLINE FEATURE: Only add cached retailers when we're truly offline
        // When online and database returns empty, trust the database (no retailers for this beat)
        // Only merge offline retailers if we couldn't reach the database at all
        const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);
        
        // Don't merge cached retailers here since we successfully fetched from database
        // The database is the source of truth when online
        console.log('📋 Using database-fetched retailers only (online mode), count:', retailersData.length);

        // Process points data into efficient structure
        const totalPoints = pointsRawData.reduce((sum, item) => sum + item.points, 0);
        const retailerPointsMap = new Map<string, { name: string; points: number; visitId: string | null }>();
        
        // Create a map of retailer IDs to names for quick lookup
        const retailerNamesMap = new Map<string, string>();
        retailersData.forEach((r: any) => {
          retailerNamesMap.set(r.id, r.name);
        });
        
        visitsData.forEach((visit: any) => {
          const retailerId = visit.retailer_id;
          const retailerPoints = pointsRawData
            .filter((p: any) => p.reference_id === retailerId)
            .reduce((sum, p) => sum + p.points, 0);
          
          if (retailerPoints > 0) {
            retailerPointsMap.set(retailerId, {
              name: retailerNamesMap.get(retailerId) || 'Unknown Retailer',
              points: retailerPoints,
              visitId: visit.id
            });
          }
        });

        setPointsData({ total: totalPoints, byRetailer: retailerPointsMap });

        // Calculate progress stats immediately for instant display
        // Iterate over visits to ensure all visits are counted
        const ordersMap = new Map<string, boolean>();
        const ordersByRetailer = new Map<string, number>();
        ordersData.forEach(o => {
          ordersMap.set(o.retailer_id, true);
          ordersByRetailer.set(o.retailer_id, (ordersByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });

        let planned = 0;
        let productive = 0;
        let unproductive = 0;
        let totalOrders = ordersData.length;
        let totalOrderValue = ordersData.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

        // Create a set of retailer IDs that have visits
        const visitRetailerIdsSet = new Set(visitsData.map((v: any) => v.retailer_id));

        // Group visits by retailer and get the most recent one (handles duplicates)
        const latestVisitsByRetailer = new Map<string, any>();
        visitsData.forEach((visit: any) => {
          const existingVisit = latestVisitsByRetailer.get(visit.retailer_id);
          if (!existingVisit || new Date(visit.created_at) > new Date(existingVisit.created_at)) {
            latestVisitsByRetailer.set(visit.retailer_id, visit);
          }
        });

        // CRITICAL: Track retailers that have orders - these are ALWAYS productive
        const retailersWithOrders = new Set(ordersData.map((o: any) => o.retailer_id));
        const countedRetailers = new Set<string>();

        // Count based on the latest visit per retailer only
        latestVisitsByRetailer.forEach((visit: any) => {
          const hasOrder = retailersWithOrders.has(visit.retailer_id);
          countedRetailers.add(visit.retailer_id);
          
          // CRITICAL: If retailer has an order, they are PRODUCTIVE regardless of visit status
          if (hasOrder) {
            productive++;
          } else if (visit.status === 'unproductive') {
            unproductive++;
          } else if (visit.status === 'productive') {
            productive++;
          } else if (visit.status === 'planned') {
            planned++;
          }
        });

        // CRITICAL: Count retailers with orders but NO visit record as productive
        // This ensures orders placed directly (without visit) are still counted
        retailersWithOrders.forEach((retailerId: string) => {
          if (!countedRetailers.has(retailerId)) {
            productive++;
            countedRetailers.add(retailerId);
          }
        });

        // Count retailers from beat plans that don't have visit records AND no orders yet as planned
        plannedRetailerIds.forEach((retailerId: string) => {
          if (!countedRetailers.has(retailerId)) {
            planned++;
          }
        });

        const newStats = { planned, productive, unproductive, totalOrders, totalOrderValue };
        // SMART UPDATE: Only update progress stats if they actually changed
        setProgressStats(prev => progressStatsEqual(prev, newStats) ? prev : newStats);
        console.log('📊 [NETWORK] Progress stats calculated from network:', { 
          planned, 
          productive, 
          unproductive, 
          totalOrders, 
          totalOrderValue,
          selectedDate,
          visitsCount: visitsData.length,
          ordersCount: ordersData.length,
          timestamp: new Date().toISOString()
        });

        // Cache current date data for offline access (background - don't block)
        Promise.all([
          ...beatPlansData.map(plan => offlineStorage.save(STORES.BEAT_PLANS, plan)),
          ...visitsData.map(visit => offlineStorage.save(STORES.VISITS, visit)),
          ...retailersData.map(retailer => offlineStorage.save(STORES.RETAILERS, retailer)),
          ...ordersData.map(order => offlineStorage.save(STORES.ORDERS, order))
        ]).then(() => {
          console.log('💾 [CACHE] Saved to offline storage:', {
            beatPlans: beatPlansData.length,
            visits: visitsData.length,
            retailers: retailersData.length,
            orders: ordersData.length
          });
        }).catch(console.error);

        // DIRECT UPDATE: Always set state directly for network data
        // This ensures fresh data always replaces cached data
        console.log('📡 [NETWORK] Setting retailers from network:', retailersData.length, 'for date:', selectedDate);
        setBeatPlans(beatPlansData);
        setVisits(visitsData);
        setRetailers(retailersData);
        setOrders(ordersData);
        
        console.log('🔄 [NETWORK] State updated with fresh data (if changed):', {
          beatPlans: beatPlansData.length,
          visits: visitsData.length,
          retailers: retailersData.length,
          orders: ordersData.length,
          selectedDate
        });
        
        if (!hasLoadedFromCache) {
          setIsLoading(false);
        }
        
        setError(null);
        console.log('🔄 Updated with fresh data from network');
      } catch (networkError) {
        console.log('Network sync failed, using cached data:', networkError);
        // CRITICAL: If network fails and we haven't loaded from cache, 
        // try to use cached data now as fallback
        if (!hasLoadedFromCache) {
          try {
            const cachedRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
            const cachedBeatPlans = await offlineStorage.getAll<any>(STORES.BEAT_PLANS);
            const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
            const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
            
            const filteredBeatPlans = cachedBeatPlans.filter(
              (plan: any) => plan.user_id === userId && plan.plan_date === selectedDate
            );
            
            if (filteredBeatPlans.length > 0) {
              const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
              const filteredRetailers = cachedRetailers.filter((r: any) => 
                r.user_id === userId && plannedBeatIds.includes(r.beat_id)
              );
              const filteredOrders = cachedOrders.filter((o: any) => 
                o.user_id === userId && o.status === 'confirmed' && o.order_date === selectedDate
              );
              const filteredVisits = cachedVisits.filter((v: any) => 
                v.user_id === userId && v.planned_date === selectedDate
              );
              
              console.log('📴 [OFFLINE FALLBACK] Using cached data after network failure:', {
                beatPlans: filteredBeatPlans.length,
                retailers: filteredRetailers.length,
                orders: filteredOrders.length,
                visits: filteredVisits.length
              });
              
              setBeatPlans(filteredBeatPlans);
              setRetailers(filteredRetailers);
              setOrders(filteredOrders);
              setVisits(filteredVisits);
              
              // Calculate progress stats
              const retailersWithOrders = new Set(filteredOrders.map((o: any) => o.retailer_id));
              let planned = 0, productive = 0, unproductive = 0;
              const countedRetailers = new Set<string>();
              
              filteredVisits.forEach((visit: any) => {
                const hasOrder = retailersWithOrders.has(visit.retailer_id);
                countedRetailers.add(visit.retailer_id);
                if (hasOrder) {
                  productive++;
                } else if (visit.status === 'unproductive') {
                  unproductive++;
                } else if (visit.status === 'productive') {
                  productive++;
                } else {
                  planned++;
                }
              });
              
              retailersWithOrders.forEach((rid: string) => {
                if (!countedRetailers.has(rid)) {
                  productive++;
                  countedRetailers.add(rid);
                }
              });
              
              filteredRetailers.forEach((r: any) => {
                if (!countedRetailers.has(r.id)) {
                  planned++;
                }
              });
              
              setProgressStats({
                planned,
                productive,
                unproductive,
                totalOrders: filteredOrders.length,
                totalOrderValue: filteredOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
              });
            }
          } catch (cacheErr) {
            console.error('Cache fallback failed:', cacheErr);
          }
          setError(networkError);
          setIsLoading(false);
        }
      }
    } else {
      // Offline mode - use cached data
      console.log('📴 [OFFLINE] Device is offline, using cached data');
      // Data was already loaded from cache in Step 1, just ensure loading is done
      if (!hasLoadedFromCache) {
        setIsLoading(false);
      }
    }
    
    isLoadingRef.current = false;
  }, [userId, selectedDate]);

  useEffect(() => {
    console.log('🔄 useVisitsDataOptimized: Setting up data loading for date:', selectedDate);
    
    // DON'T clear data when date changes - let smart update handle it
    // This prevents the flash/flicker when navigating between dates
    // The loadData function will update only if data is different
    
    // Load new data
    loadData();

    // REMOVED: visitDataChanged event listener disabled to prevent UI flickering
    // Data is loaded once on mount/date change, updated only when user navigates back
    
    // Listen for online/offline changes to refresh data
    const handleOnline = () => {
      console.log('🌐 Connection restored! Refreshing data to pick up synced changes...');
      setTimeout(() => {
        loadData();
      }, 2000); // Give sync a moment to complete
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadData, selectedDate]);

  const invalidateData = useCallback(() => {
    // Background refresh - don't show loading spinner
    loadData(true);
  }, [loadData]);

  return {
    beatPlans,
    visits,
    retailers,
    orders,
    pointsData,
    progressStats,
    isLoading,
    error,
    invalidateData,
  };
};
