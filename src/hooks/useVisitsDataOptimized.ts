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
  const pendingDateRef = useRef<string | null>(null);
  // Cache for date-based data to enable instant switching
  const dateDataCacheRef = useRef<Map<string, { beatPlans: any[], visits: any[], retailers: any[], orders: any[], progressStats: ProgressStats, timestamp: number }>>(new Map());

  // Helper to check if date is in the past (before today)
  const isOldDate = useCallback((dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }, []);

  // Helper to check if date is today
  const isToday = useCallback((dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  }, []);

  // CACHE-FIRST LOADING: Load from cache immediately, sync in background
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!userId || !selectedDate) return;
    
    // Prevent concurrent loads - but track pending date
    if (isLoadingRef.current && !forceRefresh) {
      console.log('⏳ [VisitsData] Queueing load for date:', selectedDate);
      pendingDateRef.current = selectedDate;
      return;
    }
    
    isLoadingRef.current = true;
    pendingDateRef.current = null;
    
    // Check if this is a different date
    const isSameDate = lastLoadedDateRef.current === selectedDate;
    const isDateChange = !isSameDate;
    
    // FAST PATH: Check in-memory cache first for instant date switching
    const cachedDateData = dateDataCacheRef.current.get(selectedDate);
    if (cachedDateData && !forceRefresh) {
      console.log('⚡ [FAST] Loading from in-memory cache for date:', selectedDate);
      setBeatPlans(cachedDateData.beatPlans);
      setVisits(cachedDateData.visits);
      setRetailers(cachedDateData.retailers);
      setOrders(cachedDateData.orders);
      // CRITICAL: Always set progressStats from cache for immediate display
      setProgressStats(cachedDateData.progressStats);
      setIsLoading(false);
      lastLoadedDateRef.current = selectedDate;
      
      // For old dates, skip network entirely - data won't change
      if (isOldDate(selectedDate)) {
        console.log('📅 [OLD DATE] Skipping network fetch - using cached data only');
        isLoadingRef.current = false;
        return;
      }
      
      // For today OR future dates, ALWAYS check network for updates when online
      if (navigator.onLine) {
        console.log('📅 [TODAY/FUTURE] Will check network for real-time updates');
        // Continue to network fetch below, but UI is already showing cached data
      } else {
        console.log('📴 [OFFLINE] Using cached data only');
        isLoadingRef.current = false;
        return;
      }
    } else if (isDateChange) {
      setIsLoading(true);
      console.log('📅 [VisitsData] Date changed from', lastLoadedDateRef.current, 'to', selectedDate);
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
        
        // CRITICAL: Filter retailers that are in our combined list AND belong to this user
        // This prevents showing retailers from other users' cached data
        const filteredRetailers = cachedRetailers.filter((r: any) => {
          return r.user_id === userId && allRetailerIds.includes(r.id);
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
          // CRITICAL FIX: Calculate progress stats BEFORE setting state
          // This ensures progressStats is calculated synchronously and set together with other data
          let planned = 0;
          let productive = 0;
          let unproductive = 0;
          let totalOrders = filteredOrders.length;
          let totalOrderValue = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);

          // Track retailers with orders - always productive
          const retailersWithOrders = new Set(filteredOrders.map((o: any) => o.retailer_id));
          const countedRetailers = new Set<string>();

          // Group visits by retailer and get the most recent one (handles duplicates)
          const latestVisitsByRetailer = new Map<string, any>();
          filteredVisits.forEach((visit: any) => {
            const existingVisit = latestVisitsByRetailer.get(visit.retailer_id);
            if (!existingVisit || new Date(visit.created_at) > new Date(existingVisit.created_at)) {
              latestVisitsByRetailer.set(visit.retailer_id, visit);
            }
          });

          // Count based on the latest visit per retailer only
          latestVisitsByRetailer.forEach((visit: any) => {
            const hasOrder = retailersWithOrders.has(visit.retailer_id);
            countedRetailers.add(visit.retailer_id);
            
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

          // Count retailers without visits AND without orders as planned
          filteredRetailers.forEach((retailer: any) => {
            if (!countedRetailers.has(retailer.id)) {
              planned++;
              countedRetailers.add(retailer.id);
            }
          });

          const cacheStats = { planned, productive, unproductive, totalOrders, totalOrderValue };
          
          console.log('📊 [CACHE] Progress stats calculated BEFORE state update:', cacheStats);

          // CRITICAL: Set ALL state together in one batch to avoid partial renders
          setBeatPlans(filteredBeatPlans);
          setVisits(filteredVisits);
          setRetailers(filteredRetailers);
          setOrders(filteredOrders);
          setProgressStats(cacheStats); // Set progressStats in same batch!
          
          hasLoadedFromCache = true;
          setIsLoading(false);
          
          // SAVE TO IN-MEMORY CACHE for instant date switching
          dateDataCacheRef.current.set(selectedDate, {
            beatPlans: filteredBeatPlans,
            visits: filteredVisits,
            retailers: filteredRetailers,
            orders: filteredOrders,
            progressStats: cacheStats,
            timestamp: Date.now()
          });
          
          console.log('📊 [CACHE] Cache loaded with stats:', { 
            planned, 
            productive, 
            unproductive, 
            totalOrders, 
            totalOrderValue,
            selectedDate,
            visitsCount: filteredVisits.length,
            retailersCount: filteredRetailers.length
          });
        } else {
          // Have beat plans but no retailers in cache - wait for network
          // But still set beat plans so UI shows beat name
          console.log('📦 [CACHE] Beats found but no retailers in cache, waiting for network...');
          setBeatPlans(filteredBeatPlans);
          // Don't set hasLoadedFromCache or isLoading(false) - let network handle it
        }
      }
      
      // Update lastLoadedDateRef after cache loading
      lastLoadedDateRef.current = selectedDate;
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

    // SMART NETWORK STRATEGY:
    // - Old dates (before today): Skip network fetch entirely - data won't change
    // - Today: Always fetch fresh data when online
    // - Future dates: Fetch to check for beat plan updates
    const shouldSkipNetwork = isOldDate(selectedDate) && hasLoadedFromCache;
    
    if (shouldSkipNetwork) {
      console.log('📅 [OLD DATE] Skipping network fetch - historical data is immutable');
      setIsLoading(false);
      isLoadingRef.current = false;
      return;
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
        console.log('🔍 [DEBUG] hasBeatDataWithRetailerIdsDefined:', hasBeatDataWithRetailerIdsDefined, 'beatPlansData.length:', beatPlansData.length);
        
        if (!hasBeatDataWithRetailerIdsDefined && beatPlansData.length > 0) {
          const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);
          console.log('🔍 [DEBUG] Fallback - plannedBeatIds:', plannedBeatIds);
          
          if (plannedBeatIds.length > 0) {
            const { data: plannedRetailers, error: retailersError } = await supabase
              .from('retailers')
              .select('id')
              .eq('user_id', userId)
              .in('beat_id', plannedBeatIds);

            console.log('🔍 [DEBUG] Fallback query result:', { 
              error: retailersError, 
              count: plannedRetailers?.length,
              userId,
              plannedBeatIds 
            });

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
        console.log('🔍 [DEBUG] allRetailerIds:', {
          fromVisits: visitRetailerIds.length,
          fromPlannedBeats: plannedRetailerIds.length,
          fromOrders: orderRetailerIds.length,
          total: allRetailerIds.length
        });

        let retailersData: any[] = [];
        // CRITICAL: Use ordersForToday directly as ordersData
        // This ensures orders are always counted for progress stats regardless of retailer IDs
        const ordersData: any[] = ordersForToday || [];
        
        if (allRetailerIds.length > 0) {
          // Fetch retailers only - we already have orders from ordersForToday
          // CRITICAL: Filter by user_id to ensure user-wise data visibility
          const retailersResult = await supabase
            .from('retailers')
            .select('id, name, address, phone, category, parent_name, potential, user_id, beat_id, pending_amount, latitude, longitude')
            .eq('user_id', userId)
            .in('id', allRetailerIds);

          console.log('🔍 [DEBUG] Retailers query result:', {
            error: retailersResult.error,
            count: retailersResult.data?.length,
            allRetailerIdsCount: allRetailerIds.length
          });

          if (retailersResult.error) throw retailersResult.error;
          retailersData = retailersResult.data || [];
        } else {
          console.log('⚠️ [DEBUG] No retailer IDs to fetch!');
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

        // CRITICAL: Track retailers that have orders - these are ALWAYS productive
        const retailersWithOrders = new Set(ordersData.map((o: any) => o.retailer_id));
        const countedRetailers = new Set<string>();

        // Group visits by retailer and get the most recent one (handles duplicates)
        const latestVisitsByRetailer = new Map<string, any>();
        visitsData.forEach((visit: any) => {
          const existingVisit = latestVisitsByRetailer.get(visit.retailer_id);
          if (!existingVisit || new Date(visit.created_at) > new Date(existingVisit.created_at)) {
            latestVisitsByRetailer.set(visit.retailer_id, visit);
          }
        });

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

        // Count retailers from beat plans/retailersData that don't have visit records AND no orders yet as planned
        // Use retailersData instead of plannedRetailerIds to ensure we count all displayed retailers
        retailersData.forEach((retailer: any) => {
          if (!countedRetailers.has(retailer.id)) {
            planned++;
            countedRetailers.add(retailer.id);
          }
        });
        
        console.log('📊 [NETWORK] Progress calculation details:', {
          visitsCount: visitsData.length,
          latestVisitsCount: latestVisitsByRetailer.size,
          retailersWithOrdersCount: retailersWithOrders.size,
          retailersDataCount: retailersData.length,
          countedRetailersCount: countedRetailers.size
        });

        const newStats = { planned, productive, unproductive, totalOrders, totalOrderValue };
        // CRITICAL: Don't set progressStats here - will be set together with other state below
        // This prevents React batching issues where progressStats is set separately
        console.log('📊 [NETWORK] Progress stats calculated (will set with state batch):', { 
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

        // SAVE TO IN-MEMORY CACHE for instant date switching
        dateDataCacheRef.current.set(selectedDate, {
          beatPlans: beatPlansData,
          visits: visitsData,
          retailers: retailersData.length > 0 ? retailersData : retailers, // Keep existing if empty
          orders: ordersData,
          progressStats: newStats,
          timestamp: Date.now()
        });
        console.log('⚡ [FAST CACHE] Saved to in-memory cache for date:', selectedDate);

        // DIRECT UPDATE: Set state from network data
        // Only update retailers if we got data from network, otherwise keep cache data
        console.log('📡 [NETWORK] Setting data from network:', {
          beatPlans: beatPlansData.length,
          retailers: retailersData.length,
          visits: visitsData.length,
          orders: ordersData.length,
          selectedDate
        });
        
        // CRITICAL: Update all state together to ensure useEffect recalculates with consistent data
        setBeatPlans(beatPlansData);
        setVisits(visitsData);
        setOrders(ordersData);
        
        // CRITICAL FIX: Only overwrite retailers if network returned data
        // Otherwise keep the cached retailers to prevent blank display
        const finalRetailers = retailersData.length > 0 ? retailersData : (hasLoadedFromCache ? retailers : []);
        setRetailers(finalRetailers);
        
        // CRITICAL: Also update progressStats directly here to ensure it's in sync with network data
        // The useEffect may not trigger if data hasn't changed shape
        setProgressStats(newStats);
        
        setIsLoading(false);
        setError(null);
        console.log('🔄 Updated with fresh data from network, progressStats:', newStats);
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
              
              // Group visits by retailer and get the most recent one (handles duplicates)
              const latestVisitsByRetailer = new Map<string, any>();
              filteredVisits.forEach((visit: any) => {
                const existingVisit = latestVisitsByRetailer.get(visit.retailer_id);
                if (!existingVisit || new Date(visit.created_at) > new Date(existingVisit.created_at)) {
                  latestVisitsByRetailer.set(visit.retailer_id, visit);
                }
              });
              
              // Count based on latest visit per retailer
              latestVisitsByRetailer.forEach((visit: any) => {
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
    
    // Check if there's a pending date to load (user changed dates while loading)
    if (pendingDateRef.current && pendingDateRef.current !== selectedDate) {
      console.log('📅 [VisitsData] Loading pending date:', pendingDateRef.current);
      const pendingDate = pendingDateRef.current;
      pendingDateRef.current = null;
      // Use setTimeout to allow current call stack to complete
      setTimeout(() => loadData(true), 0);
    }
  }, [userId, selectedDate, isOldDate, retailers]);

  // Auto-recalculate progress stats when orders/visits/retailers change
  // This ensures UI always reflects current state data
  useEffect(() => {
    if (!userId) return;
    
    // CRITICAL FIX: Always recalculate when we have data loaded
    // The previous check was too restrictive and skipped recalculation
    console.log('📊 [ProgressStats] Recalculating from state:', {
      orders: orders.length,
      visits: visits.length,
      retailers: retailers.length,
      beatPlans: beatPlans.length
    });

    let planned = 0;
    let productive = 0;
    let unproductive = 0;
    const totalOrders = orders.length;
    const totalOrderValue = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    // Group visits by retailer and get the most recent one (handles duplicates)
    const latestVisitsByRetailer = new Map<string, any>();
    visits.forEach((visit: any) => {
      const existingVisit = latestVisitsByRetailer.get(visit.retailer_id);
      if (!existingVisit || new Date(visit.created_at) > new Date(existingVisit.created_at)) {
        latestVisitsByRetailer.set(visit.retailer_id, visit);
      }
    });

    // Track retailers that have orders - these are ALWAYS productive
    const retailersWithOrders = new Set(orders.map((o: any) => o.retailer_id).filter(Boolean));
    const countedRetailers = new Set<string>();

    // Count based on the latest visit per retailer only
    latestVisitsByRetailer.forEach((visit: any) => {
      const hasOrder = retailersWithOrders.has(visit.retailer_id);
      countedRetailers.add(visit.retailer_id);
      
      // If retailer has an order, they are PRODUCTIVE regardless of visit status
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

    // Count retailers from beat plans that don't have visit records AND no orders yet as planned
    retailers.forEach((retailer: any) => {
      if (!countedRetailers.has(retailer.id)) {
        planned++;
      }
    });

    const newStats = { planned, productive, unproductive, totalOrders, totalOrderValue };
    console.log('📊 [ProgressStats] Calculated:', newStats);
    
    // CRITICAL: Always update if values differ - remove equality check that may cause stale data
    setProgressStats(newStats);
  }, [userId, orders, visits, retailers, beatPlans]);

  useEffect(() => {
    console.log('🔄 useVisitsDataOptimized: Setting up for date:', selectedDate);
    
    // DON'T clear data when date changes - let smart update handle it
    // This prevents the flash/flicker when navigating between dates
    // The loadData function will update only if data is different
    
    // Load new data
    if (selectedDate) {
      loadData();
    }

    // Listen for visitStatusChanged events to recalculate progress stats
    const handleStatusChange = (event: any) => {
      console.log('🔔 [useVisitsDataOptimized] visitStatusChanged event received:', event.detail);
      // Trigger a recalculation and data refresh
      setTimeout(() => {
        loadData(true);
      }, 500); // Small delay to allow database updates to complete
    };

    // Listen for visitDataChanged events (e.g., new beat plans added)
    const handleDataChange = () => {
      console.log('🔔 [useVisitsDataOptimized] visitDataChanged event received');
      loadData(true);
    };
    
    // Listen for online/offline changes to refresh data
    const handleOnline = () => {
      console.log('🌐 Connection restored! Refreshing data to pick up synced changes...');
      setTimeout(() => {
        loadData(true);
      }, 2000); // Give sync a moment to complete
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('visitStatusChanged', handleStatusChange);
    window.addEventListener('visitDataChanged', handleDataChange);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('visitStatusChanged', handleStatusChange);
      window.removeEventListener('visitDataChanged', handleDataChange);
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
