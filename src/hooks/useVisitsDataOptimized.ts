import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
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
  const [isLoading, setIsLoading] = useState(true); // Start true to prevent flash of empty state
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if we've ever loaded data
  const [error, setError] = useState<any>(null);

  const lastDateRef = useRef<string>('');
  const cacheRef = useRef<Map<string, any>>(new Map());
  const isFetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Memoized progress stats - recalculates only when data changes
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

  // Load from offline storage
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

  // Background network sync - NEVER blocks UI, has timeout
  const syncFromNetwork = useCallback(async (uid: string, date: string, updateLoadingState = false) => {
    if (!navigator.onLine || !mountedRef.current) {
      if (updateLoadingState) {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
      return;
    }
    
    // 8-second timeout to prevent slow network blocking
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), 8000)
    );
    
    try {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const fetchPromise = Promise.all([
        supabase.from('beat_plans').select('*').eq('user_id', uid).eq('plan_date', date),
        supabase.from('visits').select('*').eq('user_id', uid).eq('planned_date', date),
        supabase.from('orders').select('*').eq('user_id', uid).eq('order_date', date).eq('status', 'confirmed'),
        supabase.from('gamification_points')
          .select('points, reference_id, reference_type, metadata')
          .eq('user_id', uid)
          .gte('earned_at', dateStart.toISOString())
          .lte('earned_at', dateEnd.toISOString())
      ]);

      const [bpRes, vRes, oRes, pRes] = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (bpRes.error || vRes.error || oRes.error) {
        if (updateLoadingState) {
          setIsLoading(false);
          setHasLoadedOnce(true);
        }
        return;
      }
      if (!mountedRef.current) return;

      const beatPlansData = bpRes.data || [];
      const visitsData = vRes.data || [];
      const ordersData = oRes.data || [];
      const pointsRawData = pRes.data || [];

      // Get retailer IDs
      const beatIds = beatPlansData.map(bp => bp.beat_id);
      const visitRetailerIds = visitsData.map(v => v.retailer_id);
      const orderRetailerIds = ordersData.map(o => o.retailer_id);
      
      // Get explicit retailer IDs from beat_data
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

      // Calculate points
      const totalPoints = pointsRawData.reduce((sum, item) => sum + item.points, 0);
      const retailerPointsMap = new Map<string, { name: string; points: number; visitId: string | null }>();
      const retailerNamesMap = new Map(retailersData.map(r => [r.id, r.name]));
      
      visitsData.forEach(visit => {
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

      // Update state
      setBeatPlans(beatPlansData);
      setVisits(visitsData);
      setRetailers(retailersData);
      setOrders(ordersData);
      setPointsData({ total: totalPoints, byRetailer: retailerPointsMap });

      // Update cache
      const cacheData = {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        points: { total: totalPoints, byRetailer: Array.from(retailerPointsMap.entries()) }
      };
      cacheRef.current.set(date, cacheData);

      // Save snapshot
      saveMyVisitsSnapshot(uid, date, {
        beatPlans: beatPlansData,
        visits: visitsData,
        retailers: retailersData,
        orders: ordersData,
        progressStats: calculateStats(visitsData, ordersData, retailersData),
        currentBeatName: beatPlansData.map(p => p.beat_name).join(', ')
      }).catch(() => {});

      // Update offline storage in background
      Promise.all([
        ...beatPlansData.map(plan => offlineStorage.save(STORES.BEAT_PLANS, plan)),
        ...visitsData.map(visit => offlineStorage.save(STORES.VISITS, visit)),
        ...retailersData.map(retailer => offlineStorage.save(STORES.RETAILERS, retailer)),
        ...ordersData.map(order => offlineStorage.save(STORES.ORDERS, order))
      ]).catch(() => {});

    } catch (e) {
      console.log('Network sync timeout or error:', e);
    } finally {
      if (updateLoadingState) {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    }
  }, []);

  // Main load function - ALWAYS cache first, network NEVER blocks
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
      
      // Background sync only - never blocks
      if (navigator.onLine && isToday(selectedDate)) {
        setTimeout(() => syncFromNetwork(userId, selectedDate, false), 100);
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
        
        // Background sync only - never blocks
        if (navigator.onLine && isToday(selectedDate)) {
          setTimeout(() => syncFromNetwork(userId, selectedDate, false), 100);
        }
        isFetchingRef.current = false;
        return;
      }
    } catch (e) {
      // Continue to offline storage
    }

    // 3. Try offline storage
    const offlineData = await loadFromOfflineStorage(userId, selectedDate);
    if (offlineData && (offlineData.retailers.length > 0 || offlineData.beatPlans.length > 0)) {
      setBeatPlans(offlineData.beatPlans);
      setVisits(offlineData.visits);
      setRetailers(offlineData.retailers);
      setOrders(offlineData.orders);
      setIsLoading(false);
      setHasLoadedOnce(true);
      
      cacheRef.current.set(selectedDate, offlineData);
      
      // Background sync only - never blocks
      if (navigator.onLine) {
        setTimeout(() => syncFromNetwork(userId, selectedDate, false), 100);
      }
      isFetchingRef.current = false;
      return;
    }

    // 4. No cache found - start network sync in background, don't wait
    // Show loading state but let network complete asynchronously
    if (navigator.onLine) {
      // Fire network sync but don't await - let it update loading state when done
      syncFromNetwork(userId, selectedDate, true);
    } else {
      // No cache, no network - show empty state
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
    
    isFetchingRef.current = false;
  }, [userId, selectedDate, isToday, loadFromOfflineStorage, syncFromNetwork]);

  // Invalidate and reload
  const invalidateData = useCallback(() => {
    cacheRef.current.delete(selectedDate);
    isFetchingRef.current = false;
    loadData();
  }, [selectedDate, loadData]);

  // Load on mount and date change
  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  // Listen for events - UPDATE LOCAL STATE DIRECTLY without network reload
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      const { visitId, status, retailerId } = event.detail || {};
      if (!visitId && !retailerId) return;
      
      // Update visits state directly from event data - NO NETWORK CALL
      setVisits(prev => {
        const updated = prev.map(v => {
          if ((visitId && v.id === visitId) || (retailerId && v.retailer_id === retailerId)) {
            return { ...v, status: status || v.status };
          }
          return v;
        });
        
        // Update in-memory cache with new data
        const cached = cacheRef.current.get(selectedDate);
        if (cached) {
          cacheRef.current.set(selectedDate, { ...cached, visits: updated });
        }
        
        return updated;
      });
    };

    const handleDataChange = () => {
      // Only reload from cache, not network
      const cached = cacheRef.current.get(selectedDate);
      if (cached) {
        setBeatPlans(cached.beatPlans || []);
        setVisits(cached.visits || []);
        setRetailers(cached.retailers || []);
        setOrders(cached.orders || []);
      }
    };

    const handleSync = () => {
      // After sync, do a silent background refresh only for today
      if (isToday(selectedDate) && navigator.onLine) {
        setTimeout(() => syncFromNetwork(userId!, selectedDate, false), 500);
      }
    };

    window.addEventListener('visitStatusChanged', handleStatusChange as EventListener);
    window.addEventListener('visitDataChanged', handleDataChange);
    window.addEventListener('syncComplete', handleSync);

    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange as EventListener);
      window.removeEventListener('visitDataChanged', handleDataChange);
      window.removeEventListener('syncComplete', handleSync);
    };
  }, [selectedDate, isToday, userId, syncFromNetwork]);

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
