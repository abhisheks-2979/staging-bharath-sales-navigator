// OPTIMIZED DATA LOADING FUNCTIONS FOR MY VISITS
// This file contains cache-first loading logic for instant performance

import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { shouldSuppressError } from '@/utils/offlineErrorHandler';
import { toast } from 'sonner';

// CACHE-FIRST load planned beats (instant display)
export const loadPlannedBeatsOptimized = async (
  user: any,
  date: string,
  setPlannedBeats: (beats: any[]) => void,
  setCurrentBeatName: (name: string) => void,
  loadAllVisitsForDate: (date: string, beatPlans: any[], preserveOrder?: boolean) => Promise<void>,
  preserveOrder: boolean = false
) => {
  if (!user) return;
  try {
    let beatPlans: any[] = [];
    let hasLoadedFromCache = false;

    // STEP 1: Load from cache immediately (instant)
    try {
      const cachedPlans = await offlineStorage.getAll<any>(STORES.BEAT_PLANS);
      beatPlans = cachedPlans.filter(
        (p: any) => p.user_id === user.id && p.plan_date === date
      );
      
      if (beatPlans.length > 0) {
        setPlannedBeats(beatPlans);
        const beatNames = beatPlans.map(plan => plan.beat_name).join(', ');
        setCurrentBeatName(beatNames);
        await loadAllVisitsForDate(date, beatPlans, preserveOrder);
        hasLoadedFromCache = true;
        console.log('✅ Beats loaded from cache instantly');
      }
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('beat_plans')
          .select('*')
          .eq('user_id', user.id)
          .eq('plan_date', date);
        
        if (error) throw error;
        beatPlans = data || [];
        
        // Cache for next time
        for (const plan of beatPlans) {
          await offlineStorage.save(STORES.BEAT_PLANS, plan);
        }
        
        // Update UI with fresh data
        setPlannedBeats(beatPlans);
        if (beatPlans.length > 0) {
          const beatNames = beatPlans.map(plan => plan.beat_name).join(', ');
          setCurrentBeatName(beatNames);
        } else {
          setCurrentBeatName("No beats planned");
        }
        await loadAllVisitsForDate(date, beatPlans, preserveOrder);
        console.log('🔄 Beats updated from network');
      } catch (networkError) {
        console.log('Network sync failed, using cached data:', networkError);
        if (!hasLoadedFromCache && !shouldSuppressError(networkError)) {
          toast.error('Failed to load beat plans');
        }
      }
    } else {
      // Offline - show what we have
      if (!hasLoadedFromCache) {
        setCurrentBeatName("No beats planned");
        await loadAllVisitsForDate(date, [], preserveOrder);
      }
    }
  } catch (error) {
    if (!shouldSuppressError(error)) {
      console.error('Error loading beat plans:', error);
    }
  }
};

