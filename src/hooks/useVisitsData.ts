import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseVisitsDataProps {
  userId: string | undefined;
  selectedDate: string;
}

export const useVisitsData = ({ userId, selectedDate }: UseVisitsDataProps) => {
  const queryClient = useQueryClient();

  // Fetch beat plans with caching
  const {
    data: beatPlans,
    isLoading: beatPlansLoading,
    error: beatPlansError
  } = useQuery({
    queryKey: ['beat-plans', userId, selectedDate],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', selectedDate);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!selectedDate,
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch visits with caching
  const {
    data: visits,
    isLoading: visitsLoading,
    error: visitsError
  } = useQuery({
    queryKey: ['visits', userId, selectedDate],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', userId)
        .eq('planned_date', selectedDate);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!selectedDate,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
  });

  // Fetch retailers with caching (depends on beatPlans and visits)
  const {
    data: retailers,
    isLoading: retailersLoading,
    error: retailersError
  } = useQuery({
    queryKey: ['retailers', userId, selectedDate, beatPlans, visits],
    queryFn: async () => {
      if (!userId || !beatPlans || !visits) return [];
      
      const visitRetailerIds = visits.map(v => v.retailer_id);
      const allRetailerIds = new Set([...visitRetailerIds]);
      
      // Get planned beat IDs
      const plannedBeatIds = beatPlans.map(plan => plan.beat_id);
      
      // If there are planned beats, include retailers from those beats
      if (plannedBeatIds.length > 0) {
        const { data: plannedRetailers } = await supabase
          .from('retailers')
          .select('id')
          .eq('user_id', userId)
          .in('beat_id', plannedBeatIds);
        
        if (plannedRetailers) {
          plannedRetailers.forEach(r => allRetailerIds.add(r.id));
        }
      }
      
      if (allRetailerIds.size === 0) return [];
      
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', userId)
        .in('id', Array.from(allRetailerIds));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!beatPlans && !!visits,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Fetch orders with caching (only for non-future dates)
  const selectedDateObj = new Date(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDateObj.setHours(0, 0, 0, 0);
  const isFutureDate = selectedDateObj > today;

  const {
    data: orders,
    isLoading: ordersLoading
  } = useQuery({
    queryKey: ['orders', userId, selectedDate, retailers],
    queryFn: async () => {
      if (!userId || !retailers || retailers.length === 0 || isFutureDate) return [];
      
      const dateStart = new Date(selectedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(selectedDate);
      dateEnd.setHours(23, 59, 59, 999);
      
      const retailerIds = retailers.map(r => r.id);
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, retailer_id, total_amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .in('retailer_id', retailerIds)
        .gte('created_at', dateStart.toISOString())
        .lte('created_at', dateEnd.toISOString());
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!retailers && retailers.length > 0 && !isFutureDate,
    staleTime: 2 * 60 * 1000, // 2 minutes for orders
    gcTime: 10 * 60 * 1000,
  });

  // Invalidate queries when needed
  const invalidateVisitsData = () => {
    queryClient.invalidateQueries({ queryKey: ['visits', userId, selectedDate] });
    queryClient.invalidateQueries({ queryKey: ['orders', userId, selectedDate] });
  };

  const isLoading = beatPlansLoading || visitsLoading || retailersLoading || ordersLoading;
  const error = beatPlansError || visitsError || retailersError;

  return {
    beatPlans: beatPlans || [],
    visits: visits || [],
    retailers: retailers || [],
    orders: orders || [],
    isLoading,
    error,
    invalidateVisitsData,
  };
};
