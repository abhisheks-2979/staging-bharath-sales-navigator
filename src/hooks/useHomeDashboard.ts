import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';

interface HomeDashboardData {
  todayData: {
    beatPlan: any | null;
    visits: any[];
    nextVisit: any | null;
    attendance: any | null;
    beatProgress: {
      total: number;
      completed: number;
      remaining: number;
    };
  };
  performance: {
    visitsCount: number;
    salesAmount: number;
    pointsEarned: number;
    leaderboardPosition: number | null;
    dailyProgress: number;
  };
  urgentItems: {
    pendingPayments: Array<{
      id: string;
      name: string;
      amount: number;
      phone: string;
    }>;
    priorityRetailers: Array<{
      id: string;
      name: string;
      daysSinceVisit: number;
      priority: string;
    }>;
    lowStock: any[];
  };
  isLoading: boolean;
  error: any;
}

export const useHomeDashboard = (userId: string | undefined) => {
  const [data, setData] = useState<HomeDashboardData>({
    todayData: {
      beatPlan: null,
      visits: [],
      nextVisit: null,
      attendance: null,
      beatProgress: { total: 0, completed: 0, remaining: 0 }
    },
    performance: {
      visitsCount: 0,
      salesAmount: 0,
      pointsEarned: 0,
      leaderboardPosition: null,
      dailyProgress: 0
    },
    urgentItems: {
      pendingPayments: [],
      priorityRetailers: [],
      lowStock: []
    },
    isLoading: true,
    error: null
  });

  const today = new Date().toISOString().split('T')[0];

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setData(prev => ({ ...prev, isLoading: true }));
    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from cache immediately
      const [cachedBeatPlans, cachedVisits, cachedAttendance, cachedRetailers] = await Promise.all([
        offlineStorage.getAll<any>(STORES.BEAT_PLANS),
        offlineStorage.getAll<any>(STORES.VISITS),
        offlineStorage.getAll<any>(STORES.ATTENDANCE),
        offlineStorage.getAll<any>(STORES.RETAILERS)
      ]);

      const todayBeatPlan = cachedBeatPlans.find(
        (plan: any) => plan.user_id === userId && plan.plan_date === today
      );
      const todayVisits = cachedVisits.filter(
        (v: any) => v.user_id === userId && v.planned_date === today
      );
      const todayAttendance = cachedAttendance.find(
        (a: any) => a.user_id === userId && a.date === today
      );

      if (todayBeatPlan || todayVisits.length > 0) {
        const completed = todayVisits.filter(v => v.status === 'completed' || v.status === 'productive').length;
        const beatData = todayBeatPlan?.beat_data as any;
        const beatRetailerIds = beatData?.retailer_ids || [];
        
        updateDashboardState({
          todayBeatPlan,
          todayVisits,
          todayAttendance,
          cachedRetailers,
          beatRetailerIds,
          completed
        });
        
        hasLoadedFromCache = true;
        setData(prev => ({ ...prev, isLoading: false }));
      }
    } catch (cacheError) {
      console.log('Cache read error:', cacheError);
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        const dateStart = new Date(today);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(today);
        dateEnd.setHours(23, 59, 59, 999);

        const [beatPlanRes, visitsRes, attendanceRes, ordersRes, pointsRes] = await Promise.all([
          supabase.from('beat_plans').select('*').eq('user_id', userId).eq('plan_date', today).single(),
          supabase.from('visits').select('*').eq('user_id', userId).eq('planned_date', today),
          supabase.from('attendance').select('*').eq('user_id', userId).eq('date', today).maybeSingle(),
          supabase.from('orders').select('retailer_id, total_amount').eq('user_id', userId).eq('status', 'confirmed')
            .gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`),
          supabase.from('gamification_points').select('points').eq('user_id', userId)
            .gte('earned_at', dateStart.toISOString()).lte('earned_at', dateEnd.toISOString())
        ]);

        const beatPlan = beatPlanRes.data;
        const visits = visitsRes.data || [];
        const attendance = attendanceRes.data;
        const orders = ordersRes.data || [];
        const points = pointsRes.data || [];

        // Fetch urgent items
        const [pendingPaymentsRes, priorityRetailersRes] = await Promise.all([
          supabase.from('retailers').select('id, name, pending_amount, phone')
            .eq('user_id', userId).gt('pending_amount', 0).order('pending_amount', { ascending: false }).limit(5),
          supabase.from('retailers').select('id, name, last_visit_date, priority')
            .eq('user_id', userId).eq('priority', 'high').order('last_visit_date', { ascending: true }).limit(5)
        ]);

        const pendingPayments = (pendingPaymentsRes.data || []).map(r => ({
          id: r.id,
          name: r.name,
          amount: r.pending_amount || 0,
          phone: r.phone || ''
        }));

        const priorityRetailers = (priorityRetailersRes.data || []).map(r => {
          const lastVisit = r.last_visit_date ? new Date(r.last_visit_date) : null;
          const daysSinceVisit = lastVisit 
            ? Math.floor((new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          return {
            id: r.id,
            name: r.name,
            daysSinceVisit,
            priority: r.priority || 'high'
          };
        }).filter(r => r.daysSinceVisit >= 14);

        // Calculate performance
        const salesAmount = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        const pointsEarned = points.reduce((sum, p) => sum + p.points, 0);
        const completed = visits.filter(v => v.status === 'completed' || v.status === 'productive').length;
        const beatData = beatPlan?.beat_data as any;
        const beatRetailerIds = beatData?.retailer_ids || [];
        const dailyProgress = beatRetailerIds.length > 0 ? Math.round((completed / beatRetailerIds.length) * 100) : 0;

        // Cache the data
        if (beatPlan) await offlineStorage.save(STORES.BEAT_PLANS, beatPlan);
        await Promise.all([
          ...visits.map(v => offlineStorage.save(STORES.VISITS, v)),
          attendance ? offlineStorage.save(STORES.ATTENDANCE, attendance) : Promise.resolve()
        ]);

        // Update state with fresh data
        setData({
          todayData: {
            beatPlan,
            visits,
            nextVisit: visits.find(v => !v.check_in_time) || null,
            attendance,
            beatProgress: {
              total: beatRetailerIds.length,
              completed,
              remaining: beatRetailerIds.length - completed
            }
          },
          performance: {
            visitsCount: visits.length,
            salesAmount,
            pointsEarned,
            leaderboardPosition: null,
            dailyProgress
          },
          urgentItems: {
            pendingPayments,
            priorityRetailers,
            lowStock: []
          },
          isLoading: false,
          error: null
        });
      } catch (networkError) {
        console.error('Network error:', networkError);
        if (!hasLoadedFromCache) {
          setData(prev => ({ ...prev, isLoading: false, error: networkError }));
        }
      }
    } else {
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, today]);

  const updateDashboardState = ({ todayBeatPlan, todayVisits, todayAttendance, cachedRetailers, beatRetailerIds, completed }: any) => {
    const nextVisit = todayVisits.find((v: any) => !v.check_in_time) || null;
    
    setData(prev => ({
      ...prev,
      todayData: {
        beatPlan: todayBeatPlan,
        visits: todayVisits,
        nextVisit,
        attendance: todayAttendance,
        beatProgress: {
          total: beatRetailerIds.length,
          completed,
          remaining: beatRetailerIds.length - completed
        }
      },
      isLoading: false
    }));
  };

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadDashboardData, 60000);
    
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  return { ...data, refresh: loadDashboardData };
};
