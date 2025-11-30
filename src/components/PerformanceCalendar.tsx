import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DayData {
  date: Date;
  beatName: string;
  plannedVisits: number;
  completedVisits: number;
  productiveVisits: number;
  revenue: number;
  productivity: number;
  isHoliday: boolean;
  isLeave: boolean;
}

export const PerformanceCalendar = () => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("self");
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get subordinates
      const { data: subordinates } = await supabase.rpc('get_subordinate_users', {
        user_id_param: user.id
      });

      if (subordinates && subordinates.length > 0) {
        const subordinateIds = subordinates.map((s: any) => s.subordinate_user_id);
        
        // Get profiles for subordinates
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', subordinateIds);

        const formattedProfiles = profiles?.map(p => ({
          id: p.id,
          name: p.full_name || 'Unknown'
        })) || [];

        setTeamMembers(formattedProfiles);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Determine which user ID to use for data fetching
      let targetUserId = user.id;
      let userIds: string[] = [user.id];

      if (selectedUserId === "all") {
        // Get all subordinates
        const { data: subordinates } = await supabase.rpc('get_subordinate_users', {
          user_id_param: user.id
        });
        if (subordinates) {
          userIds = [user.id, ...subordinates.map((s: any) => s.subordinate_user_id)];
        }
      } else if (selectedUserId !== "self") {
        targetUserId = selectedUserId;
        userIds = [selectedUserId];
      }

      // Fetch beat plans for the month
      const { data: beatPlans, error: beatPlansError } = await supabase
        .from('beat_plans')
        .select('plan_date, beat_name')
        .in('user_id', userIds)
        .gte('plan_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('plan_date', format(monthEnd, 'yyyy-MM-dd'));

      if (beatPlansError) throw beatPlansError;

      // Fetch visits for the month
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .in('user_id', userIds)
        .gte('planned_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('planned_date', format(monthEnd, 'yyyy-MM-dd'));

      if (visitsError) throw visitsError;

      // Fetch orders for the month
      const visitIds = visits?.map(v => v.id) || [];
      let orders: any[] = [];
      if (visitIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('visit_id, total_amount')
          .in('user_id', userIds)
          .in('visit_id', visitIds);

        if (ordersError) throw ordersError;
        orders = ordersData || [];
      }

      // Fetch holidays
      const { data: holidays, error: holidaysError } = await supabase
        .from('holidays')
        .select('date')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      if (holidaysError) throw holidaysError;

      // Fetch leave applications
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_applications')
        .select('start_date, end_date')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .or(`start_date.lte.${format(monthEnd, 'yyyy-MM-dd')},end_date.gte.${format(monthStart, 'yyyy-MM-dd')}`);

      if (leavesError) throw leavesError;

      // Group data by date
      const dataByDate = new Map<string, DayData>();
      const holidayDates = new Set(holidays?.map(h => h.date) || []);
      const leaveDates = new Set<string>();

      // Process leave dates
      leaves?.forEach(leave => {
        const leaveStart = new Date(leave.start_date);
        const leaveEnd = new Date(leave.end_date);
        const leaveDays = eachDayOfInterval({ start: leaveStart, end: leaveEnd });
        leaveDays.forEach(day => {
          leaveDates.add(format(day, 'yyyy-MM-dd'));
        });
      });

      // Create beat plan map
      const beatPlanMap = new Map<string, string[]>();
      beatPlans?.forEach(plan => {
        if (!beatPlanMap.has(plan.plan_date)) {
          beatPlanMap.set(plan.plan_date, []);
        }
        beatPlanMap.get(plan.plan_date)!.push(plan.beat_name);
      });

      // Create order map by visit_id
      const orderMap = new Map<string, number>();
      orders?.forEach(order => {
        const existing = orderMap.get(order.visit_id) || 0;
        orderMap.set(order.visit_id, existing + parseFloat(order.total_amount || 0));
      });

      // Group visits by date
      visits?.forEach(visit => {
        const dateKey = visit.planned_date;
        if (!dataByDate.has(dateKey)) {
          const beatNames = beatPlanMap.get(dateKey) || [];
          dataByDate.set(dateKey, {
            date: new Date(dateKey),
            beatName: beatNames.join(', ') || '',
            plannedVisits: 0,
            completedVisits: 0,
            productiveVisits: 0,
            revenue: 0,
            productivity: 0,
            isHoliday: holidayDates.has(dateKey),
            isLeave: leaveDates.has(dateKey)
          });
        }

        const dayData = dataByDate.get(dateKey)!;
        dayData.plannedVisits++;

        if (visit.status === 'productive' || visit.status === 'unproductive' || visit.status === 'store_closed') {
          dayData.completedVisits++;
        }

        if (visit.status === 'productive') {
          dayData.productiveVisits++;
        }

        // Add revenue from this visit
        const orderRevenue = orderMap.get(visit.id) || 0;
        dayData.revenue += orderRevenue;
      });

      // Calculate productivity percentage
      dataByDate.forEach(dayData => {
        if (dayData.completedVisits > 0) {
          dayData.productivity = (dayData.productiveVisits / dayData.completedVisits) * 100;
        }
      });

      setCalendarData(dataByDate);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, selectedUserId]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    navigate(`/today-summary?date=${format(date, 'yyyy-MM-dd')}`);
  };

  const getColorClass = (dayData: DayData | undefined) => {
    if (!dayData) return 'bg-background';
    if (dayData.isHoliday || dayData.isLeave) return 'bg-muted';
    if (dayData.completedVisits === 0) return 'bg-background';
    
    if (dayData.productivity >= 50) return 'bg-success/20 border-success/40';
    if (dayData.productivity >= 30) return 'bg-warning/20 border-warning/40';
    if (dayData.productivity >= 20) return 'bg-destructive/20 border-destructive/40';
    return 'bg-muted';
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Performance on Calendar View</CardTitle>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium min-w-[100px] sm:min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleNextMonth}>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
          
          {/* User Selection Dropdown */}
          {teamMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">View:</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-success/20 border border-success/40" />
            <span className="text-muted-foreground">&gt;50% Productive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-warning/20 border border-warning/40" />
            <span className="text-muted-foreground">&gt;30% Productive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-destructive/20 border border-destructive/40" />
            <span className="text-muted-foreground">&lt;20% Productive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-muted border" />
            <span className="text-muted-foreground">Holiday/Leave</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = calendarData.get(dateKey);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(day)}
                disabled={!isCurrentMonth}
                className={cn(
                  "min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border rounded-lg transition-all",
                  "hover:shadow-md hover:scale-105",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100",
                  getColorClass(dayData),
                  isToday && "ring-2 ring-primary"
                )}
              >
                <div className="text-left space-y-0.5 sm:space-y-1">
                  <div className={cn(
                    "text-xs sm:text-sm font-semibold",
                    isToday && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  
                  {isCurrentMonth && dayData && dayData.completedVisits > 0 && (
                    <div className="text-[10px] sm:text-xs space-y-0.5">
                      {dayData.beatName && (
                        <div className="font-medium truncate" title={dayData.beatName}>
                          {dayData.beatName}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        P: {dayData.plannedVisits} | C: {dayData.completedVisits}
                      </div>
                      <div className="text-success font-medium">
                        Prod: {dayData.productiveVisits}
                      </div>
                      {dayData.revenue > 0 && (
                        <div className="text-primary font-semibold">
                          ₹{(dayData.revenue / 1000).toFixed(1)}k
                        </div>
                      )}
                    </div>
                  )}

                  {isCurrentMonth && dayData && (dayData.isHoliday || dayData.isLeave) && (
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      {dayData.isHoliday ? 'Holiday' : 'Leave'}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
