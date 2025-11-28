import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { format } from 'date-fns';

interface HomeDashboardData {
  todayData: {
    beatPlan: any | null;
    beatName: string | null;
    visits: any[];
    nextVisit: any | null;
    attendance: any | null;
    beatProgress: {
      total: number;
      completed: number;
      remaining: number;
      planned: number;
      productive: number;
      unproductive: number;
    };
    revenueTarget: number;
    revenueAchieved: number;
    newRetailers: number;
    potentialRevenue: number;
    points: number;
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

export const useHomeDashboard = (userId: string | undefined, selectedDate: Date = new Date()) => {
  const [data, setData] = useState<HomeDashboardData>({
    todayData: {
      beatPlan: null,
      beatName: null,
      visits: [],
      nextVisit: null,
      attendance: null,
      beatProgress: { total: 0, completed: 0, remaining: 0, planned: 0, productive: 0, unproductive: 0 },
      revenueTarget: 10000,
      revenueAchieved: 0,
      newRetailers: 0,
      potentialRevenue: 0,
      points: 0,
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

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  const loadDashboardData = useCallback(async () => {
    if (!userId) return;

    setData(prev => ({ ...prev, isLoading: true }));
    let hasLoadedFromCache = false;

    try {
      // STEP 1: Load from cache immediately (only for today)
      if (isToday) {
        const [cachedBeatPlans, cachedVisits, cachedAttendance, cachedRetailers] = await Promise.all([
          offlineStorage.getAll<any>(STORES.BEAT_PLANS),
          offlineStorage.getAll<any>(STORES.VISITS),
          offlineStorage.getAll<any>(STORES.ATTENDANCE),
          offlineStorage.getAll<any>(STORES.RETAILERS)
        ]);

        const todayBeatPlan = cachedBeatPlans.find(
          (plan: any) => plan.user_id === userId && plan.plan_date === dateStr
        );
        const todayVisits = cachedVisits.filter(
          (v: any) => v.user_id === userId && v.planned_date === dateStr
        );
        const todayAttendance = cachedAttendance.find(
          (a: any) => a.user_id === userId && a.date === dateStr
        );

        if (todayBeatPlan || todayVisits.length > 0) {
          const completed = todayVisits.filter((v: any) => v.status === 'completed' || v.status === 'productive').length;
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
      }
    } catch (cacheError) {
      console.log('Cache read error:', cacheError);
    }

    // STEP 2: Background sync from network if online
    if (navigator.onLine) {
      try {
        const dateStart = new Date(dateStr);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(dateStr);
        dateEnd.setHours(23, 59, 59, 999);

        // Fetch data - using any to avoid type issues
        const beatPlanRes: any = await supabase.from('beat_plans').select('*').eq('user_id', userId).eq('plan_date', dateStr).maybeSingle();
        const visitsRes: any = await supabase.from('visits').select('*').eq('user_id', userId).eq('planned_date', dateStr);
        const attendanceRes: any = await supabase.from('attendance').select('*').eq('user_id', userId).eq('date', dateStr).maybeSingle();
        const ordersRes: any = await supabase.from('orders').select('*').eq('user_id', userId).eq('status', 'confirmed')
          .gte('created_at', `${dateStr}T00:00:00.000Z`).lte('created_at', `${dateStr}T23:59:59.999Z`);
        const pointsRes: any = await supabase.from('gamification_points').select('points').eq('user_id', userId)
          .gte('earned_at', dateStart.toISOString()).lte('earned_at', dateEnd.toISOString());
        // Fetch all retailers (no created_by field in table)
        const retailersRes = await supabase.from('retailers').select('*');
        const newRetailersRes: any = await supabase.from('retailers').select('id')
          .gte('created_at', `${dateStr}T00:00:00.000Z`).lte('created_at', `${dateStr}T23:59:59.999Z`);
        const leaveRes: any = await supabase.from('leave_applications').select('*').eq('user_id', userId).eq('status', 'approved')
          .lte('start_date', dateStr).gte('end_date', dateStr).maybeSingle();

        const beatPlan = beatPlanRes.data;
        const visits = visitsRes.data || [];
        const attendance = attendanceRes.data;
        const orders = ordersRes.data || [];
        const points = pointsRes.data || [];
        const retailers = retailersRes.data || [];
        const newRetailers = newRetailersRes.data || [];
        const leave = leaveRes.data;

        // Get beat name from first visit or beat plan
        let beatName = beatPlan?.beat_name || null;
        if (!beatName && visits.length > 0 && (visits[0] as any).beat_name) {
          beatName = (visits[0] as any).beat_name;
        }

        // Calculate beat progress
        const beatData = beatPlan?.beat_data as any;
        const beatRetailerIds = beatData?.retailer_ids || [];
        const completed = visits.filter((v: any) => v.status === 'completed' || v.status === 'productive' || v.status === 'unproductive').length;
        const planned = visits.filter((v: any) => v.status === 'planned').length;
        const productive = visits.filter((v: any) => v.status === 'productive').length;
        const unproductive = visits.filter((v: any) => v.status === 'unproductive').length;

        // Calculate revenue target and achieved
        const revenueTarget = 10000; // Default target, can be made dynamic
        const revenueAchieved = orders.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0);

        // Calculate potential revenue from remaining visits
        const visitedIds = new Set(orders.map((o: any) => o.visit_id).filter(Boolean));
        const remainingVisits = visits.filter((v: any) => !visitedIds.has(v.id));
        
        // Get average order value from retailers
        const avgOrderValue = retailers.length > 0
          ? retailers.reduce((sum: any, r: any) => sum + (r.order_value || 0), 0) / retailers.length
          : 0;
        
        const potentialRevenue = Math.round(remainingVisits.length * avgOrderValue);

        // Calculate performance
        const salesAmount = revenueAchieved;
        const pointsEarned = points.reduce((sum: number, p: any) => sum + p.points, 0);
        const dailyProgress = beatRetailerIds.length > 0 ? Math.round((completed / beatRetailerIds.length) * 100) : 0;

        // Fetch urgent items (only for today)
        let pendingPayments: any[] = [];
        let priorityRetailers: any[] = [];
        
        if (isToday) {
          pendingPayments = retailers
            .filter((r: any) => (r.pending_amount || 0) > 0)
            .sort((a: any, b: any) => (b.pending_amount || 0) - (a.pending_amount || 0))
            .slice(0, 5)
            .map((r: any) => ({
              id: r.id,
              name: r.shop_name,
              amount: r.pending_amount || 0,
              phone: r.phone || ''
            }));

          priorityRetailers = retailers
            .filter((r: any) => {
              if (r.priority !== 'high') return false;
              if (!r.last_visit_date) return true;
              const daysSinceVisit = Math.floor(
                (new Date().getTime() - new Date(r.last_visit_date).getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysSinceVisit >= 14;
            })
            .slice(0, 5)
            .map((r: any) => {
              const lastVisit = r.last_visit_date ? new Date(r.last_visit_date) : null;
              const daysSinceVisit = lastVisit 
                ? Math.floor((new Date().getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              return {
                id: r.id,
                name: r.shop_name,
                daysSinceVisit,
                priority: r.priority || 'high'
              };
            });
        }

        // Enhance attendance with leave info
        const enhancedAttendance = attendance ? {
          ...attendance,
          on_leave: !!leave,
          leave_type_id: leave?.leave_type_id,
        } : null;

        // Cache the data (only for today)
        if (isToday) {
          if (beatPlan) await offlineStorage.save(STORES.BEAT_PLANS, beatPlan);
          await Promise.all([
            ...visits.map((v: any) => offlineStorage.save(STORES.VISITS, v)),
            enhancedAttendance ? offlineStorage.save(STORES.ATTENDANCE, enhancedAttendance) : Promise.resolve()
          ]);
        }

        // Update state with fresh data
        setData({
          todayData: {
            beatPlan,
            beatName,
            visits,
            nextVisit: visits.find((v: any) => !v.check_in_time) || null,
            attendance: enhancedAttendance,
            beatProgress: {
              total: beatRetailerIds.length,
              completed,
              remaining: beatRetailerIds.length - completed,
              planned,
              productive,
              unproductive,
            },
            revenueTarget,
            revenueAchieved,
            newRetailers: newRetailers.length,
            potentialRevenue,
            points: pointsEarned,
          },
          performance: {
            visitsCount: visits.length,
            salesAmount,
            pointsEarned: pointsEarned,
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
  }, [userId, dateStr, isToday]);

  const updateDashboardState = ({ todayBeatPlan, todayVisits, todayAttendance, cachedRetailers, beatRetailerIds, completed }: any) => {
    const nextVisit = todayVisits.find((v: any) => !v.check_in_time) || null;
    const beatName = todayBeatPlan?.beat_name || (todayVisits.length > 0 ? todayVisits[0].beat_name : null);
    const planned = todayVisits.filter((v: any) => v.status === 'planned').length;
    const productive = todayVisits.filter((v: any) => v.status === 'productive').length;
    const unproductive = todayVisits.filter((v: any) => v.status === 'unproductive').length;
    
    setData(prev => ({
      ...prev,
      todayData: {
        ...prev.todayData,
        beatPlan: todayBeatPlan,
        beatName,
        visits: todayVisits,
        nextVisit,
        attendance: todayAttendance,
        beatProgress: {
          total: beatRetailerIds.length,
          completed,
          remaining: beatRetailerIds.length - completed,
          planned,
          productive,
          unproductive,
        }
      },
      isLoading: false
    }));
  };

  useEffect(() => {
    loadDashboardData();
    
    // Refresh every 60 seconds (only for today)
    if (isToday) {
      const interval = setInterval(loadDashboardData, 60000);
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, isToday]);

  return { ...data, refresh: loadDashboardData };
};
