import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';

interface UseVisitsDataOptimizedProps {
  userId: string | undefined;
  selectedDate: string;
}

export const useVisitsDataOptimized = ({ userId, selectedDate }: UseVisitsDataOptimizedProps) => {
  const [beatPlans, setBeatPlans] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // CACHE-FIRST LOADING: Load from cache immediately, sync in background
  const loadData = useCallback(async () => {
    if (!userId || !selectedDate) return;

    setIsLoading(true);
    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from IndexedDB immediately (instant)
      const cachedBeatPlans = await offlineStorage.getAll<any>(STORES.BEAT_PLANS);
      const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
      const cachedRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
      const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);

      const filteredBeatPlans = cachedBeatPlans.filter(
        (plan: any) => plan.user_id === userId && plan.plan_date === selectedDate
      );
      const filteredVisits = cachedVisits.filter(
        (v: any) => v.user_id === userId && v.planned_date === selectedDate
      );
      const filteredRetailers = cachedRetailers.filter(
        (r: any) => r.user_id === userId
      );

      // Filter orders by date
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);

      const filteredOrders = cachedOrders.filter((o: any) => {
        const orderDate = new Date(o.created_at);
        return o.user_id === userId && orderDate >= dateStart && orderDate <= dateEnd;
      });

      // Display cached data immediately
      if (
        filteredBeatPlans.length > 0 ||
        filteredVisits.length > 0 ||
        filteredRetailers.length > 0
      ) {
        setBeatPlans(filteredBeatPlans);
        setVisits(filteredVisits);
        setRetailers(filteredRetailers);
        setOrders(filteredOrders);
        setIsLoading(false);
        hasLoadedFromCache = true;
        console.log('✅ Loaded from cache instantly');
      }
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        // Fetch beat plans
        const { data: beatPlansData, error: beatPlansError } = await supabase
          .from('beat_plans')
          .select('*')
          .eq('user_id', userId)
          .eq('plan_date', selectedDate);

        if (beatPlansError) throw beatPlansError;

        // Fetch visits
        const { data: visitsData, error: visitsError } = await supabase
          .from('visits')
          .select('*')
          .eq('user_id', userId)
          .eq('planned_date', selectedDate);

        if (visitsError) throw visitsError;

        // Get all retailer IDs we need
        const visitRetailerIds = (visitsData || []).map((v: any) => v.retailer_id);
        const plannedBeatIds = (beatPlansData || []).map((bp: any) => bp.beat_id);

        let plannedRetailerIds: string[] = [];
        if (plannedBeatIds.length > 0) {
          const { data: plannedRetailers } = await supabase
            .from('retailers')
            .select('id')
            .eq('user_id', userId)
            .in('beat_id', plannedBeatIds);

          plannedRetailerIds = (plannedRetailers || []).map((r: any) => r.id);
        }

        const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds]));

        let retailersData: any[] = [];
        let ordersData: any[] = [];

        if (allRetailerIds.length > 0) {
          // Fetch retailers with pending amount calculation
          const { data: fetchedRetailers, error: retailersError } = await supabase
            .from('retailers')
            .select(`
              *,
              orders!inner(pending_amount, created_at)
            `)
            .eq('user_id', userId)
            .in('id', allRetailerIds);

          if (retailersError) throw retailersError;
          retailersData = fetchedRetailers || [];

          // Fetch orders for the selected date
          const dateStart = new Date(selectedDate);
          dateStart.setHours(0, 0, 0, 0);
          const dateEnd = new Date(selectedDate);
          dateEnd.setHours(23, 59, 59, 999);

          const { data: fetchedOrders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'confirmed')
            .in('retailer_id', allRetailerIds)
            .gte('created_at', dateStart.toISOString())
            .lte('created_at', dateEnd.toISOString());

          if (ordersError) throw ordersError;
          ordersData = fetchedOrders || [];
        }

        // Cache the fresh data
        for (const plan of beatPlansData || []) {
          await offlineStorage.save(STORES.BEAT_PLANS, plan);
        }
        for (const visit of visitsData || []) {
          await offlineStorage.save(STORES.VISITS, visit);
        }
        for (const retailer of retailersData) {
          await offlineStorage.save(STORES.RETAILERS, retailer);
        }
        for (const order of ordersData) {
          await offlineStorage.save(STORES.ORDERS, order);
        }

        // Update state with fresh data
        setBeatPlans(beatPlansData || []);
        setVisits(visitsData || []);
        setRetailers(retailersData);
        setOrders(ordersData);
        setIsLoading(false);
        setError(null);
        console.log('🔄 Updated with fresh data from network');
      } catch (networkError) {
        console.log('Network sync failed, using cached data:', networkError);
        if (!hasLoadedFromCache) {
          setError(networkError);
          setIsLoading(false);
        }
      }
    } else {
      // Offline mode
      if (!hasLoadedFromCache) {
        console.log('📴 Offline and no cache available');
        setIsLoading(false);
      }
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const invalidateData = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    beatPlans,
    visits,
    retailers,
    orders,
    isLoading,
    error,
    invalidateData,
  };
};
