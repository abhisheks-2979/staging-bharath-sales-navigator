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

// Calculate progress stats
const calculateStats = (visits: any[], orders: any[], retailers: any[]): ProgressStats => {
  const retailersWithOrders = new Set(orders.map(o => o.retailer_id));
  const visitsByRetailer = new Map<string, any[]>();
  
  visits.forEach(v => {
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
    totalOrders: orders.length,
    totalOrderValue: orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
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
  const lastSyncTimeRef = useRef<Map<string, number>>(new Map()); // Track sync times in memory

  // Memoized progress stats
  const progressStats = useMemo(() => 
    calculateStats(visits, orders, retailers),
    [visits, orders, retailers]
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

  // Load from offline storage (ALWAYS returns local data)
  const loadFromOfflineStorage = useCallback(async (uid: string, date: string) => {
    try {
      const [cachedBeatPlans, cachedVisits, cachedRetailers, cachedOrders] = await Promise.all([
        offlineStorage.getAll<any>(STORES.BEAT_PLANS),
        offlineStorage.getAll<any>(STORES.VISITS),
        offlineStorage.getAll<any>(STORES.RETAILERS),
        offlineStorage.getAll<any>(STORES.ORDERS)
      ]);

      const filteredBeatPlans = cachedBeatPlans.filter(bp => 
        bp.user_id === uid && bp.plan_date === date
      );
      const filteredVisits = cachedVisits.filter(v => 
        v.user_id === uid && v.planned_date === date
      );
      
      const beatIds = filteredBeatPlans.map(bp => bp.beat_id);
      const visitRetailerIds = new Set(filteredVisits.map(v => v.retailer_id));
      
      // Get explicit retailer IDs from beat_data
      const explicitRetailerIds: string[] = [];
      for (const bp of filteredBeatPlans) {
        const beatData = bp.beat_data as any;
        if (beatData?.retailer_ids?.length > 0) {
          explicitRetailerIds.push(...beatData.retailer_ids);
        }
      }
      
      const filteredRetailers = cachedRetailers.filter(r => 
        r.user_id === uid && (
          beatIds.includes(r.beat_id) || 
          visitRetailerIds.has(r.id) ||
          explicitRetailerIds.includes(r.id)
        )
      );
      
      const retailerIds = new Set(filteredRetailers.map(r => r.id));
      const filteredOrders = cachedOrders.filter(o => 
        o.user_id === uid && o.order_date === date && 
        o.status === 'confirmed' && retailerIds.has(o.retailer_id)
      );

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

  // Update local state and cache
  const updateLocalState = useCallback((data: { 
    beatPlans?: any[], 
    visits?: any[], 
    retailers?: any[], 
    orders?: any[],
    points?: { total: number, byRetailer: any[] }
  }) => {
    if (data.beatPlans !== undefined) setBeatPlans(data.beatPlans);
    if (data.visits !== undefined) setVisits(data.visits);
    if (data.retailers !== undefined) setRetailers(data.retailers);
    if (data.orders !== undefined) setOrders(data.orders);
    if (data.points) {
      setPointsData({ 
        total: data.points.total, 
        byRetailer: new Map(data.points.byRetailer) 
      });
    }

    // Update in-memory cache
    const currentCache = cacheRef.current.get(selectedDate) || {};
    cacheRef.current.set(selectedDate, {
      ...currentCache,
      ...data
    });
  }, [selectedDate]);

  // DELTA SYNC: Only fetch changed records since last sync
  const deltaSyncFromNetwork = useCallback(async (uid: string, date: string) => {
    if (!navigator.onLine || !mountedRef.current) return;
    if (!shouldSyncNow(date)) {
      console.log('[DeltaSync] Skipping - synced recently');
      return;
    }

    console.log('[DeltaSync] Starting delta sync for', date);
    
    // Get last sync timestamp
    const lastSyncTimestamp = await offlineStorage.getLastSyncTimestamp('visits', uid, date);
    
    // 8-second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), 8000)
    );

    try {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      // Build queries - use delta if we have last sync time
      let beatPlansQuery = supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date);
      let visitsQuery = supabase.from('visits').select('*').eq('user_id', uid).eq('planned_date', date);
      let ordersQuery = supabase.from('orders').select('*').eq('user_id', uid).eq('order_date', date).eq('status', 'confirmed');
      let pointsQuery = supabase.from('gamification_points')
        .select('points, reference_id, reference_type, metadata')
        .eq('user_id', uid)
        .gte('earned_at', dateStart.toISOString())
        .lte('earned_at', dateEnd.toISOString());

      // Apply delta filter if we have previous sync timestamp
      if (lastSyncTimestamp) {
        beatPlansQuery = beatPlansQuery.gt('updated_at', lastSyncTimestamp);
        visitsQuery = visitsQuery.gt('updated_at', lastSyncTimestamp);
        ordersQuery = ordersQuery.gt('updated_at', lastSyncTimestamp);
      }

      const fetchPromise = Promise.all([beatPlansQuery, visitsQuery, ordersQuery, pointsQuery]);
      const [bpRes, vRes, oRes, pRes] = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (bpRes.error || vRes.error || oRes.error) {
        console.error('[DeltaSync] Query error:', bpRes.error || vRes.error || oRes.error);
        return;
      }
      if (!mountedRef.current) return;

      const newBeatPlans = bpRes.data || [];
      const newVisits = vRes.data || [];
      const newOrders = oRes.data || [];
      const pointsRawData = pRes.data || [];

      // If we have delta data, merge with existing
      const hasChanges = newBeatPlans.length > 0 || newVisits.length > 0 || newOrders.length > 0;
      
      if (hasChanges || !lastSyncTimestamp) {
        console.log(`[DeltaSync] Found changes: ${newBeatPlans.length} beat plans, ${newVisits.length} visits, ${newOrders.length} orders`);
        
        // Get current local data
        const currentBeatPlans = [...beatPlans];
        const currentVisits = [...visits];
        const currentOrders = [...orders];

        // Merge new data (upsert)
        const mergeById = <T extends { id: string }>(existing: T[], newItems: T[]): T[] => {
          const map = new Map(existing.map(item => [item.id, item]));
          newItems.forEach(item => map.set(item.id, item));
          return Array.from(map.values());
        };

        const mergedBeatPlans = lastSyncTimestamp ? mergeById(currentBeatPlans, newBeatPlans) : newBeatPlans;
        const mergedVisits = lastSyncTimestamp ? mergeById(currentVisits, newVisits) : newVisits;
        const mergedOrders = lastSyncTimestamp ? mergeById(currentOrders, newOrders) : newOrders;

        // Get retailer IDs for fetching retailers
        const beatIds = mergedBeatPlans.map(bp => bp.beat_id);
        const visitRetailerIds = mergedVisits.map(v => v.retailer_id);
        const orderRetailerIds = mergedOrders.map(o => o.retailer_id);
        
        const explicitRetailerIds: string[] = [];
        for (const bp of mergedBeatPlans) {
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
          // Always fetch ALL retailers for the beat (no delta filter - retailers are static/rarely change)
          const { data } = await supabase
            .from('retailers')
            .select('*')
            .eq('user_id', uid)
            .in('id', allRetailerIds);
          
          if (data && data.length > 0) {
            retailersData = data;
          } else {
            // Fallback to offline storage if network returns nothing
            const existingRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
            retailersData = existingRetailers.filter(r => 
              r.user_id === uid && allRetailerIds.includes(r.id)
            );
          }
        } else {
          // No retailer IDs - load from offline storage as fallback
          const existingRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
          retailersData = existingRetailers.filter(r => r.user_id === uid);
        }

        if (!mountedRef.current || lastDateRef.current !== date) return;

        // Calculate points
        const totalPoints = pointsRawData.reduce((sum, item) => sum + item.points, 0);
        const retailerPointsMap = new Map<string, { name: string; points: number; visitId: string | null }>();
        const retailerNamesMap = new Map(retailersData.map(r => [r.id, r.name]));
        
        mergedVisits.forEach(visit => {
          const retailerId = visit.retailer_id;
          const retailerPoints = pointsRawData
            .filter(p => p.reference_id === retailerId)
            .reduce((sum, p) => sum + p.points, 0);
          if (retailerPoints > 0) {
            retailerPointsMap.set(retailerId, {
              name: retailerNamesMap.get(retailerId) || 'Unknown',
              points: retailerPoints,
              visitId: visit.id
            });
          }
        });

        // STEP 1: Save to offline storage FIRST (Network → Storage)
        await Promise.all([
          offlineStorage.mergeData(STORES.BEAT_PLANS, mergedBeatPlans),
          offlineStorage.mergeData(STORES.VISITS, mergedVisits),
          offlineStorage.mergeData(STORES.RETAILERS, retailersData),
          offlineStorage.mergeData(STORES.ORDERS, mergedOrders)
        ]);

        // STEP 2: Update in-memory cache
        const cacheData = {
          beatPlans: mergedBeatPlans,
          visits: mergedVisits,
          retailers: retailersData,
          orders: mergedOrders,
          points: { total: totalPoints, byRetailer: Array.from(retailerPointsMap.entries()) }
        };
        cacheRef.current.set(date, cacheData);

        // STEP 3: Save snapshot for persistence
        await saveMyVisitsSnapshot(uid, date, {
          beatPlans: mergedBeatPlans,
          visits: mergedVisits,
          retailers: retailersData,
          orders: mergedOrders,
          progressStats: calculateStats(mergedVisits, mergedOrders, retailersData),
          currentBeatName: mergedBeatPlans.map(p => p.beat_name).join(', ')
        });

        // STEP 4: Update UI from the stable cache (Storage → UI)
        // This ensures UI only updates from verified local data, not raw network response
        if (mountedRef.current && lastDateRef.current === date) {
          setBeatPlans(cacheData.beatPlans);
          setVisits(cacheData.visits);
          setRetailers(cacheData.retailers);
          setOrders(cacheData.orders);
          setPointsData({ total: totalPoints, byRetailer: retailerPointsMap });
        }
      }

      // Update sync timestamp
      lastSyncTimeRef.current.set(date, Date.now());
      await offlineStorage.setSyncMetadata('visits', uid, date);
      console.log('[DeltaSync] Complete');

    } catch (e) {
      console.log('[DeltaSync] Error or timeout:', e);
    }
  }, [beatPlans, visits, retailers, orders, shouldSyncNow]);

  // Main load function - ALWAYS LOCAL FIRST, NEVER WAITS FOR NETWORK
  const loadData = useCallback(async () => {
    if (!userId || !selectedDate) return;
    if (isFetchingRef.current && lastDateRef.current === selectedDate) return;
    
    isFetchingRef.current = true;
    lastDateRef.current = selectedDate;

    // 1. Try in-memory cache FIRST (instant)
    const cached = cacheRef.current.get(selectedDate);
    if (cached) {
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
      
      // Background delta sync - never blocks
      if (navigator.onLine && isToday(selectedDate) && shouldSyncNow(selectedDate)) {
        requestIdleCallback?.(() => deltaSyncFromNetwork(userId, selectedDate)) || 
          setTimeout(() => deltaSyncFromNetwork(userId, selectedDate), 100);
      }
      isFetchingRef.current = false;
      return;
    }

    // 2. Try persistent snapshot (fast)
    try {
      const snapshot = await loadMyVisitsSnapshot(userId, selectedDate);
      if (snapshot) {
        setBeatPlans(snapshot.beatPlans || []);
        setVisits(snapshot.visits || []);
        setRetailers(snapshot.retailers || []);
        setOrders(snapshot.orders || []);
        setIsLoading(false);
        setHasLoadedOnce(true);
        
        cacheRef.current.set(selectedDate, snapshot);
        
        // Background delta sync - never blocks
        if (navigator.onLine && isToday(selectedDate) && shouldSyncNow(selectedDate)) {
          requestIdleCallback?.(() => deltaSyncFromNetwork(userId, selectedDate)) || 
            setTimeout(() => deltaSyncFromNetwork(userId, selectedDate), 100);
        }
        isFetchingRef.current = false;
        return;
      }
    } catch (e) {
      // Continue to offline storage
    }

    // 3. Try offline storage
    const offlineData = await loadFromOfflineStorage(userId, selectedDate);
    if (offlineData && (offlineData.retailers.length > 0 || offlineData.beatPlans.length > 0 || offlineData.visits.length > 0)) {
      setBeatPlans(offlineData.beatPlans);
      setVisits(offlineData.visits);
      setRetailers(offlineData.retailers);
      setOrders(offlineData.orders);
      setIsLoading(false);
      setHasLoadedOnce(true);
      
      cacheRef.current.set(selectedDate, offlineData);
      
      // Background delta sync - never blocks
      if (navigator.onLine && shouldSyncNow(selectedDate)) {
        requestIdleCallback?.(() => deltaSyncFromNetwork(userId, selectedDate)) || 
          setTimeout(() => deltaSyncFromNetwork(userId, selectedDate), 100);
      }
      isFetchingRef.current = false;
      return;
    }

    // 4. No local data found - need to do full sync (only case where we wait)
    if (navigator.onLine) {
      // Do a full initial sync since we have no local data
      try {
        setIsLoading(true);
        await deltaSyncFromNetwork(userId, selectedDate);
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
  }, [userId, selectedDate, isToday, loadFromOfflineStorage, deltaSyncFromNetwork, shouldSyncNow]);

  // Invalidate cache for date and reload from local
  const invalidateData = useCallback(async () => {
    cacheRef.current.delete(selectedDate);
    lastSyncTimeRef.current.delete(selectedDate); // Allow immediate sync
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
        deltaSyncFromNetwork(userId, selectedDate);
      }
    }
  }, [selectedDate, userId, loadFromOfflineStorage, deltaSyncFromNetwork]);

  // Load on mount and date change
  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  // Listen for events - UPDATE LOCAL STATE DIRECTLY without network reload
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { visitId, status, retailerId, order, noOrderReason } = event.detail || {};
      if (!visitId && !retailerId) return;
      
      console.log('[StatusChange] Processing event:', { visitId, status, retailerId, noOrderReason });
      
      // Update visits state directly - NO NETWORK CALL
      setVisits(prev => {
        // Check if visit exists
        const existingVisit = prev.find(v => 
          (visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)
        );
        
        let updated;
        if (existingVisit) {
          // Update existing visit
          updated = prev.map(v => {
            if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
              return { 
                ...v, 
                status: status || v.status,
                no_order_reason: noOrderReason || v.no_order_reason 
              };
            }
            return v;
          });
        } else if (retailerId && status) {
          // Create new visit entry for UI if doesn't exist
          const newVisit = {
            id: visitId || `temp_${retailerId}_${Date.now()}`,
            retailer_id: retailerId,
            user_id: userId,
            planned_date: selectedDate,
            status,
            no_order_reason: noOrderReason,
            created_at: new Date().toISOString()
          };
          updated = [...prev, newVisit];
          console.log('[StatusChange] Created new visit for UI:', newVisit.id);
        } else {
          updated = prev;
        }
        
        // Update in-memory cache
        const cached = cacheRef.current.get(selectedDate);
        if (cached) {
          cacheRef.current.set(selectedDate, { ...cached, visits: updated });
        }
        
        // Persist to offline storage
        updated.forEach(v => {
          if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
            offlineStorage.save(STORES.VISITS, v).catch(() => {});
          }
        });
        
        return updated;
      });

      // If order data is included, update orders too
      if (order) {
        setOrders(prev => {
          const existing = prev.find(o => o.id === order.id);
          let updated;
          if (existing) {
            updated = prev.map(o => o.id === order.id ? order : o);
          } else {
            updated = [...prev, order];
          }
          
          // Update cache
          const cached = cacheRef.current.get(selectedDate);
          if (cached) {
            cacheRef.current.set(selectedDate, { ...cached, orders: updated });
          }
          
          // Persist
          offlineStorage.save(STORES.ORDERS, order).catch(() => {});
          
          return updated;
        });
      }
    };

    const handleDataChange = () => {
      // Reload from cache only, not network
      const cached = cacheRef.current.get(selectedDate);
      if (cached) {
        setBeatPlans(cached.beatPlans || []);
        setVisits(cached.visits || []);
        setRetailers(cached.retailers || []);
        setOrders(cached.orders || []);
      }
    };

    const handleSync = () => {
      // After sync complete, do delta sync only for today
      if (isToday(selectedDate) && navigator.onLine && shouldSyncNow(selectedDate)) {
        setTimeout(() => deltaSyncFromNetwork(userId!, selectedDate), 500);
      }
    };

    // Visibility change - sync when app comes to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && isToday(selectedDate) && shouldSyncNow(selectedDate)) {
        setTimeout(() => deltaSyncFromNetwork(userId!, selectedDate), 500);
      }
    };

    // Master data refreshed - reload UI from updated local storage
    const handleMasterDataRefresh = async () => {
      if (!userId) return;
      console.log('[MasterDataRefresh] Reloading UI from updated local storage');
      
      const offlineData = await loadFromOfflineStorage(userId, selectedDate);
      if (offlineData) {
        setBeatPlans(offlineData.beatPlans);
        setVisits(offlineData.visits);
        setRetailers(offlineData.retailers);
        setOrders(offlineData.orders);
        cacheRef.current.set(selectedDate, offlineData);
      }
    };

    // Retailer added - add to local state immediately
    const handleRetailerAdded = (event: CustomEvent) => {
      const { retailer } = event.detail || {};
      if (!retailer || retailer.user_id !== userId) return;
      
      console.log('[RetailerAdded] Adding new retailer to local state:', retailer.name);
      setRetailers(prev => {
        const exists = prev.some(r => r.id === retailer.id);
        if (exists) return prev;
        const updated = [...prev, retailer];
        
        // Update cache
        const cached = cacheRef.current.get(selectedDate);
        if (cached) {
          cacheRef.current.set(selectedDate, { ...cached, retailers: updated });
        }
        
        return updated;
      });
    };

    window.addEventListener('visitStatusChanged', handleStatusChange as EventListener);
    window.addEventListener('visitDataChanged', handleDataChange);
    window.addEventListener('syncComplete', handleSync);
    window.addEventListener('masterDataRefreshed', handleMasterDataRefresh);
    window.addEventListener('retailerAdded', handleRetailerAdded as EventListener);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange as EventListener);
      window.removeEventListener('visitDataChanged', handleDataChange);
      window.removeEventListener('syncComplete', handleSync);
      window.removeEventListener('masterDataRefreshed', handleMasterDataRefresh);
      window.removeEventListener('retailerAdded', handleRetailerAdded as EventListener);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedDate, isToday, userId, deltaSyncFromNetwork, shouldSyncNow]);

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