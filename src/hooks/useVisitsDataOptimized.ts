import { useState, useEffect, useCallback } from 'react';
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

      // Filter orders by date first
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);

      const filteredOrders = cachedOrders.filter((o: any) => {
        const orderDate = new Date(o.created_at);
        return o.user_id === userId && o.status === 'confirmed' && orderDate >= dateStart && orderDate <= dateEnd;
      });

      // Get retailer IDs from visits, planned beats, AND orders
      const visitRetailerIds = filteredVisits.map((v: any) => v.retailer_id);
      const plannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);
      const plannedRetailerIds = cachedRetailers
        .filter((r: any) => r.user_id === userId && plannedBeatIds.includes(r.beat_id))
        .map((r: any) => r.id);
      const orderRetailerIds = filteredOrders.map((o: any) => o.retailer_id);
      
      // Combine all retailer IDs: from visits, planned beats, AND orders
      const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));
      
      const filteredRetailers = cachedRetailers.filter(
        (r: any) => allRetailerIds.includes(r.id)
      );

      // Display cached data immediately
      if (
        filteredBeatPlans.length > 0 ||
        filteredVisits.length > 0
      ) {
        // Calculate progress stats from cached data immediately
        const ordersByRetailer = new Map<string, number>();
        filteredOrders.forEach((o: any) => {
          ordersByRetailer.set(o.retailer_id, (ordersByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });

        const progressPlannedBeatIds = filteredBeatPlans.map((bp: any) => bp.beat_id);

        let planned = 0;
        let productive = 0;
        let unproductive = 0;
        let totalOrders = filteredOrders.length;
        let totalOrderValue = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);

        filteredVisits.forEach((visit: any) => {
          const orderValue = ordersByRetailer.get(visit.retailer_id) || 0;
          const hasOrder = orderValue > 0;
          
          // Check visit status directly from the visit record
          if (visit.status === 'unproductive' || (visit.no_order_reason && !hasOrder)) {
            unproductive++;
          } else if (hasOrder || visit.status === 'productive') {
            productive++;
          } else if (visit.status === 'planned' || !visit.check_in_time) {
            planned++;
          }
        });

        setProgressStats({ planned, productive, unproductive, totalOrders, totalOrderValue });
        console.log('📊 [CACHE] Progress stats calculated from cache:', { 
          planned, 
          productive, 
          unproductive, 
          totalOrders, 
          totalOrderValue,
          selectedDate,
          visitsCount: filteredVisits.length,
          ordersCount: filteredOrders.length,
          timestamp: new Date().toISOString()
        });
      }
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
            .select('id, retailer_id, status, no_order_reason, planned_date, user_id, check_in_time, retailers(name)')
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

        if (beatPlansResult.error) throw beatPlansResult.error;
        if (visitsResult.error) throw visitsResult.error;
        if (pointsResult.error) throw pointsResult.error;

        const beatPlansData = beatPlansResult.data || [];
        const visitsData = visitsResult.data || [];
        const pointsRawData = pointsResult.data || [];

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

        // IMPORTANT: Also fetch orders for today to get retailer IDs from orders
        // This ensures retailers with orders show up even if not in planned beats or visits
        const { data: ordersForToday } = await supabase
          .from('orders')
          .select('retailer_id')
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .gte('created_at', `${selectedDate}T00:00:00.000Z`)
          .lte('created_at', `${selectedDate}T23:59:59.999Z`);

        const orderRetailerIds = (ordersForToday || []).map((o: any) => o.retailer_id);

        // Combine all retailer IDs: from visits, planned beats, AND orders
        const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds, ...orderRetailerIds]));

        let retailersData: any[] = [];
        let ordersData: any[] = [];

        if (allRetailerIds.length > 0) {
          // Fetch retailers and full order details in parallel
          const [retailersResult, ordersResult] = await Promise.all([
            supabase
              .from('retailers')
              .select('id, name, address, phone, category, parent_name, potential, user_id, beat_id, credit_limit, outstanding_amount')
              .in('id', allRetailerIds),
            supabase
              .from('orders')
              .select('id, retailer_id, total_amount, status, created_at, user_id')
              .eq('user_id', userId)
              .eq('status', 'confirmed')
              .in('retailer_id', allRetailerIds)
              .gte('created_at', `${selectedDate}T00:00:00.000Z`)
              .lte('created_at', `${selectedDate}T23:59:59.999Z`)
          ]);

          if (retailersResult.error) throw retailersResult.error;
          if (ordersResult.error) throw ordersResult.error;

          retailersData = retailersResult.data || [];
          ordersData = ordersResult.data || [];
        }

        // Process points data into efficient structure
        const totalPoints = pointsRawData.reduce((sum, item) => sum + item.points, 0);
        const retailerPointsMap = new Map<string, { name: string; points: number; visitId: string | null }>();
        
        visitsData.forEach((visit: any) => {
          const retailerId = visit.retailer_id;
          const retailerPoints = pointsRawData
            .filter((p: any) => p.reference_id === retailerId)
            .reduce((sum, p) => sum + p.points, 0);
          
          if (retailerPoints > 0) {
            retailerPointsMap.set(retailerId, {
              name: visit.retailers?.name || 'Unknown Retailer',
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

        // Process visits directly to ensure all visits are counted
        visitsData.forEach((visit: any) => {
          const hasOrder = ordersMap.has(visit.retailer_id);
          
          // Check visit status directly - match cache section logic
          if (visit.status === 'unproductive' || (visit.no_order_reason && !hasOrder)) {
            unproductive++;
          } else if (hasOrder || visit.status === 'productive') {
            productive++;
          } else if (visit.status === 'planned' || !visit.check_in_time) {
            planned++;
          }
        });

        setProgressStats({ planned, productive, unproductive, totalOrders, totalOrderValue });
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

        // Cache ONLY current date data (don't bloat storage with historical data)
        // Beat plans and retailers are already cached by useMasterDataCache
        // Only cache visits for current date
        await Promise.all([
          ...visitsData.map(visit => offlineStorage.save(STORES.VISITS, visit))
        ]);
        
        console.log('[VisitsData] ✅ Cached current date visits only (not storing orders/beat plans to save storage)');

        // Update state with fresh data
        setBeatPlans(beatPlansData);
        setVisits(visitsData);
        setRetailers(retailersData);
        setOrders(ordersData);
        
        console.log('🔄 [NETWORK] State updated with fresh data:', {
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
    console.log('🔄 useVisitsDataOptimized: Setting up data loading for date:', selectedDate);
    loadData();

    // Listen for manual refresh events
    const handleRefresh = () => {
      console.log('🔄 visitDataChanged event received! Refreshing data for date:', selectedDate);
      // Add small delay to ensure any database writes are complete
      setTimeout(() => {
        loadData();
      }, 500);
    };
    
    window.addEventListener('visitDataChanged', handleRefresh);
    
    return () => {
      window.removeEventListener('visitDataChanged', handleRefresh);
    };
  }, [loadData, selectedDate]);

  const invalidateData = useCallback(() => {
    loadData();
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
