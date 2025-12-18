import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { loadMyVisitsSnapshot, saveMyVisitsSnapshot, cleanupOldSnapshots } from '@/lib/myVisitsSnapshot';

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
  const [isLoading, setIsLoading] = useState(false); // Start with false - don't block UI on mount
  const [error, setError] = useState<any>(null);
  // Track data version to trigger single recalculation when all state is ready
  const [dataVersion, setDataVersion] = useState(0);
  
  // Track last loaded date to avoid clearing data unnecessarily
  const lastLoadedDateRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const pendingDateRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Debounce ref to prevent multiple rapid reloads from events
  const lastLoadTimeRef = useRef<number>(0);
  const pendingLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Cache for date-based data to enable instant switching
  const dateDataCacheRef = useRef<Map<string, { beatPlans: any[], visits: any[], retailers: any[], orders: any[], progressStats: ProgressStats, timestamp: number }>>(new Map());
  
  // Track newly added retailer IDs to put them at the top of the list
  // CRITICAL: Initialize from sessionStorage so it persists across navigation
  const getInitialNewRetailerIds = (): Set<string> => {
    try {
      const stored = sessionStorage.getItem('newlyAddedRetailerIds');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only keep IDs from last 30 minutes
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        const validIds = parsed.filter((item: { id: string; timestamp: number }) => item.timestamp > thirtyMinutesAgo);
        if (validIds.length !== parsed.length) {
          sessionStorage.setItem('newlyAddedRetailerIds', JSON.stringify(validIds));
        }
        return new Set(validIds.map((item: { id: string }) => item.id));
      }
    } catch (e) {
      console.error('Failed to load newlyAddedRetailerIds from sessionStorage:', e);
    }
    return new Set<string>();
  };
  
  const newlyAddedRetailerIdsRef = useRef<Set<string>>(getInitialNewRetailerIds());
  
  // Helper to persist new retailer ID to sessionStorage
  const persistNewRetailerId = (retailerId: string) => {
    try {
      const stored = sessionStorage.getItem('newlyAddedRetailerIds');
      const existing = stored ? JSON.parse(stored) : [];
      // Add new ID with timestamp
      existing.push({ id: retailerId, timestamp: Date.now() });
      sessionStorage.setItem('newlyAddedRetailerIds', JSON.stringify(existing));
      newlyAddedRetailerIdsRef.current.add(retailerId);
      console.log('📌 [PERSIST] Saved new retailer ID to sessionStorage:', retailerId);
    } catch (e) {
      console.error('Failed to persist newlyAddedRetailerId:', e);
    }
  };

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

  // Background network sync - fires and forgets, updates cache and state only if data changed
  const backgroundNetworkSync = useCallback(async (syncUserId: string, syncDate: string) => {
    if (!navigator.onLine) return;
    
    console.log('🔄 [BG-SYNC] Background network sync starting for:', syncDate);
    
    try {
      const dateStart = new Date(syncDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(syncDate);
      dateEnd.setHours(23, 59, 59, 999);

      const [beatPlansResult, visitsResult, ordersResult, pointsResult] = await Promise.all([
        supabase
          .from('beat_plans')
          .select('*')
          .eq('user_id', syncUserId)
          .eq('plan_date', syncDate),
        supabase
          .from('visits')
          .select('id, retailer_id, status, no_order_reason, planned_date, user_id, check_in_time, check_out_time, created_at')
          .eq('user_id', syncUserId)
          .eq('planned_date', syncDate),
        supabase
          .from('orders')
          .select('id, retailer_id, total_amount, status, order_date, user_id, created_at')
          .eq('user_id', syncUserId)
          .eq('status', 'confirmed')
          .eq('order_date', syncDate),
        supabase
          .from('gamification_points')
          .select('points, reference_id, reference_type, metadata')
          .eq('user_id', syncUserId)
          .gte('earned_at', dateStart.toISOString())
          .lte('earned_at', dateEnd.toISOString())
      ]);

      if (beatPlansResult.error || visitsResult.error || ordersResult.error || pointsResult.error) {
        console.log('🔄 [BG-SYNC] Network error, skipping update');
        return;
      }

      const beatPlansData = beatPlansResult.data || [];
      const visitsData = visitsResult.data || [];
      const ordersData = ordersResult.data || [];
      const pointsRawData = pointsResult.data || [];

      // Get all retailer IDs needed
      const visitRetailerIds = visitsData.map((v: any) => v.retailer_id);
      const orderRetailerIds = ordersData.map((o: any) => o.retailer_id);
      
      let explicitRetailerIds: string[] = [];
      for (const beatPlan of beatPlansData) {
        const beatData = beatPlan.beat_data as any;
        if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }
      
      const plannedBeatIds = beatPlansData.map((bp: any) => bp.beat_id);
      let beatRetailerIds: string[] = [];
      
      if (plannedBeatIds.length > 0) {
        const { data: beatRetailers } = await supabase
          .from('retailers')
          .select('id')
          .eq('user_id', syncUserId)
          .in('beat_id', plannedBeatIds);
        beatRetailerIds = (beatRetailers || []).map((r: any) => r.id);
      }
      
      const plannedRetailerIds = Array.from(new Set([...explicitRetailerIds, ...beatRetailerIds]));
      const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));
      
      let retailersData: any[] = [];
      if (allRetailerIds.length > 0) {
        const { data: retailers } = await supabase
          .from('retailers')
          .select('id, name, address, phone, category, parent_name, potential, user_id, beat_id, pending_amount, latitude, longitude, created_at')
          .eq('user_id', syncUserId)
          .in('id', allRetailerIds);
        retailersData = retailers || [];
      }

      // Calculate progress stats
      // CRITICAL: Handle duplicate visit rows safely.
      // Rule: Orders always win (productive) → else any productive visit → else any no-order/unproductive → else planned.
      const retailersWithOrders = new Set(ordersData.map((o: any) => o.retailer_id));
      let planned = 0, productive = 0, unproductive = 0;
      const countedRetailers = new Set<string>();

      const visitsByRetailer = new Map<string, any[]>();
      for (const v of visitsData) {
        if (!v?.retailer_id) continue;
        const list = visitsByRetailer.get(v.retailer_id) || [];
        list.push(v);
        visitsByRetailer.set(v.retailer_id, list);
      }

      visitsByRetailer.forEach((group, retailerId) => {
        const hasOrder = retailersWithOrders.has(retailerId);
        countedRetailers.add(retailerId);

        if (hasOrder) productive++;
        else if (group.some(v => v.status === 'productive')) productive++;
        else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) unproductive++;
        else planned++;
      });
      
      retailersWithOrders.forEach((rid: string) => {
        if (!countedRetailers.has(rid)) {
          productive++;
          countedRetailers.add(rid);
        }
      });
      
      retailersData.forEach((r: any) => {
        if (!countedRetailers.has(r.id)) planned++;
      });

      const newStats = { 
        planned, 
        productive, 
        unproductive, 
        totalOrders: ordersData.length, 
        totalOrderValue: ordersData.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) 
      };

      // Only update caches/state if something actually changed.
      // This prevents "loading"/flicker on slow networks when the data is identical.
      const existing = dateDataCacheRef.current.get(syncDate);
      const hasChanges =
        !existing ||
        !arraysEqual(existing.beatPlans || [], beatPlansData) ||
        !arraysEqual(existing.visits || [], visitsData) ||
        !arraysEqual(existing.retailers || [], retailersData) ||
        !arraysEqual(existing.orders || [], ordersData) ||
        !progressStatsEqual(existing.progressStats || { planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 }, newStats);

      if (!hasChanges) {
        console.log('✅ [BG-SYNC] No changes detected, skipping update for:', syncDate);
        return;
      }

      // Update in-memory cache
      dateDataCacheRef.current.set(syncDate, {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        progressStats: newStats,
        timestamp: Date.now()
      });

      // Update persistent snapshot too (so app restart / offline shows latest)
      const beatNames = beatPlansData.map((p: any) => p.beat_name).join(', ') || 'No beats planned';
      saveMyVisitsSnapshot(syncUserId, syncDate, {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        progressStats: newStats,
        currentBeatName: beatNames
      }).catch(() => undefined);

      // Update offline storage in background
      Promise.all([
        ...beatPlansData.map(plan => offlineStorage.save(STORES.BEAT_PLANS, plan)),
        ...visitsData.map(visit => offlineStorage.save(STORES.VISITS, visit)),
        ...retailersData.map(retailer => offlineStorage.save(STORES.RETAILERS, retailer)),
        ...ordersData.map(order => offlineStorage.save(STORES.ORDERS, order))
      ]).catch(console.error);

      // Only update React state if this is still the current date being viewed
      // This prevents stale updates from overwriting newer data
      if (lastLoadedDateRef.current === syncDate) {
        // Calculate points data for state update
        const totalPoints = pointsRawData.reduce((sum: number, item: any) => sum + item.points, 0);
        const retailerPointsMap = new Map<string, { name: string; points: number; visitId: string | null }>();
        const retailerNamesMap = new Map<string, string>();
        retailersData.forEach((r: any) => retailerNamesMap.set(r.id, r.name));
        visitsData.forEach((visit: any) => {
          const retailerId = visit.retailer_id;
          const retailerPoints = pointsRawData
            .filter((p: any) => p.reference_id === retailerId)
            .reduce((sum: number, p: any) => sum + p.points, 0);
          if (retailerPoints > 0) {
            retailerPointsMap.set(retailerId, {
              name: retailerNamesMap.get(retailerId) || 'Unknown Retailer',
              points: retailerPoints,
              visitId: visit.id
            });
          }
        });
        
        console.log('🔄 [BG-SYNC] Updating state with fresh data, points:', totalPoints);
        setBeatPlans(beatPlansData);
        setVisits(visitsData);
        setOrders(ordersData);
        if (retailersData.length > 0) setRetailers(retailersData);
        setProgressStats(newStats);
        setPointsData({ total: totalPoints, byRetailer: retailerPointsMap });
      }
      
      console.log('✅ [BG-SYNC] Background sync complete for:', syncDate);
    } catch (error) {
      console.log('🔄 [BG-SYNC] Background sync failed (silent):', error);
    }
  }, []);

  // CACHE-FIRST LOADING: Load from cache immediately, sync in background
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!userId || !selectedDate) {
      setIsLoading(false);
      return;
    }
    
    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // SAFETY: Set a timeout to prevent stuck loading state (5 second max)
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ [VisitsData] Loading timeout - forcing loading to complete');
      setIsLoading(false);
      isLoadingRef.current = false;
    }, 5000);
    
    // CRITICAL FIX: Always allow date changes to proceed
    // Only block concurrent loads for the SAME date
    if (isLoadingRef.current && !forceRefresh && pendingDateRef.current === selectedDate) {
      console.log('⏳ [VisitsData] Already loading this date:', selectedDate);
      return;
    }
    
    // If a different date is requested while loading, queue it and continue
    if (isLoadingRef.current && pendingDateRef.current !== selectedDate) {
      console.log('⏳ [VisitsData] Queueing new date while loading:', selectedDate);
      pendingDateRef.current = selectedDate;
      // Don't return - let it proceed to handle date change
    }
    
    isLoadingRef.current = true;
    pendingDateRef.current = selectedDate;
    
    // Check if this is a different date
    const isSameDate = lastLoadedDateRef.current === selectedDate;
    const isDateChange = !isSameDate;

    // OFFLINE CACHE MERGE: When we go offline, the in-memory snapshot can be stale.
    // Merge in any newly cached retailers that belong to today's planned beats.
    const mergePlannedBeatRetailersFromOfflineCache = async (existingRetailers: any[]) => {
      try {
        const [cachedBeatPlans, cachedRetailers] = await Promise.all([
          offlineStorage.getAll<any>(STORES.BEAT_PLANS),
          offlineStorage.getAll<any>(STORES.RETAILERS)
        ]);

        const plannedBeatIds = (cachedBeatPlans || [])
          .filter((bp: any) => bp.user_id === userId && bp.plan_date === selectedDate)
          .map((bp: any) => bp.beat_id);

        if (plannedBeatIds.length === 0) return existingRetailers;

        const plannedBeatRetailers = (cachedRetailers || []).filter((r: any) => {
          return r.user_id === userId && plannedBeatIds.includes(r.beat_id);
        });

        if (plannedBeatRetailers.length === 0) return existingRetailers;

        const existingIds = new Set((existingRetailers || []).map((r: any) => r.id));
        const newOnes = plannedBeatRetailers.filter((r: any) => !existingIds.has(r.id));

        if (newOnes.length === 0) return existingRetailers;

        console.log('📦 [OFFLINE-MERGE] Adding newly cached planned-beat retailers:', newOnes.length);
        return [...newOnes, ...(existingRetailers || [])];
      } catch (e) {
        console.log('📦 [OFFLINE-MERGE] Failed to merge retailers (non-critical):', e);
        return existingRetailers;
      }
    };

    // OFFLINE VISITS MERGE: Merge visits from offline storage to get updated statuses (e.g., no-order marked offline)
    const mergeOfflineVisitsWithCached = async (existingVisits: any[]) => {
      try {
        const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
        
        // Filter visits for current user and date
        const relevantCachedVisits = (cachedVisits || []).filter((v: any) => 
          v.user_id === userId && v.planned_date === selectedDate
        );
        
        if (relevantCachedVisits.length === 0) return existingVisits;
        
        // Create a map of retailer_id -> latest cached visit (prefer most recently updated)
        const cachedVisitsByRetailer = new Map<string, any>();
        relevantCachedVisits.forEach((v: any) => {
          const existingCached = cachedVisitsByRetailer.get(v.retailer_id);
          if (!existingCached || new Date(v.updated_at || v.created_at) > new Date(existingCached.updated_at || existingCached.created_at)) {
            cachedVisitsByRetailer.set(v.retailer_id, v);
          }
        });
        
        // Merge: update existing visits with offline cached status, add new ones
        const existingByRetailer = new Map<string, any>();
        (existingVisits || []).forEach(v => existingByRetailer.set(v.retailer_id, v));
        
        const mergedVisits: any[] = [];
        const processedRetailers = new Set<string>();
        
        // First, update existing visits with newer offline status
        (existingVisits || []).forEach(existingVisit => {
          const cachedVisit = cachedVisitsByRetailer.get(existingVisit.retailer_id);
          if (cachedVisit) {
            // If cached visit has a more recent update OR has a final status (unproductive/productive), use it
            const cachedTime = new Date(cachedVisit.updated_at || cachedVisit.created_at).getTime();
            const existingTime = new Date(existingVisit.updated_at || existingVisit.created_at).getTime();
            const cachedHasFinalStatus = cachedVisit.status === 'unproductive' || cachedVisit.status === 'productive';
            
            if (cachedHasFinalStatus || cachedTime > existingTime) {
              console.log('📝 [OFFLINE-MERGE] Updating visit status from cache:', existingVisit.retailer_id, existingVisit.status, '->', cachedVisit.status);
              mergedVisits.push({
                ...existingVisit,
                ...cachedVisit,
                id: existingVisit.id.startsWith('offline_') ? cachedVisit.id : existingVisit.id // Prefer non-offline ID
              });
            } else {
              mergedVisits.push(existingVisit);
            }
          } else {
            mergedVisits.push(existingVisit);
          }
          processedRetailers.add(existingVisit.retailer_id);
        });
        
        // Add visits that exist only in cache (new offline visits)
        cachedVisitsByRetailer.forEach((cachedVisit, retailerId) => {
          if (!processedRetailers.has(retailerId)) {
            console.log('📝 [OFFLINE-MERGE] Adding new cached visit:', retailerId, cachedVisit.status);
            mergedVisits.push(cachedVisit);
          }
        });
        
        return mergedVisits;
      } catch (e) {
        console.log('📝 [OFFLINE-MERGE] Failed to merge visits (non-critical):', e);
        return existingVisits;
      }
    };

    // OFFLINE ORDERS MERGE: Merge orders from offline storage to get all offline-submitted orders
    const mergeOfflineOrdersWithCached = async (existingOrders: any[]) => {
      try {
        const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
        
        // Filter orders for current user and date
        const relevantCachedOrders = (cachedOrders || []).filter((o: any) => 
          o.user_id === userId && o.order_date === selectedDate && o.status === 'confirmed'
        );
        
        if (relevantCachedOrders.length === 0) return existingOrders;
        
        // Create a map of existing order IDs and retailer_ids with orders
        const existingOrderIds = new Set((existingOrders || []).map(o => o.id));
        const existingRetailerIds = new Set((existingOrders || []).map(o => o.retailer_id));
        
        const mergedOrders = [...(existingOrders || [])];
        
        // Add cached orders that don't exist in snapshot (new offline orders)
        relevantCachedOrders.forEach(cachedOrder => {
          // Check if this order already exists (by id or by retailer_id for same day)
          const existsByIdOrRetailer = existingOrderIds.has(cachedOrder.id) || 
            (existingRetailerIds.has(cachedOrder.retailer_id) && !cachedOrder.id.startsWith('offline_'));
          
          if (!existsByIdOrRetailer) {
            console.log('📦 [OFFLINE-MERGE] Adding offline order:', cachedOrder.id, 'retailer:', cachedOrder.retailer_id, 'amount:', cachedOrder.total_amount);
            mergedOrders.push(cachedOrder);
          }
        });
        
        return mergedOrders;
      } catch (e) {
        console.log('📦 [OFFLINE-MERGE] Failed to merge orders (non-critical):', e);
        return existingOrders;
      }
    };

    // FASTEST PATH: Check in-memory cache first for instant date switching
    const cachedDateData = dateDataCacheRef.current.get(selectedDate);
    const hasCachedRetailers = cachedDateData && cachedDateData.retailers && cachedDateData.retailers.length > 0;
    
    if (cachedDateData && !forceRefresh) {
      console.log('⚡ [FAST] Loading from in-memory cache for date:', selectedDate, 'retailers:', cachedDateData.retailers.length);
      setBeatPlans(cachedDateData.beatPlans);
      setVisits(cachedDateData.visits);
      setRetailers(cachedDateData.retailers);
      setOrders(cachedDateData.orders);
      // CRITICAL: Always set progressStats from cache for immediate display
      setProgressStats(cachedDateData.progressStats);
      setIsLoading(false);
      lastLoadedDateRef.current = selectedDate;
      
      // Clear loading timeout since we loaded from cache
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // For old dates with actual data, skip network entirely - data won't change
      // But if cache has no retailers, still try network once
      if (isOldDate(selectedDate) && hasCachedRetailers) {
        console.log('📅 [OLD DATE] Skipping network fetch - using cached data with', cachedDateData.retailers.length, 'retailers');
        isLoadingRef.current = false;
        return;
      }
      
      // For today OR future dates, ALWAYS check network for updates when online
      if (navigator.onLine) {
        console.log('📅 [TODAY/FUTURE] Will check network for real-time updates');
        // Continue to network fetch below, but UI is already showing cached data
      } else {
        console.log('📴 [OFFLINE] Using cached data only');

        // Fix: when going offline, in-memory cache can miss newly cached retailers from Add Retailer.
        const mergedRetailers = await mergePlannedBeatRetailersFromOfflineCache(cachedDateData.retailers);
        
        // CRITICAL FIX: Also merge offline visits to get updated statuses (e.g., no-order marked offline)
        const mergedVisits = await mergeOfflineVisitsWithCached(cachedDateData.visits);
        
        // CRITICAL FIX: Also merge offline orders to get all offline-submitted orders
        const mergedOrders = await mergeOfflineOrdersWithCached(cachedDateData.orders || []);
        
        // Check if anything changed
        const retailersChanged = mergedRetailers.length !== cachedDateData.retailers.length;
        const visitsChanged = mergedVisits.some((v: any, i: number) => {
          const original = cachedDateData.visits[i];
          return !original || v.status !== original.status || v.id !== original.id;
        }) || mergedVisits.length !== cachedDateData.visits.length;
        const ordersChanged = mergedOrders.length !== (cachedDateData.orders || []).length;
        
        if (retailersChanged || visitsChanged || ordersChanged) {
          if (retailersChanged) setRetailers(mergedRetailers);
          if (ordersChanged) {
            console.log('📦 [OFFLINE] Orders updated from offline cache, count:', mergedOrders.length);
            setOrders(mergedOrders);
          }
          
          // ALWAYS recalculate progress stats with merged data
          console.log('📝 [OFFLINE] Recalculating progress with merged visits and orders');
          if (visitsChanged) setVisits(mergedVisits);
          
          // Recalculate progress stats with merged visits AND orders
          const retailersWithOrders = new Set(mergedOrders.map((o: any) => o.retailer_id));
          let planned = 0, productive = 0, unproductive = 0;
          const totalOrders = mergedOrders.length;
          const totalOrderValue = mergedOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
          const countedRetailers = new Set<string>();
          
          const visitsByRetailer = new Map<string, any[]>();
          mergedVisits.forEach((v: any) => {
            if (!v?.retailer_id) return;
            const list = visitsByRetailer.get(v.retailer_id) || [];
            list.push(v);
            visitsByRetailer.set(v.retailer_id, list);
          });

          visitsByRetailer.forEach((group, retailerId) => {
            const hasOrder = retailersWithOrders.has(retailerId);
            countedRetailers.add(retailerId);

            if (hasOrder) productive++;
            else if (group.some(v => v.status === 'productive')) productive++;
            else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) unproductive++;
            else planned++;
          });
          
          retailersWithOrders.forEach((rid: string) => {
            if (!countedRetailers.has(rid)) {
              productive++;
              countedRetailers.add(rid);
            }
          });
          
          mergedRetailers.forEach((r: any) => {
            if (!countedRetailers.has(r.id)) planned++;
          });
          
          const newStats = { 
            planned, 
            productive, 
            unproductive,
            totalOrders,
            totalOrderValue
          };
          console.log('📊 [OFFLINE] New progress stats:', newStats);
          setProgressStats(newStats);
          
          dateDataCacheRef.current.set(selectedDate, {
            ...cachedDateData,
            retailers: mergedRetailers,
            visits: mergedVisits,
            orders: mergedOrders,
            progressStats: newStats,
            timestamp: Date.now()
          });
        }

        isLoadingRef.current = false;
        return;
      }
    } else if (!forceRefresh) {
      // SECOND PATH: No in-memory cache - try loading from persistent SNAPSHOT (app restart scenario)
      // This ensures data shows instantly even after app restart on slow/no network
      try {
        const snapshot = await loadMyVisitsSnapshot(userId, selectedDate);
        if (snapshot && (snapshot.retailers?.length > 0 || snapshot.beatPlans?.length > 0 || snapshot.visits?.length > 0)) {
          console.log('📸 [SNAPSHOT] Loading from persistent snapshot for date:', selectedDate, 'retailers:', snapshot.retailers?.length || 0, 'beatPlans:', snapshot.beatPlans?.length || 0);
          
          // CRITICAL: Display snapshot immediately - this is the source of truth for slow/no network
          setBeatPlans(snapshot.beatPlans || []);
          setVisits(snapshot.visits || []);
          setRetailers(snapshot.retailers || []);
          setOrders(snapshot.orders || []);
          setProgressStats(snapshot.progressStats || { planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 });
          setIsLoading(false);
          lastLoadedDateRef.current = selectedDate;
          
          // Also populate in-memory cache for subsequent fast access
          dateDataCacheRef.current.set(selectedDate, {
            beatPlans: snapshot.beatPlans || [],
            visits: snapshot.visits || [],
            retailers: snapshot.retailers || [],
            orders: snapshot.orders || [],
            progressStats: snapshot.progressStats || { planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 },
            timestamp: snapshot.timestamp
          });
          
          // Clear loading timeout since we loaded from snapshot
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          
          // For old dates, skip network - data won't change
          if (isOldDate(selectedDate)) {
            console.log('📅 [OLD DATE] Skipping network - using snapshot data');
            isLoadingRef.current = false;
            return;
          }
          
          // For today/future, continue to network check but UI is ready
          if (!navigator.onLine) {
            console.log('📴 [OFFLINE] Using snapshot data only');

            // Fix: snapshot can be stale vs newly cached retailers added just before going offline.
            const mergedRetailers = await mergePlannedBeatRetailersFromOfflineCache(snapshot.retailers);
            
            // CRITICAL FIX: Also merge offline visits to get updated statuses (e.g., no-order marked offline)
            const mergedVisits = await mergeOfflineVisitsWithCached(snapshot.visits);
            
            // CRITICAL FIX: Also merge offline orders to get all offline-submitted orders
            const mergedOrders = await mergeOfflineOrdersWithCached(snapshot.orders || []);
            
            const retailersChanged = mergedRetailers.length !== snapshot.retailers.length;
            const visitsChanged = mergedVisits.some((v: any, i: number) => {
              const original = snapshot.visits[i];
              return !original || v.status !== original.status || v.id !== original.id;
            }) || mergedVisits.length !== snapshot.visits.length;
            const ordersChanged = mergedOrders.length !== (snapshot.orders || []).length;
            
            if (retailersChanged || visitsChanged || ordersChanged) {
              if (retailersChanged) setRetailers(mergedRetailers);
              if (ordersChanged) {
                console.log('📦 [OFFLINE] Orders updated from offline cache (snapshot), count:', mergedOrders.length);
                setOrders(mergedOrders);
              }
              
              // ALWAYS recalculate progress stats with merged data
              console.log('📝 [OFFLINE] Recalculating progress with merged visits and orders (snapshot)');
              if (visitsChanged) setVisits(mergedVisits);
              
              // Recalculate progress stats with merged visits AND orders
              const retailersWithOrders = new Set(mergedOrders.map((o: any) => o.retailer_id));
              let planned = 0, productive = 0, unproductive = 0;
              const totalOrders = mergedOrders.length;
              const totalOrderValue = mergedOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
              const countedRetailers = new Set<string>();
              
              const visitsByRetailer = new Map<string, any[]>();
              mergedVisits.forEach((v: any) => {
                if (!v?.retailer_id) return;
                const list = visitsByRetailer.get(v.retailer_id) || [];
                list.push(v);
                visitsByRetailer.set(v.retailer_id, list);
              });

              visitsByRetailer.forEach((group, retailerId) => {
                const hasOrder = retailersWithOrders.has(retailerId);
                countedRetailers.add(retailerId);

                if (hasOrder) productive++;
                else if (group.some(v => v.status === 'productive')) productive++;
                else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) unproductive++;
                else planned++;
              });
              
              retailersWithOrders.forEach((rid: string) => {
                if (!countedRetailers.has(rid)) {
                  productive++;
                  countedRetailers.add(rid);
                }
              });
              
              mergedRetailers.forEach((r: any) => {
                if (!countedRetailers.has(r.id)) planned++;
              });
              
              const newStats = { 
                planned, 
                productive, 
                unproductive,
                totalOrders,
                totalOrderValue
              };
              console.log('📊 [OFFLINE] New progress stats (snapshot):', newStats);
              setProgressStats(newStats);
              
              dateDataCacheRef.current.set(selectedDate, {
                beatPlans: snapshot.beatPlans,
                visits: mergedVisits,
                retailers: mergedRetailers,
                orders: mergedOrders,
                progressStats: newStats,
                timestamp: Date.now()
              });
            }

            isLoadingRef.current = false;
            return;
          }
          
          // CRITICAL FIX: When online with snapshot, start background sync and RETURN
          // Don't fall through to offlineStorage which may have stale data
          if (navigator.onLine) {
            console.log('🌐 [SNAPSHOT] Online - starting background sync, NOT falling through to offlineStorage');
            backgroundNetworkSync(userId, selectedDate);
            isLoadingRef.current = false;
            return;
          }
        }
      } catch (snapshotError) {
        console.log('Snapshot load failed (non-critical):', snapshotError);
      }
    }
    
    if (isDateChange) {
      // Only show loading if we don't have cache and date changed
      // But only briefly - cache loading is very fast
      console.log('📅 [VisitsData] Date changed from', lastLoadedDateRef.current, 'to', selectedDate);
      lastLoadedDateRef.current = selectedDate;
    }
    
    let hasLoadedFromCache = false;
    let loadedRetailersCount = 0; // Track loaded retailers to avoid stale state reference

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
        // CRITICAL: Use order_date if available, fallback to created_at date comparison
        const orderDateStr = o.order_date || (o.created_at ? o.created_at.split('T')[0] : null);
        const isCorrectUser = o.user_id === userId;
        const isConfirmed = o.status === 'confirmed';
        const isCorrectDate = orderDateStr === selectedDate;
        
        if (!isCorrectDate && orderDateStr && o.created_at) {
          // Also check created_at as fallback for date matching
          const createdDate = new Date(o.created_at);
          const targetDate = new Date(selectedDate);
          const isSameDay = createdDate.toDateString() === targetDate.toDateString();
          return isCorrectUser && isConfirmed && isSameDay;
        }
        
        return isCorrectUser && isConfirmed && isCorrectDate;
      });
      // CRITICAL: If no beat plans for this date from cache
      // For old dates, we should still try network ONCE to load data that might not be cached
      // Only show empty state and skip network if we're offline
      if (filteredBeatPlans.length === 0) {
        console.log('📦 [CACHE] No beat plans in cache for this date:', selectedDate);
        
        // IMPORTANT: Don't show empty state yet if we're online - let network fetch try first
        // Only show empty state if offline
        if (!navigator.onLine) {
          setBeatPlans([]);
          setVisits([]);
          setRetailers([]);
          setOrders([]);
          setProgressStats({ planned: 0, productive: 0, unproductive: 0, totalOrders: 0, totalOrderValue: 0 });
          hasLoadedFromCache = true;
          setIsLoading(false);
          console.log('📴 [CACHE] Offline with no cached data - showing empty state');
        } else {
          // Online - don't set empty state, let network fetch populate data
          console.log('📦 [CACHE] Online with no cached data - waiting for network fetch');
          setIsLoading(true);
        }
        
        lastLoadedDateRef.current = selectedDate;
      } else {
        // Get retailer IDs from visits and orders
        const visitRetailerIds = filteredVisits.map((v: any) => v.retailer_id);
        const orderRetailerIds = filteredOrders.map((o: any) => o.retailer_id);

        // Extract retailer IDs from beat_data.retailer_ids if explicitly specified
        let explicitRetailerIds: string[] = [];
        for (const beatPlan of filteredBeatPlans) {
          const beatData = (beatPlan as any).beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
            explicitRetailerIds.push(...beatData.retailer_ids);
          }
        }

        // ALWAYS ALSO get retailers by beat_id matching (union, not fallback)
        // This ensures newly added retailers appear even if beat_data.retailer_ids wasn't updated
        const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
        const beatRetailers = cachedRetailers.filter((r: any) => 
          r.user_id === userId && plannedBeatIds.includes(r.beat_id)
        );
        const beatRetailerIds = beatRetailers.map((r: any) => r.id);
        
        // UNION both sources: explicit IDs from beat_data + all retailers matching beat_id
        const plannedRetailerIds = Array.from(new Set([...explicitRetailerIds, ...beatRetailerIds]));
        console.log('📦 [CACHE] Retailer IDs - explicit:', explicitRetailerIds.length, 'beat_id match:', beatRetailerIds.length, 'union:', plannedRetailerIds.length);
        
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

          // Group visits by retailer (handles duplicates)
          const visitsByRetailer = new Map<string, any[]>();
          filteredVisits.forEach((v: any) => {
            if (!v?.retailer_id) return;
            const list = visitsByRetailer.get(v.retailer_id) || [];
            list.push(v);
            visitsByRetailer.set(v.retailer_id, list);
          });

          // Count based on per-retailer effective status
          visitsByRetailer.forEach((group, retailerId) => {
            const hasOrder = retailersWithOrders.has(retailerId);
            countedRetailers.add(retailerId);

            if (hasOrder) {
              productive++;
            } else if (group.some(v => v.status === 'productive')) {
              productive++;
            } else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) {
              unproductive++;
            } else {
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
          
          // SORT: Put newly added retailers at the TOP of the list (for cache loading too)
          let sortedRetailers = filteredRetailers;
          if (newlyAddedRetailerIdsRef.current.size > 0) {
            console.log('📌 [CACHE] Sorting retailers, putting new ones at top:', Array.from(newlyAddedRetailerIdsRef.current));
            sortedRetailers = [...filteredRetailers].sort((a: any, b: any) => {
              const aIsNew = newlyAddedRetailerIdsRef.current.has(a.id);
              const bIsNew = newlyAddedRetailerIdsRef.current.has(b.id);
              if (aIsNew && !bIsNew) return -1;
              if (!aIsNew && bIsNew) return 1;
              return 0;
            });
            // Don't clear here - network fetch might happen after and needs the IDs
          }
          
          setRetailers(sortedRetailers);
          setOrders(filteredOrders);
          setProgressStats(cacheStats); // Set progressStats in same batch!
          loadedRetailersCount = sortedRetailers.length; // Track for network skip check
          // Trigger recalculation via dataVersion
          setDataVersion(v => v + 1);
          
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
          // No retailers in cache but have beat plans
          // Still set available data (beats, visits, orders) even if retailers array is empty
          console.log('📦 [CACHE] Beats found, setting available data even without retailers...');
          setBeatPlans(filteredBeatPlans);
          setVisits(filteredVisits);
          setOrders(filteredOrders);
          
          // Calculate stats even with empty retailers (orders/visits still count)
          const totalOrders = filteredOrders.length;
          const totalOrderValue = filteredOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);

          const retailersWithOrders = new Set(filteredOrders.map((o: any) => o.retailer_id));
          let productive = 0;
          let unproductive = 0;

          const visitsByRetailer = new Map<string, any[]>();
          filteredVisits.forEach((v: any) => {
            if (!v?.retailer_id) return;
            const list = visitsByRetailer.get(v.retailer_id) || [];
            list.push(v);
            visitsByRetailer.set(v.retailer_id, list);
          });

          visitsByRetailer.forEach((group, retailerId) => {
            if (retailersWithOrders.has(retailerId) || group.some(v => v.status === 'productive')) productive++;
            else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) unproductive++;
          });

          // Orders without visit still count as productive
          retailersWithOrders.forEach((rid: string) => {
            if (!visitsByRetailer.has(rid)) productive++;
          });
          
          hasLoadedFromCache = true;
          setIsLoading(false);
        }
      }
      
      // Update lastLoadedDateRef after cache loading
      lastLoadedDateRef.current = selectedDate;
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

    // SMART NETWORK STRATEGY - CACHE-FIRST, NEVER BLOCK UI:
    // If cache has data, we're DONE loading - network sync happens in background only
    // This ensures instant UI response even on slow internet
    
    const shouldSkipNetwork = isOldDate(selectedDate) && hasLoadedFromCache && loadedRetailersCount > 0;
    
    if (shouldSkipNetwork) {
      console.log('📅 [OLD DATE] Skipping network fetch - have cached data with', loadedRetailersCount, 'retailers');
      setIsLoading(false);
      isLoadingRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      return;
    }

    // CRITICAL: If cache loaded with data, UI is ready - network sync is background-only
    if (hasLoadedFromCache && loadedRetailersCount > 0) {
      console.log('✅ [CACHE-FIRST] Cache loaded successfully, network sync in background');
      setIsLoading(false);
      isLoadingRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Fire background sync without blocking - fire and forget
      if (navigator.onLine) {
        const bgSelectedDate = selectedDate;
        const bgUserId = userId;
        requestIdleCallback?.(() => {
          backgroundNetworkSync(bgUserId, bgSelectedDate);
        }) || setTimeout(() => {
          backgroundNetworkSync(bgUserId, bgSelectedDate);
        }, 100);
      }
      return;
    }

  // STEP 2: Only await network if cache had no data (first load scenario)
    if (navigator.onLine) {
      console.log('🌐 [VisitsData] No cache data, fetching from network (first load)...');
      try {
        // Calculate date range for queries
        const dateStart = new Date(selectedDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(selectedDate);
        dateEnd.setHours(23, 59, 59, 999);

        // TIMEOUT: On slow networks, abort after 3 seconds and show cached/empty state
        const NETWORK_TIMEOUT_MS = 3000;
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), NETWORK_TIMEOUT_MS)
        );

        // Fetch all initial data in parallel for maximum speed - with timeout
        const networkFetch = Promise.all([
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
            .select('points, reference_id, reference_type, metadata')
            .eq('user_id', userId)
            .gte('earned_at', dateStart.toISOString())
            .lte('earned_at', dateEnd.toISOString())
        ]);

        const [beatPlansResult, visitsResult, pointsResult] = await Promise.race([
          networkFetch,
          timeoutPromise
        ]) as any[];

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
        let explicitRetailerIds: string[] = [];
        for (const beatPlan of beatPlansData) {
          const beatData = beatPlan.beat_data as any;
          if (beatData && Array.isArray(beatData.retailer_ids) && beatData.retailer_ids.length > 0) {
            explicitRetailerIds.push(...beatData.retailer_ids);
          }
        }
        
        console.log('📋 Explicit retailer IDs from beat_data:', explicitRetailerIds.length);
        
        // ALWAYS ALSO fetch retailers by beat_id (union, not fallback)
        // This ensures newly added retailers appear even if beat_data.retailer_ids wasn't updated
        const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);
        console.log('🔍 [DEBUG] plannedBeatIds:', plannedBeatIds.length, 'explicitRetailerIds from beat_data:', explicitRetailerIds.length);
        
        let beatRetailerIds: string[] = [];
        if (plannedBeatIds.length > 0) {
          const { data: beatRetailers, error: retailersError } = await supabase
            .from('retailers')
            .select('id')
            .eq('user_id', userId)
            .in('beat_id', plannedBeatIds);

          if (retailersError) {
            console.error('Error fetching retailers by beat_id:', retailersError);
          } else {
            beatRetailerIds = (beatRetailers || []).map((r: any) => r.id);
            console.log('📋 Found', beatRetailerIds.length, 'retailers by beat_id match');
          }
        }
        
        // UNION both sources: explicit IDs from beat_data + all retailers matching beat_id
        const plannedRetailerIds = Array.from(new Set([...explicitRetailerIds, ...beatRetailerIds]));
        console.log('📋 Union result:', plannedRetailerIds.length, 'total planned retailers');

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
            .select('id, name, address, phone, category, parent_name, potential, user_id, beat_id, pending_amount, latitude, longitude, created_at')
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
        // Note: plannedBeatIds already defined above
        
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

        // SAVE SNAPSHOT for instant loading on app restart (persistent storage)
        // Snapshot contains everything needed to display My Visits instantly
        const beatNames = beatPlansData.map(plan => plan.beat_name).join(', ') || 'No beats planned';
        saveMyVisitsSnapshot(userId, selectedDate, {
          beatPlans: beatPlansData,
          visits: visitsData,
          retailers: retailersData.length > 0 ? retailersData : retailers,
          orders: ordersData,
          progressStats: newStats,
          currentBeatName: beatNames
        }).catch(console.error);

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
        let finalRetailers = retailersData.length > 0 ? retailersData : (hasLoadedFromCache ? retailers : []);
        
        // SORT: Put newly added retailers at the TOP of the list
        // Also preserve newly added retailers that might not be in network data yet (replication lag)
        if (newlyAddedRetailerIdsRef.current.size > 0) {
          console.log('📌 [useVisitsDataOptimized] Sorting retailers, putting new ones at top:', Array.from(newlyAddedRetailerIdsRef.current));
          
          // Check if new retailers exist in the fetched data
          const newRetailerIds = Array.from(newlyAddedRetailerIdsRef.current);
          const missingNewRetailers = newRetailerIds.filter(id => !finalRetailers.some((r: any) => r.id === id));
          
          // If new retailers are missing from network data, get them from current state (added via immediate update)
          if (missingNewRetailers.length > 0) {
            const currentRetailersWithNew = retailers.filter((r: any) => missingNewRetailers.includes(r.id));
            if (currentRetailersWithNew.length > 0) {
              console.log('📌 [useVisitsDataOptimized] Preserving newly added retailers not yet in network:', currentRetailersWithNew.map((r: any) => r.id));
              finalRetailers = [...currentRetailersWithNew, ...finalRetailers];
            }
          }
          
          finalRetailers = [...finalRetailers].sort((a: any, b: any) => {
            const aIsNew = newlyAddedRetailerIdsRef.current.has(a.id);
            const bIsNew = newlyAddedRetailerIdsRef.current.has(b.id);
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
            return 0; // Keep original order for non-new retailers
          });
          // NOTE: IDs are now managed via sessionStorage with 30-minute expiry - no setTimeout clear
        }
        
        setRetailers(finalRetailers);
        
        // CRITICAL: Also update progressStats directly here to ensure it's in sync with network data
        // The useEffect may not trigger if data hasn't changed shape
        setProgressStats(newStats);
        // Trigger recalculation via dataVersion
        setDataVersion(v => v + 1);
        
        setIsLoading(false);
        setError(null);
        console.log('🔄 Updated with fresh data from network, progressStats:', newStats);
      } catch (networkError: any) {
        // TIMEOUT HANDLING: On slow network, abort and use cache - schedule background retry
        const isTimeout = networkError?.message === 'NETWORK_TIMEOUT';
        if (isTimeout) {
          console.log('⏱️ [TIMEOUT] Network too slow (>3s), using cached data. Scheduling background retry...');
          // Schedule a background retry after 5 seconds to fetch latest when network improves
          setTimeout(() => {
            if (navigator.onLine) {
              console.log('🔄 [RETRY] Retrying network fetch after timeout...');
              backgroundNetworkSync(userId, selectedDate);
            }
          }, 5000);
        } else {
          console.log('Network sync failed, using cached data:', networkError);
        }
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
    
    // Clear loading timeout since we're done
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    isLoadingRef.current = false;
    pendingDateRef.current = null;
    
    // No need to check pending dates here - the useEffect will re-trigger loadData for new dates
  }, [userId, selectedDate, isOldDate, isToday]);

  // Recalculate progress stats when dataVersion changes
  // This is triggered ONLY after ALL state has been updated (via setDataVersion call)
  // NOT triggered by individual state changes to avoid race conditions
  useEffect(() => {
    if (!userId || dataVersion === 0) return;
    
    console.log('📊 [ProgressStats] Recalculating for dataVersion:', dataVersion, {
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
    console.log('📊 [ProgressStats] Calculated (dataVersion triggered):', newStats);
    
    setProgressStats(newStats);
  }, [userId, dataVersion, orders, visits, retailers, beatPlans]);

  // Cleanup old snapshots on mount (background)
  useEffect(() => {
    if (userId) {
      cleanupOldSnapshots(userId).catch(console.error);
    }
  }, [userId]);

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
      
      const { visitId, status, retailerId } = event.detail || {};
      
      // IMMEDIATE: Update progress stats based on the status change
      if (status === 'unproductive' && retailerId) {
        console.log('📊 [IMMEDIATE] Updating progress stats for unproductive status');
        
        // Clear in-memory cache for today to ensure fresh calculation
        const today = new Date().toISOString().split('T')[0];
        dateDataCacheRef.current.delete(today);
        dateDataCacheRef.current.delete(selectedDate);
        
        // If we have the visit in our visits array, update it immediately
        setVisits(prev => {
          const existingVisitIndex = prev.findIndex(v => v.id === visitId || v.retailer_id === retailerId);
          if (existingVisitIndex >= 0) {
            const updated = [...prev];
            updated[existingVisitIndex] = { ...updated[existingVisitIndex], status: 'unproductive' };
            return updated;
          } else {
            // Add a placeholder visit for the retailer
            return [...prev, { id: visitId || `temp-${retailerId}`, retailer_id: retailerId, status: 'unproductive', user_id: userId }];
          }
        });
        
        // Trigger immediate progress recalculation via dataVersion
        setDataVersion(prev => prev + 1);
      } else if (status === 'productive' && retailerId) {
        console.log('📊 [IMMEDIATE] Updating progress stats for productive status');
        
        // Clear cache
        const today = new Date().toISOString().split('T')[0];
        dateDataCacheRef.current.delete(today);
        dateDataCacheRef.current.delete(selectedDate);
        
        // Update visit status immediately
        setVisits(prev => {
          const existingVisitIndex = prev.findIndex(v => v.id === visitId || v.retailer_id === retailerId);
          if (existingVisitIndex >= 0) {
            const updated = [...prev];
            updated[existingVisitIndex] = { ...updated[existingVisitIndex], status: 'productive' };
            return updated;
          }
          return prev;
        });
        
        // Trigger immediate progress recalculation
        setDataVersion(prev => prev + 1);
      }
      
      // DEBOUNCED: Background data refresh - only if not recently loaded
      const now = Date.now();
      if (now - lastLoadTimeRef.current > 2000) { // 2 second debounce
        lastLoadTimeRef.current = now;
        setTimeout(() => {
          loadData(true);
        }, 500);
      } else {
        console.log('⏸️ [DEBOUNCE] Skipping reload - recently loaded');
      }
    };

    // Listen for visitDataChanged events (e.g., new beat plans added, new retailers)
    const handleDataChange = async (event: Event) => {
      console.log('🔔 [useVisitsDataOptimized] visitDataChanged event received');
      
      // Check if this event contains a newly added retailer ID
      const customEvent = event as CustomEvent;
      const newRetailerId = customEvent.detail?.newRetailerId;
      const newRetailerData = customEvent.detail?.retailerData;
      
      if (newRetailerId) {
        console.log('📌 [useVisitsDataOptimized] New retailer added:', newRetailerId);
        persistNewRetailerId(newRetailerId);
        
        // IMMEDIATE UPDATE: If we have retailer data, add to current retailers immediately
        if (newRetailerData) {
          console.log('📌 [IMMEDIATE] Adding new retailer to top of list immediately');
          setRetailers(prev => {
            // Check if retailer already exists
            if (prev.some(r => r.id === newRetailerId)) {
              // Move existing retailer to top
              const existing = prev.find(r => r.id === newRetailerId);
              const others = prev.filter(r => r.id !== newRetailerId);
              return [existing, ...others];
            }
            // Add new retailer at the TOP of the list
            return [newRetailerData, ...prev];
          });
          
          // CRITICAL: Also update in-memory cache to preserve new retailer at top
          const cachedData = dateDataCacheRef.current.get(selectedDate);
          if (cachedData) {
            const updatedRetailers = cachedData.retailers.some((r: any) => r.id === newRetailerId)
              ? [cachedData.retailers.find((r: any) => r.id === newRetailerId), ...cachedData.retailers.filter((r: any) => r.id !== newRetailerId)]
              : [newRetailerData, ...cachedData.retailers];
            dateDataCacheRef.current.set(selectedDate, {
              ...cachedData,
              retailers: updatedRetailers,
              timestamp: Date.now()
            });
            console.log('📌 [CACHE] Updated in-memory cache with new retailer at top');
          }
          
          // Skip network reload when we've already updated the UI with the new retailer
          // The retailer is already saved to DB/cache by the time this event fires
          console.log('📌 [IMMEDIATE] Skipping loadData - already updated UI with new retailer');
          return;
        }
      }
      
      // DEBOUNCED: Only reload if not recently loaded
      const now = Date.now();
      if (now - lastLoadTimeRef.current > 2000) { // 2 second debounce
        // Clear in-memory cache for today to force fresh load
        const today = new Date().toISOString().split('T')[0];
        dateDataCacheRef.current.delete(today);
        dateDataCacheRef.current.delete(selectedDate);
        console.log('🗑️ [CACHE] Cleared in-memory cache for:', today, selectedDate);
        
        lastLoadTimeRef.current = now;
        // Small delay to ensure database write completed (for online save)
        setTimeout(() => {
          loadData(true);
        }, 300);
      } else {
        console.log('⏸️ [DEBOUNCE] Skipping visitDataChanged reload - recently loaded');
      }
    };
    
    // Listen for sync complete event (offline -> online sync finished)
    // This is the ONLY automatic refresh - runs once after offline data syncs to database
    const handleSyncComplete = () => {
      console.log('🔄 [SYNC-COMPLETE] Sync finished, clearing cache and refreshing data...');
      
      // Clear pending debounce timeout
      if (pendingLoadTimeoutRef.current) {
        clearTimeout(pendingLoadTimeoutRef.current);
        pendingLoadTimeoutRef.current = null;
      }
      
      // CRITICAL: Clear in-memory cache to force fresh database fetch
      const today = new Date().toISOString().split('T')[0];
      dateDataCacheRef.current.delete(today);
      dateDataCacheRef.current.delete(selectedDate);
      
      // Also clear snapshot cache
      lastLoadedDateRef.current = null;
      
      // Force load immediately - syncComplete is high priority
      lastLoadTimeRef.current = Date.now();
      setTimeout(() => {
        loadData(true);
      }, 300);
    };
    
    // REMOVED: 30-second auto-refresh and "online" event listener
    // These caused constant UI refreshes showing different data
    // Now only refreshes on: page open, syncComplete, and explicit data changes
    
    window.addEventListener('visitStatusChanged', handleStatusChange);
    window.addEventListener('visitDataChanged', handleDataChange);
    window.addEventListener('syncComplete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange);
      window.removeEventListener('visitDataChanged', handleDataChange);
      window.removeEventListener('syncComplete', handleSyncComplete);
      // Clean up loading timeout on unmount
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (pendingLoadTimeoutRef.current) {
        clearTimeout(pendingLoadTimeoutRef.current);
      }
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
