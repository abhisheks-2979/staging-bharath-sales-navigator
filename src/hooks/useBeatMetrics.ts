import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BeatMetrics {
  lastVisited: string | null;
  ordersThisMonth: number;
  avgBusiness: number;
  revenueGrowth: number;
  visitsPerMonth: number;
  retailersAdded3Months: number;
  isRecurring: boolean;
  recurringDetails: string | null;
}

export function useBeatMetrics(beatId: string, userId: string) {
  const [metrics, setMetrics] = useState<BeatMetrics>({
    lastVisited: null,
    ordersThisMonth: 0,
    avgBusiness: 0,
    revenueGrowth: 0,
    visitsPerMonth: 0,
    retailersAdded3Months: 0,
    isRecurring: false,
    recurringDetails: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (beatId && userId) {
      loadMetrics();
    }
  }, [beatId, userId]);

  const loadMetrics = async () => {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Get retailers in this beat
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, created_at')
        .eq('beat_id', beatId)
        .eq('user_id', userId);

      const retailerIds = retailers?.map(r => r.id) || [];

      if (retailerIds.length === 0) {
        setLoading(false);
        return;
      }

      // Last visited date from completed visits
      const { data: lastVisit } = await supabase
        .from('visits')
        .select('planned_date')
        .in('retailer_id', retailerIds)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('planned_date', { ascending: false })
        .limit(1)
        .single();

      // Orders this month
      const { data: ordersThisMonth } = await supabase
        .from('orders')
        .select('total_amount')
        .in('retailer_id', retailerIds)
        .gte('order_date', currentMonthStart)
        .eq('status', 'confirmed');

      const ordersCount = ordersThisMonth?.length || 0;
      const totalRevenue = ordersThisMonth?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Last month revenue
      const { data: lastMonthOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .in('retailer_id', retailerIds)
        .gte('order_date', lastMonthStart)
        .lte('order_date', lastMonthEnd)
        .eq('status', 'confirmed');

      const lastMonthRevenue = lastMonthOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const growth = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      // Visits this month
      const { data: visits } = await supabase
        .from('visits')
        .select('id')
        .in('retailer_id', retailerIds)
        .eq('user_id', userId)
        .gte('planned_date', currentMonthStart);

      // Retailers added in last 3 months
      const newRetailers = retailers?.filter(r => 
        new Date(r.created_at) >= new Date(threeMonthsAgo)
      ).length || 0;

      // Check if beat is recurring
      const { data: recurringPlans } = await supabase
        .from('beat_plans')
        .select('beat_data')
        .eq('beat_id', beatId)
        .eq('user_id', userId)
        .gte('plan_date', currentMonthStart)
        .limit(1);

      let isRecurring = false;
      let recurringDetails = null;

      if (recurringPlans && recurringPlans.length > 0) {
        const beatData = recurringPlans[0].beat_data as any;
        if (beatData?.isRecurring) {
          isRecurring = true;
          recurringDetails = `${beatData.repeatType} - ${beatData.repeatUntilMode === 'permanent' ? 'Ongoing' : 'Until ' + new Date(beatData.repeatEndDate).toLocaleDateString()}`;
        }
      }

      setMetrics({
        lastVisited: lastVisit?.planned_date || null,
        ordersThisMonth: ordersCount,
        avgBusiness: totalRevenue / (ordersCount || 1),
        revenueGrowth: growth,
        visitsPerMonth: visits?.length || 0,
        retailersAdded3Months: newRetailers,
        isRecurring,
        recurringDetails
      });
    } catch (error) {
      console.error('Error loading beat metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, refresh: loadMetrics };
}
