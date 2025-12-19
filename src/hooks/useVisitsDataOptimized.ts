import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES, MIN_SYNC_INTERVAL_MS } from '@/lib/offlineStorage';
import { loadMyVisitsSnapshot, saveMyVisitsSnapshot } from '@/lib/myVisitsSnapshot';

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

// SMART SYNC: Track individual item changes by ID + timestamp
interface ItemFingerprint {
  id: string;
  updatedAt: string;
  hash: string;
}

// Generate a simple hash for an item to detect changes
const generateItemHash = (item: any): string => {
  if (!item) return '';
  // Use key fields that matter for display
  const relevantFields = {
    status: item.status,
    no_order_reason: item.no_order_reason,
    total_amount: item.total_amount,
    pending_amount: item.pending_amount,
    order_value: item.order_value,
  };
  return JSON.stringify(relevantFields);
};

// SMART COMPARE: Returns only items that actually changed
const getChangedItems = <T extends { id: string; updated_at?: string }>(
  existing: T[],
  incoming: T[]
): { changed: T[], unchanged: string[], added: T[], removed: string[] } => {
  const existingMap = new Map(existing.map(item => [item.id, item]));
  const incomingMap = new Map(incoming.map(item => [item.id, item]));
  
  const changed: T[] = [];
  const unchanged: string[] = [];
  const added: T[] = [];
  const removed: string[] = [];
  
  // Check incoming items
  for (const [id, item] of incomingMap) {
    const existingItem = existingMap.get(id);
    if (!existingItem) {
      added.push(item);
    } else {
      // Compare by updated_at and hash
      const existingHash = generateItemHash(existingItem);
      const incomingHash = generateItemHash(item);
      const existingTime = (existingItem as any).updated_at || '';
      const incomingTime = item.updated_at || '';
      
      if (incomingTime > existingTime || incomingHash !== existingHash) {
        changed.push(item);
      } else {
        unchanged.push(id);
      }
    }
  }
  
  // Check for removed items
  for (const id of existingMap.keys()) {
    if (!incomingMap.has(id)) {
      removed.push(id);
    }
  }
  
  return { changed, unchanged, added, removed };
};

// Calculate progress stats - PURE FUNCTION (no network calls)
// FIX: Added date parameter to filter visits by selectedDate to prevent stale data counts
const calculateStats = (visits: any[], orders: any[], retailers: any[], selectedDate?: string): ProgressStats => {
  // CRITICAL FIX: Filter visits to ONLY the selected date to prevent stale snapshot data from contaminating counts
  const dateFilteredVisits = selectedDate 
    ? visits.filter(v => v.planned_date === selectedDate)
    : visits;
  
  // Also filter orders by date
  const dateFilteredOrders = selectedDate
    ? orders.filter(o => o.order_date === selectedDate)
    : orders;
  
  const retailersWithOrders = new Set(dateFilteredOrders.map(o => o.retailer_id));
  const visitsByRetailer = new Map<string, any[]>();
  
  dateFilteredVisits.forEach(v => {
    if (!v?.retailer_id) return;
    const list = visitsByRetailer.get(v.retailer_id) || [];
    list.push(v);
    visitsByRetailer.set(v.retailer_id, list);
  });

  let planned = 0, productive = 0, unproductive = 0;
  const countedRetailers = new Set<string>();

  visitsByRetailer.forEach((group, retailerId) => {
    countedRetailers.add(retailerId);
    if (retailersWithOrders.has(retailerId)) productive++;
    else if (group.some(v => v.status === 'productive')) productive++;
    else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) unproductive++;
    else planned++;
  });

  retailersWithOrders.forEach(rid => {
    if (!countedRetailers.has(rid)) {
      productive++;
      countedRetailers.add(rid);
    }
  });

  retailers.forEach(r => {
    if (!countedRetailers.has(r.id)) planned++;
  });

  return {
    planned,
    productive,
    unproductive,
    totalOrders: dateFilteredOrders.length,
    totalOrderValue: dateFilteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  };
};