// CACHE-FIRST load all visits for date (instant display)
export const loadAllVisitsForDateOptimized = async (
  user: any,
  date: string,
  beatPlans: any[],
  setRetailers: (retailers: any[]) => void,
  setRetailerStats: (stats: Map<string, any>) => void,
  setInitialRetailerOrder: (order: string[]) => void,
  preserveOrder: boolean = false
) => {
  if (!user) return;
  try {
    const selectedDateObj = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDateObj.setHours(0, 0, 0, 0);
    const isFutureDate = selectedDateObj > today;

    const plannedBeatIds = beatPlans.map(plan => plan.beat_id);
    
    let visits: any[] = [];
    let retailersData: any[] = [];
    let ordersForDate: any[] = [];
    let hasLoadedFromCache = false;

    // STEP 1: Load from cache immediately (instant)
    try {
      const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
      visits = cachedVisits.filter(
        (v: any) => v.user_id === user.id && v.planned_date === date
      );

      const cachedRetailers = await offlineStorage.getAll<any>(STORES.RETAILERS);
      const visitRetailerIds = visits.map(v => v.retailer_id);
      const plannedRetailers = cachedRetailers.filter((r: any) =>
        r.user_id === user.id && plannedBeatIds.includes(r.beat_id)
      );
      const plannedRetailerIds = plannedRetailers.map(r => r.id);
      const allRetailerIds = Array.from(new Set([...visitRetailerIds, ...plannedRetailerIds]));

      retailersData = cachedRetailers.filter((r: any) =>
        allRetailerIds.includes(r.id)
      );

      if (!isFutureDate) {
        const cachedOrders = await offlineStorage.getAll<any>(STORES.ORDERS);
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        ordersForDate = cachedOrders.filter((o: any) => {
          const orderDate = new Date(o.created_at);
          return (
            o.user_id === user.id &&
            allRetailerIds.includes(o.retailer_id) &&
            orderDate >= dateStart &&
            orderDate <= dateEnd
          );
        });
      }

      // Display cached data immediately
      if (retailersData.length > 0) {
        processAndSetRetailers(
          visits,
          retailersData,
          ordersForDate,
          beatPlans,
          date,
          isFutureDate,
          setRetailers,
          setRetailerStats,
          setInitialRetailerOrder,
          preserveOrder
        );
        hasLoadedFromCache = true;
        console.log('✅ Retailers loaded from cache instantly');
      }
    } catch (cacheError) {
      console.log('Cache read error (non-critical):', cacheError);
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        const [visitsResult, plannedRetailersResult] = await Promise.all([
          supabase.from('visits').select('*').eq('user_id', user.id).eq('planned_date', date),
          plannedBeatIds.length > 0
            ? supabase.from('retailers').select('id').eq('user_id', user.id).in('beat_id', plannedBeatIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (visitsResult.error) throw visitsResult.error;
        visits = visitsResult.data || [];
        const plannedRetailersData = plannedRetailersResult.data || [];

        // Cache visits
        for (const visit of visits) {
          await offlineStorage.save(STORES.VISITS, visit);
        }

        // Get all retailer IDs
        const visitRetailerIds = visits.map(v => v.retailer_id);
        const allRetailerIds = Array.from(
          new Set([...visitRetailerIds, ...plannedRetailersData.map(r => r.id)])
        );

        if (allRetailerIds.length > 0) {
          const dateStart = new Date(date);
          dateStart.setHours(0, 0, 0, 0);
          const dateEnd = new Date(date);
          dateEnd.setHours(23, 59, 59, 999);

          const [retailersResult, ordersResult] = await Promise.all([
            supabase.from('retailers').select('*').eq('user_id', user.id).in('id', allRetailerIds),
            !isFutureDate
              ? supabase
                  .from('orders')
                  .select('id, retailer_id, total_amount, pending_amount, created_at')
                  .eq('user_id', user.id)
                  .eq('status', 'confirmed')
                  .in('retailer_id', allRetailerIds)
                  .gte('created_at', dateStart.toISOString())
                  .lte('created_at', dateEnd.toISOString())
              : Promise.resolve({ data: [], error: null }),
          ]);

          if (retailersResult.error) throw retailersResult.error;
          retailersData = retailersResult.data || [];
          ordersForDate = ordersResult.data || [];

          // Cache retailers and orders
          for (const retailer of retailersData) {
            await offlineStorage.save(STORES.RETAILERS, retailer);
          }
          for (const order of ordersForDate) {
            await offlineStorage.save(STORES.ORDERS, order);
          }

          // Update UI with fresh data
          processAndSetRetailers(
            visits,
            retailersData,
            ordersForDate,
            beatPlans,
            date,
            isFutureDate,
            setRetailers,
            setRetailerStats,
            setInitialRetailerOrder,
            preserveOrder
          );
          console.log('🔄 Retailers updated from network');
        } else {
          setRetailers([]);
          setRetailerStats(new Map());
          setInitialRetailerOrder([]);
        }
      } catch (networkError) {
        console.log('Network sync failed, using cached data:', networkError);
        if (!hasLoadedFromCache && !shouldSuppressError(networkError)) {
          toast.error('Failed to load visits');
        }
      }
    }
  } catch (error) {
    if (!shouldSuppressError(error)) {
      console.error('Failed to load visits data:', error);
    }
  }
};

// Helper function to process and set retailers
const processAndSetRetailers = (
  visits: any[],
  retailersData: any[],
  ordersForDate: any[],
  beatPlans: any[],
  date: string,
  isFutureDate: boolean,
  setRetailers: (retailers: any[]) => void,
  setRetailerStats: (stats: Map<string, any>) => void,
  setInitialRetailerOrder: (order: string[]) => void,
  preserveOrder: boolean
) => {
  const plannedBeatIds = beatPlans.map(plan => plan.beat_id);
  
  // Create order map
  const orderMap = new Map();
  ordersForDate.forEach(order => {
    const existing = orderMap.get(order.retailer_id);
    orderMap.set(order.retailer_id, {
      value: (existing?.value || 0) + Number(order.total_amount || 0),
      pending: (existing?.pending || 0) + Number(order.pending_amount || 0),
    });
  });

  // Create visit status map
  const visitMap = new Map();
  visits.forEach(v => {
    visitMap.set(v.retailer_id, v);
  });

  // Process retailers with enriched data
  const enrichedRetailers = retailersData.map(r => {
    const visit = visitMap.get(r.id);
    const order = orderMap.get(r.id);
    const isPlanned = plannedBeatIds.includes(r.beat_id);
    const beatName = beatPlans.find(bp => bp.beat_id === r.beat_id)?.beat_name || '';

    return {
      ...r,
      hasOrder: !!order,
      orderValue: order?.value || 0,
      pendingAmount: order?.pending || 0,
      status: visit?.status || (isPlanned ? 'planned' : 'not-visited'),
      visitId: visit?.id,
      checkInTime: visit?.check_in_time,
      checkOutTime: visit?.check_out_time,
      noOrderReason: visit?.no_order_reason,
      isPlanned,
      beatName,
      location: {
        latitude: r.latitude,
        longitude: r.longitude,
      },
    };
  });

  if (!preserveOrder) {
    setRetailers(enrichedRetailers);
    setInitialRetailerOrder(enrichedRetailers.map(r => r.id));
  }

  // Update stats
  const stats = new Map();
  enrichedRetailers.forEach(r => {
    stats.set(r.id, {
      hasOrder: r.hasOrder,
      orderValue: r.orderValue,
      pendingAmount: r.pendingAmount,
    });
  });
  setRetailerStats(stats);
};