export const useVisitsDataOptimized = ({ userId, selectedDate }: UseVisitsDataOptimizedProps) => {
  const [beatPlans, setBeatPlans] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [pointsData, setPointsData] = useState<PointsData>({ total: 0, byRetailer: new Map() });
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<any>(null);

  const lastDateRef = useRef<string>('');
  const cacheRef = useRef<Map<string, any>>(new Map());
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastSyncTimeRef = useRef<Map<string, number>>(new Map());
  const syncInProgressRef = useRef(false);
  
  // SMART SYNC: Lock to prevent multiple syncs
  const smartSyncLockRef = useRef(false);
  
  // STALE CLOSURE FIX: Keep refs in sync with latest values for event handlers
  const userIdRef = useRef(userId);
  const selectedDateRef = useRef(selectedDate);
  
  useEffect(() => {
    userIdRef.current = userId;
    selectedDateRef.current = selectedDate;
  }, [userId, selectedDate]);

  // Memoized progress stats - LOCAL CALCULATION ONLY
  // FIX: Pass selectedDate to calculateStats to ensure only matching visits are counted
  const progressStats = useMemo(() => 
    calculateStats(visits, orders, retailers, selectedDate),
    [visits, orders, retailers, selectedDate]
  );

  // Check if date is today
  const isToday = useCallback((dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const check = new Date(dateStr);
    check.setHours(0, 0, 0, 0);
    return today.getTime() === check.getTime();
  }, []);

  // Check if should sync (time-based throttling)
  const shouldSyncNow = useCallback((date: string): boolean => {
    const lastSync = lastSyncTimeRef.current.get(date);
    if (!lastSync) return true;
    return (Date.now() - lastSync) >= MIN_SYNC_INTERVAL_MS;
  }, []);

  // Load from offline storage - ALWAYS INSTANT
  // FIX: Less restrictive filtering - include ALL user's retailers that match beats
  const loadFromOfflineStorage = useCallback(async (uid: string, date: string) => {
    try {
      const [cachedBeatPlans, cachedVisits, cachedRetailers, cachedOrders, cachedBeats] = await Promise.all([
        offlineStorage.getAll<any>(STORES.BEAT_PLANS),
        offlineStorage.getAll<any>(STORES.VISITS),
        offlineStorage.getAll<any>(STORES.RETAILERS),
        offlineStorage.getAll<any>(STORES.ORDERS),
        offlineStorage.getAll<any>(STORES.BEATS)
      ]);

      const filteredBeatPlans = cachedBeatPlans.filter(bp => 
        bp.user_id === uid && bp.plan_date === date
      );
      const filteredVisits = cachedVisits.filter(v => 
        v.user_id === uid && v.planned_date === date
      );
      
      // Today's beat IDs from beat plans
      const todayBeatIds = filteredBeatPlans.map(bp => bp.beat_id);
      const visitRetailerIds = new Set(filteredVisits.map(v => v.retailer_id));
      
      // Get explicit retailer IDs from beat_data
      const explicitRetailerIds: string[] = [];
      for (const bp of filteredBeatPlans) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }
      
      // FIX: STRICT filter - only include retailers from:
      // 1. Today's beat plans (todayBeatIds) - primary filter
      // 2. Visits for today (visitRetailerIds)
      // 3. Explicit retailer IDs in beat_data
      // 4. Offline-created retailers ONLY if their beat_id matches today's beats
      const filteredRetailers = cachedRetailers.filter(r => 
        r.user_id === uid && (
          todayBeatIds.includes(r.beat_id) ||                              // Today's beat plans
          visitRetailerIds.has(r.id) ||                                    // Has visit today
          explicitRetailerIds.includes(r.id) ||                            // Explicit in beat_data
          (r.id?.startsWith('offline_') && todayBeatIds.includes(r.beat_id)) // Offline + today's beat
        )
      );
      
      const retailerIds = new Set(filteredRetailers.map(r => r.id));
      const filteredOrders = cachedOrders.filter(o => 
        o.user_id === uid && o.order_date === date && 
        o.status === 'confirmed' && retailerIds.has(o.retailer_id)
      );

      console.log('[OfflineStorage] Loaded:', {
        beatPlans: filteredBeatPlans.length,
        visits: filteredVisits.length,
        retailers: filteredRetailers.length,
        orders: filteredOrders.length,
        todayBeatIds
      });

      return {
        beatPlans: filteredBeatPlans,
        visits: filteredVisits,
        retailers: filteredRetailers,
        orders: filteredOrders
      };
    } catch (e) {
      console.error('Offline storage error:', e);
      return null;
    }
  }, []);

  // GRANULAR UPDATE: Update only specific items that changed
  const applyGranularUpdate = useCallback(<T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    changes: { changed: T[], added: T[], removed: string[] }
  ) => {
    if (changes.changed.length === 0 && changes.added.length === 0 && changes.removed.length === 0) {
      return false; // No changes
    }
    
    setter(prev => {
      let updated = [...prev];
      
      // Apply changes (update existing items)
      if (changes.changed.length > 0) {
        const changedMap = new Map(changes.changed.map(item => [item.id, item]));
        updated = updated.map(item => changedMap.get(item.id) || item);
      }
      
      // Add new items
      if (changes.added.length > 0) {
        const existingIds = new Set(updated.map(item => item.id));
        const newItems = changes.added.filter(item => !existingIds.has(item.id));
        updated = [...updated, ...newItems];
      }
      
      // Remove deleted items
      if (changes.removed.length > 0) {
        const removedSet = new Set(changes.removed);
        updated = updated.filter(item => !removedSet.has(item.id));
      }
      
      return updated;
    });
    
    return true; // Changes applied
  }, []);

  // SMART DELTA SYNC: Fetch ALL visits/orders (no delta filter), fetch retailers by beat_id
  const smartDeltaSync = useCallback(async (uid: string, date: string) => {
    // Prevent concurrent syncs
    if (smartSyncLockRef.current || !navigator.onLine || !mountedRef.current) {
      return;
    }
    
    if (!shouldSyncNow(date)) {
      console.log('[SmartSync] Skipping - synced recently');
      return;
    }

    smartSyncLockRef.current = true;
    console.log('[SmartSync] Starting full sync for', date);

    try {
      // 8-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // FIX #1: ALWAYS fetch ALL visits and orders for the date (no delta filter)
      // This ensures unproductive visits are never missed due to stale delta timestamps
      const [bpRes, vRes, oRes] = await Promise.all([
        supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date),
        supabase.from('visits').select('*').eq('user_id', uid).eq('planned_date', date),
        supabase.from('orders').select('*').eq('user_id', uid).eq('order_date', date).eq('status', 'confirmed')
      ]);
      clearTimeout(timeoutId);

      if (!mountedRef.current || lastDateRef.current !== date) {
        smartSyncLockRef.current = false;
        return;
      }

      const newBeatPlans = bpRes.data || [];
      const newVisits = vRes.data || [];
      const newOrders = oRes.data || [];

      console.log(`[SmartSync] Fetched: ${newBeatPlans.length} beat plans, ${newVisits.length} visits, ${newOrders.length} orders`);

      // Get current state from cache
      const currentCache = cacheRef.current.get(date) || { beatPlans: [], visits: [], retailers: [], orders: [] };

      // GRANULAR COMPARISON
      let uiUpdated = false;

      // Update beat plans granularly
      const bpChanges = getChangedItems(currentCache.beatPlans, newBeatPlans);
      if (bpChanges.changed.length > 0 || bpChanges.added.length > 0 || bpChanges.removed.length > 0) {
        uiUpdated = applyGranularUpdate(setBeatPlans, bpChanges) || uiUpdated;
        currentCache.beatPlans = newBeatPlans;
      }

      // Update visits granularly - ALWAYS compare full list
      const vChanges = getChangedItems(currentCache.visits, newVisits);
      if (vChanges.changed.length > 0 || vChanges.added.length > 0 || vChanges.removed.length > 0) {
        uiUpdated = applyGranularUpdate(setVisits, vChanges) || uiUpdated;
        currentCache.visits = newVisits;
      }

      // Update orders granularly - ALWAYS compare full list
      const oChanges = getChangedItems(currentCache.orders, newOrders);
      if (oChanges.changed.length > 0 || oChanges.added.length > 0 || oChanges.removed.length > 0) {
        uiUpdated = applyGranularUpdate(setOrders, oChanges) || uiUpdated;
        currentCache.orders = newOrders;
      }

      // FIX #2: ALWAYS fetch ALL retailers by beat_id (not just from visits/orders)
      // This ensures new retailers added to beats are always included
      const beatIds = newBeatPlans.map(bp => bp.beat_id);
      const visitRetailerIds = newVisits.map(v => v.retailer_id);
      const orderRetailerIds = newOrders.map(o => o.retailer_id);
      
      // Get explicit retailer IDs from beat_data
      const explicitRetailerIds: string[] = [];
      for (const bp of newBeatPlans) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }
      
      // Combine all sources for retailer IDs
      const allRetailerIds = [...new Set([...visitRetailerIds, ...orderRetailerIds, ...explicitRetailerIds])];

      // Fetch retailers by beat_id AND by explicit IDs
      // FIX: Start fresh - don't keep old retailers from other beats/dates
      const retailerMap = new Map<string, any>();
      
      // Only keep offline-created retailers that match today's beats
      for (const r of currentCache.retailers) {
        if (r.id?.startsWith('offline_') && beatIds.includes(r.beat_id)) {
          retailerMap.set(r.id, r);
        }
      }
      
      if (beatIds.length > 0) {
        const { data: beatRetailers } = await supabase
          .from('retailers')
          .select('*')
          .eq('user_id', uid)
          .in('beat_id', beatIds);
        if (beatRetailers) {
          for (const r of beatRetailers) {
            retailerMap.set(r.id, r);
          }
        }
      }
      
      if (allRetailerIds.length > 0) {
        const { data: explicitRetailers } = await supabase
          .from('retailers')
          .select('*')
          .eq('user_id', uid)
          .in('id', allRetailerIds);
        if (explicitRetailers) {
          for (const r of explicitRetailers) {
            retailerMap.set(r.id, r);
          }
        }
      }

      if (retailerMap.size > 0) {
        const allRetailers = Array.from(retailerMap.values());
        
        const rChanges = getChangedItems(currentCache.retailers, allRetailers);
        if (rChanges.changed.length > 0 || rChanges.added.length > 0 || rChanges.removed.length > 0) {
          uiUpdated = applyGranularUpdate(setRetailers, rChanges) || uiUpdated;
          currentCache.retailers = allRetailers;
          console.log(`[SmartSync] Retailers updated: ${rChanges.added.length} added, ${rChanges.changed.length} changed`);
        }
      }

      // Update cache with timestamp
      currentCache.timestamp = Date.now();
      cacheRef.current.set(date, currentCache);

      // Save to offline storage (background, non-blocking)
      Promise.all([
        offlineStorage.mergeData(STORES.BEAT_PLANS, currentCache.beatPlans),
        offlineStorage.mergeData(STORES.VISITS, currentCache.visits),
        offlineStorage.mergeData(STORES.RETAILERS, currentCache.retailers),
        offlineStorage.mergeData(STORES.ORDERS, currentCache.orders)
      ]).catch(e => console.error('[SmartSync] Storage error:', e));

      // Save snapshot (background) - pass date to calculateStats for proper filtering
      saveMyVisitsSnapshot(uid, date, {
        beatPlans: currentCache.beatPlans,
        visits: currentCache.visits,
        retailers: currentCache.retailers,
        orders: currentCache.orders,
        progressStats: calculateStats(currentCache.visits, currentCache.orders, currentCache.retailers, date),
        currentBeatName: currentCache.beatPlans.map((p: any) => p.beat_name).join(', ')
      }).catch(e => console.error('[SmartSync] Snapshot error:', e));

      // Update sync timestamp
      lastSyncTimeRef.current.set(date, Date.now());
      await offlineStorage.setSyncMetadata('visits', uid, date);
      
      console.log(`[SmartSync] Complete - UI updated: ${uiUpdated}`);

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('[SmartSync] Timeout - continuing with cached data');
      } else {
        console.error('[SmartSync] Error:', e);
      }
    } finally {
      smartSyncLockRef.current = false;
    }
  }, [shouldSyncNow, applyGranularUpdate]);

  // INITIAL LOAD: Local-first, instant display
  const loadData = useCallback(async () => {
    if (!userId || !selectedDate) return;
    if (isFetchingRef.current && lastDateRef.current === selectedDate) return;
    
    isFetchingRef.current = true;
    lastDateRef.current = selectedDate;

    // FIX #3: Cache staleness check - for today, if cache is old, force full sync
    const MAX_CACHE_AGE_MS = 30 * 60 * 1000; // 30 minutes
    const isTodayDate = isToday(selectedDate);

    // 1. Try in-memory cache FIRST (instant)
    const cached = cacheRef.current.get(selectedDate);
    // Check for ANY valid data (beat plans, retailers, visits, or orders)
    const hasValidCachedData = cached && (
      cached.beatPlans?.length > 0 || 
      cached.retailers?.length > 0 || 
      cached.visits?.length > 0 || 
      cached.orders?.length > 0
    );
    
    // Check if cache is stale (for today only)
    const cacheAge = cached?.timestamp ? Date.now() - cached.timestamp : Infinity;
    const isCacheStale = isTodayDate && cacheAge > MAX_CACHE_AGE_MS;
    
    if (hasValidCachedData) {
      setBeatPlans(cached.beatPlans || []);
      setVisits(cached.visits || []);
      setRetailers(cached.retailers || []);
      setOrders(cached.orders || []);
      if (cached.points) {
        setPointsData({ 
          total: cached.points.total, 
          byRetailer: new Map(cached.points.byRetailer) 
        });
      }
      setIsLoading(false);
      setHasLoadedOnce(true);
      
      // Background smart sync - force if cache is stale
      if (navigator.onLine && (isCacheStale || (isTodayDate && shouldSyncNow(selectedDate)))) {
        console.log('[LoadData] Triggering sync - cache stale:', isCacheStale);
        requestIdleCallback?.(() => smartDeltaSync(userId, selectedDate)) ||
          setTimeout(() => smartDeltaSync(userId, selectedDate), 100);
      }
      isFetchingRef.current = false;
      return;
    }

    // 2. Try persistent snapshot (fast)
    try {
      const snapshot = await loadMyVisitsSnapshot(userId, selectedDate);
      
      // CRITICAL FIX: Validate snapshot data matches the selectedDate
      // This prevents stale visits from other dates contaminating the current view
      const snapshotVisitsMatchDate = snapshot?.visits?.length 
        ? snapshot.visits.every((v: any) => v.planned_date === selectedDate)
        : true; // No visits = passes check
      
      const snapshotOrdersMatchDate = snapshot?.orders?.length
        ? snapshot.orders.every((o: any) => o.order_date === selectedDate)
        : true; // No orders = passes check
        
      const isSnapshotValid = snapshotVisitsMatchDate && snapshotOrdersMatchDate;
      
      if (!isSnapshotValid && snapshot) {
        console.warn('[LoadData] ⚠️ Snapshot has mismatched dates, ignoring snapshot data');
        console.log('[LoadData] Expected date:', selectedDate);
        console.log('[LoadData] Sample visit dates:', snapshot.visits?.slice(0, 3).map((v: any) => v.planned_date));
      }
      
      // Check for ANY valid data (beat plans, retailers, visits, or orders)
      const hasValidSnapshotData = isSnapshotValid && snapshot && (
        snapshot.beatPlans?.length > 0 || 
        snapshot.retailers?.length > 0 || 
        snapshot.visits?.length > 0 || 
        snapshot.orders?.length > 0
      );
      if (hasValidSnapshotData) {
        // FIX: Also check offline storage for NEW retailers that might not be in snapshot
        const offlineData = await loadFromOfflineStorage(userId, selectedDate);
        
        // Merge: Add any offline retailers not in snapshot
        let mergedRetailers = [...(snapshot.retailers || [])];
        if (offlineData?.retailers?.length) {
          const snapshotRetailerIds = new Set(mergedRetailers.map(r => r.id));
          const newRetailers = offlineData.retailers.filter(r => !snapshotRetailerIds.has(r.id));
          if (newRetailers.length > 0) {
            mergedRetailers = [...mergedRetailers, ...newRetailers];
            console.log('[LoadData] Merged', newRetailers.length, 'new retailers from offline storage');
          }
        }
        
        setBeatPlans(snapshot.beatPlans || []);
        setVisits(snapshot.visits || []);
        setRetailers(mergedRetailers);
        setOrders(snapshot.orders || []);
        setIsLoading(false);
        setHasLoadedOnce(true);
        
        // Update cache with merged data
        cacheRef.current.set(selectedDate, { 
          ...snapshot, 
          retailers: mergedRetailers,
          timestamp: Date.now() 
        });
        
        // Background smart sync
        if (navigator.onLine && isToday(selectedDate) && shouldSyncNow(selectedDate)) {
          requestIdleCallback?.(() => smartDeltaSync(userId, selectedDate)) || 
            setTimeout(() => smartDeltaSync(userId, selectedDate), 100);
        }
        isFetchingRef.current = false;
        return;
      }
    } catch (e) {
      // Continue to offline storage
    }

    // 3. Try offline storage
    const offlineData = await loadFromOfflineStorage(userId, selectedDate);
    // Check for ANY valid offline data (beat plans, retailers, visits, or orders)
    const hasValidOfflineData = offlineData && (
      offlineData.beatPlans.length > 0 || 
      offlineData.retailers.length > 0 || 
      offlineData.visits.length > 0 || 
      offlineData.orders.length > 0
    );
    if (hasValidOfflineData) {
      setBeatPlans(offlineData.beatPlans);
      setVisits(offlineData.visits);
      setRetailers(offlineData.retailers);
      setOrders(offlineData.orders);
      setIsLoading(false);
      setHasLoadedOnce(true);
      
      cacheRef.current.set(selectedDate, offlineData);
      
      // Background smart sync
      if (navigator.onLine && shouldSyncNow(selectedDate)) {
        requestIdleCallback?.(() => smartDeltaSync(userId, selectedDate)) || 
          setTimeout(() => smartDeltaSync(userId, selectedDate), 100);
      }
      isFetchingRef.current = false;
      return;
    }

    // 4. No local data - do initial full load from network
    if (navigator.onLine) {
      try {
        setIsLoading(true);
        await doFullInitialLoad(userId, selectedDate);
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    } else {
      // No cache, no network - show empty state
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
    
    isFetchingRef.current = false;
  }, [userId, selectedDate, isToday, loadFromOfflineStorage, smartDeltaSync, shouldSyncNow]);

  // Full initial load - only used when no local data exists
  const doFullInitialLoad = useCallback(async (uid: string, date: string) => {
    try {
      const [bpRes, vRes, oRes] = await Promise.all([
        supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date),
        supabase.from('visits').select('*').eq('user_id', uid).eq('planned_date', date),
        supabase.from('orders').select('*').eq('user_id', uid).eq('order_date', date).eq('status', 'confirmed')
      ]);

      const beatPlansData = bpRes.data || [];
      const visitsData = vRes.data || [];
      const ordersData = oRes.data || [];

      // Get retailer IDs
      const beatIds = beatPlansData.map(bp => bp.beat_id);
      const visitRetailerIds = visitsData.map(v => v.retailer_id);
      const orderRetailerIds = ordersData.map(o => o.retailer_id);
      
      const explicitRetailerIds: string[] = [];
      for (const bp of beatPlansData) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }

      let allRetailerIds = [...new Set([...visitRetailerIds, ...orderRetailerIds, ...explicitRetailerIds])];

      if (beatIds.length > 0) {
        const { data: beatRetailers } = await supabase
          .from('retailers')
          .select('id')
          .eq('user_id', uid)
          .in('beat_id', beatIds);
        if (beatRetailers) {
          allRetailerIds = [...new Set([...allRetailerIds, ...beatRetailers.map(r => r.id)])];
        }
      }

      let retailersData: any[] = [];
      if (allRetailerIds.length > 0) {
        const { data } = await supabase
          .from('retailers')
          .select('*')
          .eq('user_id', uid)
          .in('id', allRetailerIds);
        retailersData = data || [];
      }

      if (!mountedRef.current || lastDateRef.current !== date) return;

      // Set state
      setBeatPlans(beatPlansData);
      setVisits(visitsData);
      setRetailers(retailersData);
      setOrders(ordersData);

      // Update cache with timestamp for staleness check
      const cacheData = {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        timestamp: Date.now()
      };
      cacheRef.current.set(date, cacheData);

      // Save to offline storage
      await Promise.all([
        offlineStorage.mergeData(STORES.BEAT_PLANS, beatPlansData),
        offlineStorage.mergeData(STORES.VISITS, visitsData),
        offlineStorage.mergeData(STORES.RETAILERS, retailersData),
        offlineStorage.mergeData(STORES.ORDERS, ordersData)
      ]);

      // Save snapshot
      await saveMyVisitsSnapshot(uid, date, {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        progressStats: calculateStats(visitsData, ordersData, retailersData),
        currentBeatName: beatPlansData.map(p => p.beat_name).join(', ')
      });

      // Update sync timestamp
      lastSyncTimeRef.current.set(date, Date.now());
      await offlineStorage.setSyncMetadata('visits', uid, date);

    } catch (e) {
      console.error('[FullLoad] Error:', e);
    }
  }, []);

  // Invalidate cache for date and reload from local
  const invalidateData = useCallback(async () => {
    cacheRef.current.delete(selectedDate);
    lastSyncTimeRef.current.delete(selectedDate);
    isFetchingRef.current = false;
    
    // Reload from local first
    if (userId) {
      const offlineData = await loadFromOfflineStorage(userId, selectedDate);
      if (offlineData) {
        setBeatPlans(offlineData.beatPlans);
        setVisits(offlineData.visits);
        setRetailers(offlineData.retailers);
        setOrders(offlineData.orders);
        cacheRef.current.set(selectedDate, offlineData);
      }
      
      // Then trigger background sync
      if (navigator.onLine) {
        smartDeltaSync(userId, selectedDate);
      }
    }
  }, [selectedDate, userId, loadFromOfflineStorage, smartDeltaSync]);

  // Load on mount and date change
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    // IMPORTANT: In React 18 StrictMode (dev), effects mount/unmount twice.
    // Reset in-flight flags on cleanup so the second mount can fetch data.
    return () => {
      mountedRef.current = false;
      isFetchingRef.current = false;
      smartSyncLockRef.current = false;
    };
  }, [loadData]);

  // LOCAL-FIRST EVENT HANDLING: Update state directly without network
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { visitId, status, retailerId, order, noOrderReason } = event.detail || {};
      if (!visitId && !retailerId) return;
      
      // STALE CLOSURE FIX: Use refs for current values
      const currentUserId = userIdRef.current;
      const currentDate = selectedDateRef.current;
      
      console.log('[LocalEvent] Status change:', { visitId, status, retailerId, noOrderReason, currentDate });
      
      // Update visits state directly - NO NETWORK CALL
      setVisits(prev => {
        const existingVisit = prev.find(v => 
          (visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)
        );
        
        let updated;
        if (existingVisit) {
          updated = prev.map(v => {
            if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
              return { 
                ...v, 
                status: status || v.status,
                no_order_reason: noOrderReason || v.no_order_reason,
                updated_at: new Date().toISOString()
              };
            }
            return v;
          });
          console.log('[LocalEvent] Updated existing visit:', { visitId, status, noOrderReason });
        } else if (retailerId && status) {
          const newVisit = {
            id: visitId || `temp_${retailerId}_${Date.now()}`,
            retailer_id: retailerId,
            user_id: currentUserId,
            planned_date: currentDate,
            status,
            no_order_reason: noOrderReason,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          updated = [...prev, newVisit];
          console.log('[LocalEvent] Created new visit:', newVisit);
        } else {
          updated = prev;
        }
        
        // Update cache using ref value
        const cached = cacheRef.current.get(currentDate) || {
          beatPlans: [],
          visits: [],
          retailers: [],
          orders: []
        };
        const updatedCache = { ...cached, visits: updated, timestamp: Date.now() };
        cacheRef.current.set(currentDate, updatedCache);
        
        // Persist to offline storage (background)
        updated.forEach(v => {
          if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
            offlineStorage.save(STORES.VISITS, v).catch(() => {});
          }
        });
        
        // FIX #4: Save snapshot for persistence across app restarts
        if (currentUserId) {
          saveMyVisitsSnapshot(currentUserId, currentDate, {
            beatPlans: updatedCache.beatPlans,
            visits: updated,
            retailers: updatedCache.retailers,
            orders: updatedCache.orders,
            progressStats: calculateStats(updated, updatedCache.orders, updatedCache.retailers),
            currentBeatName: updatedCache.beatPlans?.map((p: any) => p.beat_name).join(', ') || ''
          }).catch(() => {});
        }
        
        return updated;
      });

      // If order data included, update orders too
      if (order) {
        const currentDate = selectedDateRef.current;
        const currentUserId = userIdRef.current;
        setOrders(prev => {
          const existing = prev.find(o => o.id === order.id);
          let updated;
          if (existing) {
            updated = prev.map(o => o.id === order.id ? { ...order, updated_at: new Date().toISOString() } : o);
          } else {
            updated = [...prev, { ...order, updated_at: new Date().toISOString() }];
          }
          
          // Update cache using ref value
          const cached = cacheRef.current.get(currentDate) || {
            beatPlans: [],
            visits: [],
            retailers: [],
            orders: []
          };
          const updatedCache = { ...cached, orders: updated, timestamp: Date.now() };
          cacheRef.current.set(currentDate, updatedCache);
          
          // Persist
          offlineStorage.save(STORES.ORDERS, order).catch(() => {});
          
          // FIX #4: Save snapshot for persistence
          if (currentUserId) {
            saveMyVisitsSnapshot(currentUserId, currentDate, {
              beatPlans: updatedCache.beatPlans,
              visits: updatedCache.visits,
              retailers: updatedCache.retailers,
              orders: updated,
              progressStats: calculateStats(updatedCache.visits, updated, updatedCache.retailers),
              currentBeatName: updatedCache.beatPlans?.map((p: any) => p.beat_name).join(', ') || ''
            }).catch(() => {});
          }
          
          console.log('[LocalEvent] Order updated/added:', order.id);
          return updated;
        });
      }
    };

    // Retailer added - add to local state immediately
    const handleRetailerAdded = (event: CustomEvent) => {
      const { retailer } = event.detail || {};
      // Use refs to avoid stale closure issues
      const currentUserId = userIdRef.current;
      const currentDate = selectedDateRef.current;
      
      if (!retailer || !currentUserId) {
        console.log('[LocalEvent] Retailer skipped - no retailer or userId');
        return;
      }
      
      if (retailer.user_id !== currentUserId) {
        console.log('[LocalEvent] Retailer skipped - user mismatch:', retailer.user_id, '!==', currentUserId);
        return;
      }
      
      console.log('[LocalEvent] Retailer added:', retailer.name, 'for date:', currentDate);
      
      setRetailers(prev => {
        if (prev.some(r => r.id === retailer.id)) {
          console.log('[LocalEvent] Retailer already exists in state:', retailer.id);
          return prev;
        }
        const updated = [...prev, retailer];
        
        // FIXED: Create cache if it doesn't exist, then update it
        const cached = cacheRef.current.get(currentDate) || {
          beatPlans: [],
          visits: [],
          retailers: [],
          orders: []
        };
        const updatedCache = { ...cached, retailers: updated, timestamp: Date.now() };
        cacheRef.current.set(currentDate, updatedCache);
        
        // FIXED: Persist retailer to offline storage for app restarts
        offlineStorage.save(STORES.RETAILERS, retailer).catch(e => {
          console.error('[LocalEvent] Failed to save retailer to offline storage:', e);
        });
        
        // FIX #4: Save snapshot for persistence across app restarts
        saveMyVisitsSnapshot(currentUserId, currentDate, {
          beatPlans: updatedCache.beatPlans,
          visits: updatedCache.visits,
          retailers: updated,
          orders: updatedCache.orders,
          progressStats: calculateStats(updatedCache.visits, updatedCache.orders, updated),
          currentBeatName: updatedCache.beatPlans?.map((p: any) => p.beat_name).join(', ') || ''
        }).catch(() => {});
        
        console.log('[LocalEvent] Retailer added to state, cache, and snapshot. Total retailers:', updated.length);
        return updated;
      });
    };

    // Sync complete - only trigger delta sync if needed
    const handleSyncComplete = () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      if (currentUserId && isToday(currentDate) && navigator.onLine && shouldSyncNow(currentDate)) {
        // Delayed to avoid rapid-fire
        setTimeout(() => smartDeltaSync(currentUserId, currentDate), 1000);
      }
    };

    // FIX: Listen to visitDataChanged - force local reload for progress stats refresh
    // This is critical for offline No Order submissions to reflect in Today's Progress
    const handleVisitDataChanged = async () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      
      if (!currentUserId) return;
      
      console.log('[LocalEvent] visitDataChanged - reloading from local cache/storage');
      
      // Reload from snapshot first (most up-to-date for offline changes)
      try {
        const snapshot = await loadMyVisitsSnapshot(currentUserId, currentDate);
        if (snapshot) {
          console.log('[LocalEvent] Reloaded from snapshot:', {
            visits: snapshot.visits?.length || 0,
            progressStats: snapshot.progressStats
          });
          
          // Update state from snapshot
          setBeatPlans(prev => snapshot.beatPlans?.length > 0 ? snapshot.beatPlans : prev);
          setVisits(snapshot.visits || []);
          setRetailers(prev => snapshot.retailers?.length > 0 ? snapshot.retailers : prev);
          setOrders(snapshot.orders || []);
          
          // Update cache
          cacheRef.current.set(currentDate, {
            beatPlans: snapshot.beatPlans || [],
            visits: snapshot.visits || [],
            retailers: snapshot.retailers || [],
            orders: snapshot.orders || [],
            timestamp: Date.now()
          });
          return;
        }
      } catch (e) {
        console.error('[LocalEvent] Snapshot load failed:', e);
      }
      
      // Fallback: reload from offline storage
      const offlineData = await loadFromOfflineStorage(currentUserId, currentDate);
      if (offlineData) {
        console.log('[LocalEvent] Reloaded from offline storage:', {
          visits: offlineData.visits.length
        });
        setVisits(offlineData.visits);
        setOrders(offlineData.orders);
        
        cacheRef.current.set(currentDate, {
          ...cacheRef.current.get(currentDate),
          visits: offlineData.visits,
          orders: offlineData.orders,
          timestamp: Date.now()
        });
      }
    };

    // Visibility change - sync when app comes to foreground
    const handleVisibility = () => {
      const currentDate = selectedDateRef.current;
      const currentUserId = userIdRef.current;
      if (document.visibilityState === 'visible' && navigator.onLine && currentUserId && isToday(currentDate) && shouldSyncNow(currentDate)) {
        setTimeout(() => smartDeltaSync(currentUserId, currentDate), 500);
      }
    };

    window.addEventListener('visitStatusChanged', handleStatusChange as EventListener);
    window.addEventListener('retailerAdded', handleRetailerAdded as EventListener);
    window.addEventListener('visitDataChanged', handleVisitDataChanged);
    window.addEventListener('syncComplete', handleSyncComplete);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange as EventListener);
      window.removeEventListener('retailerAdded', handleRetailerAdded as EventListener);
      window.removeEventListener('visitDataChanged', handleVisitDataChanged);
      window.removeEventListener('syncComplete', handleSyncComplete);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedDate, isToday, userId, smartDeltaSync, shouldSyncNow, loadFromOfflineStorage]);

  return {
    beatPlans,
    visits,
    retailers,
    orders,
    pointsData,
    progressStats,
    isLoading,
    hasLoadedOnce,
    error,
    invalidateData,
  };
};
