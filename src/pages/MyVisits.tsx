import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, FileText, Plus, TrendingUp, Route, CheckCircle, CalendarDays, MapPin, Users, Clock, Truck } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, addWeeks, subWeeks, differenceInDays } from "date-fns";
import { SearchInput } from "@/components/SearchInput";
import { VisitCard } from "@/components/VisitCard";
import { CreateNewVisitModal } from "@/components/CreateNewVisitModal";
import { VisitFilters, FilterOptions } from "@/components/VisitFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { TimelineView } from "@/components/TimelineView";
import { toast } from "sonner";
import { useRecommendations } from "@/hooks/useRecommendations";
import { AIRecommendationBanner } from "@/components/AIRecommendationBanner";
import { VanStockManagement } from "@/components/VanStockManagement";
interface Visit {
  id: string;
  retailerName: string;
  address: string;
  phone: string;
  retailerCategory: string;
  status: "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
  visitType: string;
  time?: string;
  day?: string;
  checkInStatus?: "not-checked-in" | "checked-in-correct" | "checked-in-wrong-location";
  hasOrder?: boolean;
  orderValue?: number;
  noOrderReason?: "over-stocked" | "owner-not-available" | "store-closed" | "permanently-closed";
  distributor?: string;
}
const mockVisits: Visit[] = [{
  id: "1",
  retailerName: "Vardhman Kirana",
  address: "Indiranagar, Bangalore",
  phone: "9926612072",
  retailerCategory: "Category A",
  status: "in-progress",
  visitType: "First Visit",
  time: "10:00 AM",
  day: "Today",
  checkInStatus: "checked-in-correct",
  hasOrder: true,
  orderValue: 15000,
  distributor: "ABC Distributors"
}, {
  id: "2",
  retailerName: "Sham Kirana and General Stores",
  address: "34 A, Kharghar, Navi Mumbai, Maharashtra 410210, Karnataka",
  phone: "9926963147",
  retailerCategory: "Category B",
  status: "planned",
  visitType: "Negotiation",
  time: "2:00 PM",
  day: "Today",
  checkInStatus: "not-checked-in",
  hasOrder: false,
  distributor: "XYZ Distributors"
}, {
  id: "3",
  retailerName: "Mahesh Kirana and General Stores",
  address: "MG Road, Bangalore",
  phone: "9955551112",
  retailerCategory: "Category A",
  status: "productive",
  visitType: "First Visit",
  time: "9:00 AM",
  day: "Today",
  checkInStatus: "checked-in-correct",
  hasOrder: true,
  orderValue: 22000,
  distributor: "ABC Distributors"
}, {
  id: "4",
  retailerName: "Balaji Kiranad",
  address: "Commercial Street, Bangalore",
  phone: "9516584711",
  retailerCategory: "Category C",
  status: "unproductive",
  visitType: "Follow-up",
  time: "11:00 AM",
  day: "Today",
  checkInStatus: "checked-in-wrong-location",
  hasOrder: false,
  noOrderReason: "over-stocked",
  distributor: "PQR Distributors"
}, {
  id: "5",
  retailerName: "New Mart",
  address: "Brigade Road, Bangalore",
  phone: "9876543210",
  retailerCategory: "Category B",
  status: "store-closed",
  visitType: "Follow-up",
  time: "3:00 PM",
  day: "Today",
  checkInStatus: "checked-in-correct",
  hasOrder: false,
  noOrderReason: "store-closed",
  distributor: "ABC Distributors"
}];
const getWeekDays = (selectedWeekStart: Date) => {
  const startOfSelectedWeek = startOfWeek(selectedWeekStart, {
    weekStartsOn: 0
  }); // Start from Sunday
  const today = new Date();
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfSelectedWeek, i);
    const isToday = isSameDay(day, today);
    weekDays.push({
      day: format(day, 'EEE'),
      date: day.getDate().toString(),
      isToday: isToday,
      isoDate: format(day, 'yyyy-MM-dd'),
      fullDate: day
    });
  }
  return weekDays;
};
export const MyVisits = () => {
  const {
    t
  } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedWeek, setSelectedWeek] = useState(new Date()); // Current week start
  const [weekDays, setWeekDays] = useState(() => getWeekDays(new Date()));
  const [plannedBeats, setPlannedBeats] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [retailerStats, setRetailerStats] = useState<Map<string, any>>(new Map());
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set());
  const [currentBeatName, setCurrentBeatName] = useState("No beats planned");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const [isCreateVisitModalOpen, setIsCreateVisitModalOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [timelineDate, setTimelineDate] = useState<Date>(new Date());
  const [timelineVisits, setTimelineVisits] = useState<any[]>([]);
  const [timelineDayStart, setTimelineDayStart] = useState<string>('08:00 AM');
  const [isVanStockOpen, setIsVanStockOpen] = useState(false);
  const [initialRetailerOrder, setInitialRetailerOrder] = useState<string[]>([]);
  const {
    user
  } = useAuth();
  const navigate = useNavigate();

  // Get current beat ID for recommendations
  const currentBeatId = plannedBeats.length > 0 ? plannedBeats[0].beat_id : undefined;

  // AI Recommendations hooks
  const {
    recommendations: retailerPriorityRecs,
    loading: retailerRecsLoading,
    generateRecommendation: generateRetailerRecs,
    provideFeedback: provideRetailerFeedback
  } = useRecommendations('retailer_priority', currentBeatId);

  // Initialize selected day to today
  useEffect(() => {
    const today = weekDays.find(d => d.isToday);
    if (today && !selectedDay) {
      setSelectedDay(today.day);
      setSelectedDate(today.isoDate);
    }
  }, [weekDays, selectedDay]);

  // Update week days when selected week changes
  useEffect(() => {
    setWeekDays(getWeekDays(selectedWeek));
  }, [selectedWeek]);

  // Load beat plans and retailers when user or date changes
  useEffect(() => {
    if (user && selectedDate) {
      loadPlannedBeats(selectedDate);
    }
  }, [user, selectedDate]);

  // Set up real-time updates for visits and orders - WITHOUT re-sorting
  useEffect(() => {
    if (!user || !selectedDate) return;
    const channel = supabase.channel('visit-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'visits',
      filter: `user_id=eq.${user.id}`
    }, payload => {
      console.log('Visit updated:', payload);
      // Reload data but preserve order
      loadPlannedBeats(selectedDate, true);
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: `user_id=eq.${user.id}`
    }, payload => {
      console.log('Order updated:', payload);
      // Reload data but preserve order
      loadPlannedBeats(selectedDate, true);
    }).subscribe();

    // Also listen for custom events from VisitCard components
    const handleVisitStatusChange = () => {
      loadPlannedBeats(selectedDate, true);
    };
    window.addEventListener('visitStatusChanged', handleVisitStatusChange);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('visitStatusChanged', handleVisitStatusChange);
    };
  }, [user, selectedDate]);

  // Load week plan markers for calendar
  useEffect(() => {
    if (!user) return;
    const loadWeekPlans = async () => {
      try {
        const startIso = weekDays[0]?.isoDate;
        const endIso = weekDays[weekDays.length - 1]?.isoDate;
        if (!startIso || !endIso) return;
        const {
          data,
          error
        } = await supabase.from('beat_plans').select('plan_date').eq('user_id', user.id).gte('plan_date', startIso).lte('plan_date', endIso);
        if (error) throw error;
        setPlannedDates(new Set((data || []).map((d: any) => d.plan_date)));
      } catch (err) {
        console.error('Error loading week plans:', err);
      }
    };
    loadWeekPlans();
  }, [user, weekDays]);
  const loadPlannedBeats = async (date: string, preserveOrder: boolean = false) => {
    if (!user) return;
    try {
      const {
        data: beatPlans,
        error
      } = await supabase.from('beat_plans').select('*').eq('user_id', user.id).eq('plan_date', date);
      if (error) throw error;
      setPlannedBeats(beatPlans || []);

      // Update beat name based on planned beats
      if (beatPlans && beatPlans.length > 0) {
        const beatNames = beatPlans.map(plan => plan.beat_name).join(', ');
        setCurrentBeatName(beatNames);

        // Load all visits and retailers for this date
        await loadAllVisitsForDate(date, beatPlans, preserveOrder);
      } else {
        setCurrentBeatName("No beats planned");
        // Still load unplanned visits even if no beats are planned
        await loadAllVisitsForDate(date, [], preserveOrder);
      }
    } catch (error) {
      console.error('Error loading beat plans:', error);
    }
  };
  const loadTimelineVisits = async (date: Date) => {
    if (!user) return;
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Get attendance data for day start time
      const {
        data: attendance
      } = await supabase.from('attendance').select('check_in_time').eq('user_id', user.id).eq('date', dateStr).maybeSingle();
      if (attendance?.check_in_time) {
        setTimelineDayStart(format(new Date(attendance.check_in_time), 'hh:mm a'));
      } else {
        setTimelineDayStart('Not checked in');
      }

      // Get ALL visits for the selected date (both checked in and not)
      const {
        data: visits,
        error
      } = await supabase.from('visits').select(`
          id,
          retailer_id,
          check_in_time,
          check_out_time,
          check_in_address,
          status,
          no_order_reason,
          skip_check_in_time
        `).eq('user_id', user.id).eq('planned_date', dateStr);
      if (error) throw error;

      // Get retailer details for these visits
      const retailerIds = (visits || []).map(v => v.retailer_id);
      if (retailerIds.length === 0) {
        setTimelineVisits([]);
        return;
      }
      const {
        data: retailers,
        error: retailersError
      } = await supabase.from('retailers').select('id, name, address').in('id', retailerIds);
      if (retailersError) throw retailersError;
      const retailerMap = new Map(retailers?.map(r => [r.id, {
        name: r.name,
        address: r.address
      }]));

      // Get order details for these visits
      const dateStart = new Date(dateStr);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStr);
      dateEnd.setHours(23, 59, 59, 999);
      const {
        data: orders,
        error: ordersError
      } = await supabase.from('orders').select('retailer_id, total_amount, order_items(quantity)').eq('user_id', user.id).eq('status', 'confirmed').in('retailer_id', retailerIds).gte('created_at', dateStart.toISOString()).lte('created_at', dateEnd.toISOString());
      if (ordersError) throw ordersError;

      // Create order map
      const orderMap = new Map();
      (orders || []).forEach(order => {
        const existing = orderMap.get(order.retailer_id) || {
          value: 0,
          quantity: 0
        };
        existing.value += Number(order.total_amount || 0);
        existing.quantity += order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        orderMap.set(order.retailer_id, existing);
      });

      // Transform visits to timeline format
      const timelineData = (visits || []).map(visit => {
        const retailer = retailerMap.get(visit.retailer_id);
        const order = orderMap.get(visit.retailer_id);
        // Use check_in_time if available, otherwise use skip_check_in_time for phone orders
        const effectiveTime = visit.check_in_time || visit.skip_check_in_time;
        return {
          id: visit.id,
          retailer_name: retailer?.name || 'Unknown',
          check_in_time: effectiveTime,
          check_out_time: visit.check_out_time,
          check_in_address: visit.check_in_address || retailer?.address || 'Address not available',
          status: visit.status,
          order_value: order?.value || 0,
          order_quantity: order?.quantity || 0,
          no_order_reason: visit.no_order_reason,
          is_planned: !effectiveTime // Flag for planned visits
        };
      }).filter(v => v.check_in_time) // Only show visits that have at least started (check_in or skip_check_in)
      .sort((a, b) => {
        // Sort by check_in_time chronologically
        return new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime();
      });
      setTimelineVisits(timelineData);
    } catch (error) {
      console.error('Error loading timeline visits:', error);
      toast.error('Failed to load timeline data');
    }
  };

  // Load timeline visits when date changes
  useEffect(() => {
    if (isTimelineOpen && user) {
      loadTimelineVisits(timelineDate);
    }
  }, [timelineDate, isTimelineOpen, user]);
  const loadAllVisitsForDate = async (date: string, beatPlans: any[], preserveOrder: boolean = false) => {
    if (!user) return;
    try {
      // Check if this is a future date
      const selectedDateObj = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDateObj.setHours(0, 0, 0, 0);
      const isFutureDate = selectedDateObj > today;

      // Get all visits for the selected date
      const {
        data: visits,
        error: visitsError
      } = await supabase.from('visits').select('*').eq('user_id', user.id).eq('planned_date', date);
      if (visitsError) throw visitsError;

      // Get planned beat IDs
      const plannedBeatIds = beatPlans.map(plan => plan.beat_id);

      // Get all retailers that should be shown (from planned beats + visit retailers)
      const visitRetailerIds = (visits || []).map(v => v.retailer_id);
      const allRetailerIds = new Set([...visitRetailerIds]);

      // If there are planned beats, also include retailers from those beats
      if (plannedBeatIds.length > 0) {
        const {
          data: plannedRetailers,
          error: plannedError
        } = await supabase.from('retailers').select('id').eq('user_id', user.id).in('beat_id', plannedBeatIds);
        if (!plannedError && plannedRetailers) {
          plannedRetailers.forEach(r => allRetailerIds.add(r.id));
        }
      }
      if (allRetailerIds.size === 0) {
        setRetailers([]);
        setRetailerStats(new Map());
        setInitialRetailerOrder([]);
        return;
      }

      // Get all retailer data
      const {
        data: retailersData,
        error: retailersError
      } = await supabase.from('retailers').select('*').eq('user_id', user.id).in('id', Array.from(allRetailerIds));
      if (retailersError) throw retailersError;

      // Create retailer map
      const retailerMap = new Map();
      (retailersData || []).forEach(retailer => {
        retailerMap.set(retailer.id, retailer);
      });

      // Create visit map
      const visitMap = new Map();
      (visits || []).forEach(visit => {
        visitMap.set(visit.retailer_id, visit);
      });

      // Get orders ONLY for the selected date (not for future dates)
      const totalsByRetailer = new Map<string, number>();

      // Only fetch orders if it's not a future date
      if (!isFutureDate) {
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);
        const {
          data: ordersForDate
        } = await supabase.from('orders').select('id, retailer_id, total_amount, created_at').eq('user_id', user.id).eq('status', 'confirmed').in('retailer_id', Array.from(allRetailerIds)).gte('created_at', dateStart.toISOString()).lte('created_at', dateEnd.toISOString());
        (ordersForDate || []).forEach(o => {
          if (!o.retailer_id) return;
          totalsByRetailer.set(o.retailer_id, (totalsByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
        });
      }

      // Get historical stats for all retailers (only for past/current dates, not future)
      const statsMap = new Map();
      if (!isFutureDate) {
        const {
          data: allOrders
        } = await supabase.from('orders').select('retailer_id, total_amount, created_at').eq('user_id', user.id).eq('status', 'confirmed').in('retailer_id', Array.from(allRetailerIds)).lte('created_at', date + 'T23:59:59.999Z'); // Only orders up to selected date

        const {
          data: allVisits
        } = await supabase.from('visits').select('retailer_id, planned_date').eq('user_id', user.id).in('retailer_id', Array.from(allRetailerIds)).lte('planned_date', date); // Only visits up to selected date

        // Calculate stats per retailer
        allRetailerIds.forEach(retailerId => {
          const retailerOrders = (allOrders || []).filter(o => o.retailer_id === retailerId);
          const retailerVisits = (allVisits || []).filter(v => v.retailer_id === retailerId);
          const totalSales = retailerOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          const avgSales = retailerOrders.length > 0 ? totalSales / retailerOrders.length : 0;
          const visitCount = retailerVisits.length;

          // Get last visit date
          const retailer = retailerMap.get(retailerId);
          const lastVisitDate = retailer?.last_visit_date;
          const daysSinceLastVisit = lastVisitDate ? differenceInDays(new Date(date), new Date(lastVisitDate)) : null;
          statsMap.set(retailerId, {
            avgSales,
            visitCount,
            daysSinceLastVisit,
            totalSales
          });
        });
      } else {
        // For future dates, initialize empty stats
        allRetailerIds.forEach(retailerId => {
          statsMap.set(retailerId, {
            avgSales: 0,
            visitCount: 0,
            daysSinceLastVisit: null,
            totalSales: 0
          });
        });
      }
      setRetailerStats(statsMap);

      // Determine the order of retailer IDs to use
      let orderedRetailerIds: string[];
      if (preserveOrder && initialRetailerOrder.length > 0) {
        // Use existing order and append any new retailers at the end
        const existingIds = new Set(initialRetailerOrder);
        const newIds = Array.from(allRetailerIds).filter(id => !existingIds.has(id));
        orderedRetailerIds = [...initialRetailerOrder.filter(id => allRetailerIds.has(id)), ...newIds];
      } else {
        // First load or order reset - use database order
        orderedRetailerIds = Array.from(allRetailerIds);
        setInitialRetailerOrder(orderedRetailerIds);
      }

      // Transform retailers into visit format using the ordered list
      const transformedRetailers = orderedRetailerIds.map(retailerId => {
        const retailer = retailerMap.get(retailerId);
        if (!retailer) return null;
        const visit = visitMap.get(retailerId);
        // For future dates, orderTotal should always be 0
        const orderTotal = isFutureDate ? 0 : totalsByRetailer.get(retailerId) || 0;
        const hasOrder = orderTotal > 0;
        const hasCheckIn = visit?.check_in_time;

        // Determine if this is unplanned (has visit but retailer not in planned beats)
        const isPlanned = plannedBeatIds.includes(retailer.beat_id);
        const visitType = visit && !isPlanned ? 'Unplanned Visit' : 'Regular Visit';

        // Only show retailers that either have a visit or are in planned beats
        if (!visit && !isPlanned) return null;
        const status = hasOrder ? 'productive' as const : visit?.status === 'unproductive' ? 'unproductive' as const : hasCheckIn ? 'in-progress' as const : 'planned' as const;
        return {
          id: visit?.id || retailerId,
          retailerId: retailer.id,
          retailerName: retailer.name,
          address: retailer.address,
          phone: retailer.phone || '',
          retailerCategory: retailer.category || 'Category A',
          priority: retailer.priority || 'medium',
          status,
          visitType,
          day: 'Today',
          checkInStatus: hasCheckIn ? 'checked-in' as const : 'not-checked-in' as const,
          hasOrder,
          orderValue: orderTotal,
          retailerLat: retailer.latitude != null ? Number(retailer.latitude) : undefined,
          retailerLng: retailer.longitude != null ? Number(retailer.longitude) : undefined,
          lastVisitDate: retailer.last_visit_date,
          checkInTime: visit?.check_in_time,
          checkOutTime: visit?.check_out_time,
          noOrderReason: visit?.no_order_reason
        };
      }).filter(Boolean);
      setRetailers(transformedRetailers);
    } catch (error) {
      console.error('Error loading visits for date:', error);
    }
  };
  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    const dayInfo = weekDays.find(d => d.day === day);
    if (dayInfo) {
      setSelectedDate(dayInfo.isoDate);
    }
  };
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    setCalendarDate(date);
    const weekStart = startOfWeek(date, {
      weekStartsOn: 0
    });
    setSelectedWeek(weekStart);

    // Set the selected day to the picked date
    const newWeekDays = getWeekDays(weekStart);
    const selectedDayInfo = newWeekDays.find(d => isSameDay(d.fullDate, date));
    if (selectedDayInfo) {
      setSelectedDay(selectedDayInfo.day);
      setSelectedDate(selectedDayInfo.isoDate);
    }
  };
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' ? subWeeks(selectedWeek, 1) : addWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
    setCalendarDate(newWeek);

    // Keep the same day of week if possible, otherwise select the first day
    const newWeekDays = getWeekDays(newWeek);
    const sameWeekdayIndex = weekDays.findIndex(d => d.day === selectedDay);
    const targetDay = newWeekDays[sameWeekdayIndex] || newWeekDays[0];
    setSelectedDay(targetDay.day);
    setSelectedDate(targetDay.isoDate);
  };

  // Extract unique categories and locations for filter options
  const availableCategories = useMemo(() => {
    return Array.from(new Set(retailers.map(r => r.retailerCategory).filter(Boolean)));
  }, [retailers]);
  const availableLocations = useMemo(() => {
    return Array.from(new Set(retailers.map(r => {
      // Extract city/area from address
      const addressParts = r.address?.split(',') || [];
      return addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim();
    }).filter(Boolean)));
  }, [retailers]);

  // Show visits for selected date based on planned beats
  const allVisits = retailers;
  const filteredVisits = useMemo(() => {
    return allVisits.filter(visit => {
      const matchesSearch = visit.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) || visit.phone.includes(searchTerm);
      let matchesStatus = true;
      if (statusFilter === 'planned') {
        // Show both planned and in-progress visits
        matchesStatus = visit.status === 'planned' || visit.status === 'in-progress';
      } else if (statusFilter === 'unproductive') {
        matchesStatus = visit.status === 'unproductive';
      } else if (statusFilter) {
        matchesStatus = visit.status === statusFilter;
      }

      // Apply advanced filters
      if (filters.category && visit.retailerCategory !== filters.category) {
        return false;
      }
      if (filters.priority && visit.priority !== filters.priority) {
        return false;
      }

      // Last visit filter
      if (filters.lastVisitDays) {
        const stats = retailerStats.get(visit.retailerId);
        if (filters.lastVisitDays === 'never') {
          if (stats?.daysSinceLastVisit !== null) return false;
        } else {
          const days = parseInt(filters.lastVisitDays);
          if (days === 90) {
            // 90+ days
            if (!stats?.daysSinceLastVisit || stats.daysSinceLastVisit < 90) return false;
          } else {
            if (!stats?.daysSinceLastVisit || stats.daysSinceLastVisit > days) return false;
          }
        }
      }

      // Average sales filter
      if (filters.avgSalesRange) {
        const stats = retailerStats.get(visit.retailerId);
        const avgSales = stats?.avgSales || 0;
        switch (filters.avgSalesRange) {
          case 'high':
            if (avgSales < 20000) return false;
            break;
          case 'medium':
            if (avgSales < 10000 || avgSales >= 20000) return false;
            break;
          case 'low':
            if (avgSales < 5000 || avgSales >= 10000) return false;
            break;
          case 'very-low':
            if (avgSales === 0 || avgSales >= 5000) return false;
            break;
          case 'zero':
            if (avgSales > 0) return false;
            break;
        }
      }

      // Location filter
      if (filters.location) {
        const addressParts = visit.address?.split(',') || [];
        const location = addressParts[addressParts.length - 2]?.trim() || addressParts[addressParts.length - 1]?.trim();
        if (location !== filters.location) return false;
      }
      return matchesSearch && matchesStatus;
    });
  }, [allVisits, searchTerm, statusFilter, filters, retailerStats]);
  const visitsForSelectedDate = retailers;

  // Calculate planned beats count: only beats that have visits still in planned or in-progress status
  const plannedVisitsCount = visitsForSelectedDate.filter(visit => visit.status === "planned" || visit.status === "in-progress").length;
  const productiveVisits = visitsForSelectedDate.filter(visit => visit.status === "productive").length;
  const unproductiveVisits = visitsForSelectedDate.filter(visit => visit.status === "unproductive").length;
  const totalOrdersToday = visitsForSelectedDate.filter(visit => visit.hasOrder).length;
  const handleViewDetails = (visitId: string) => {
    window.location.href = `/visit/${visitId}`;
  };
  const handleStatusClick = (status: string) => {
    if (status === 'planned') {
      // Show both planned and in-progress when clicking planned beats
      setStatusFilter(statusFilter === 'planned' ? "" : 'planned');
    } else if (status === 'unproductive') {
      // Show unproductive visits
      setStatusFilter(statusFilter === 'unproductive' ? "" : 'unproductive');
    } else {
      setStatusFilter(statusFilter === status ? "" : status);
    }
  };
  const handleOrdersClick = async () => {
    if (!user || !selectedDate) return;
    try {
      const todayStart = new Date(selectedDate);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(selectedDate);
      todayEnd.setHours(23, 59, 59, 999);
      const {
        data: orders,
        error
      } = await supabase.from('orders').select(`
          *,
          order_items (
            *
          )
        `).eq('user_id', user.id).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString());
      if (error) throw error;
      setOrdersData(orders || []);
      setIsOrdersDialogOpen(true);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };
  return <Layout>
      <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
        {/* Header Card */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="pb-2 sm:pb-3 rounded-sm">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold">{t('visits.title')}</CardTitle>
              <p className="text-sm sm:text-lg font-semibold mt-1 truncate">{currentBeatName}</p>
            </div>
            
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            {/* Calendar Selector */}
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
               <div className="flex items-center gap-2 flex-1">
                 <Popover>
                   <PopoverTrigger asChild>
                      <Button variant="outline" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm flex-1 sm:flex-none">
                        <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="truncate">
                          {t('visits.weekOf')} {format(selectedWeek, "MMM d, yyyy")}
                        </span>
                      </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0" align="start">
                     <Calendar mode="single" selected={selectedWeek} onSelect={date => {
                    if (date) {
                      const weekStart = startOfWeek(date, {
                        weekStartsOn: 0
                      });
                      setSelectedWeek(weekStart);
                    }
                  }} initialFocus className="pointer-events-auto" />
                   </PopoverContent>
                 </Popover>
               </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 h-8 w-8 p-0">
                  ←
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 h-8 w-8 p-0">
                  →
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {weekDays.map(dayInfo => <button key={dayInfo.day} onClick={() => handleDayChange(dayInfo.day)} className={`relative p-1 sm:p-2 rounded-lg text-center transition-colors min-h-[60px] sm:min-h-auto ${selectedDay === dayInfo.day ? 'bg-primary-foreground text-primary' : dayInfo.isToday ? 'bg-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/40' : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'}`}>
                  <div className="text-[10px] sm:text-xs font-medium">{dayInfo.day}</div>
                  <div className="text-sm sm:text-lg font-bold">{dayInfo.date}</div>
                  {plannedDates.has(dayInfo.isoDate) && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-success" />}
                </button>)}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Button variant="secondary" size="sm" className={`bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto ${selectedDate < new Date().toISOString().split('T')[0] ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={() => window.location.href = '/beat-planning'} disabled={selectedDate < new Date().toISOString().split('T')[0]}>
                <Route size={14} className="mr-1" />
                {t('visits.journeyPlan')}
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto" onClick={() => navigate('/my-retailers')}>
                {t('visits.allRetailers')}
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto" onClick={() => navigate('/add-retailer', {
                state: {
                  returnTo: '/visits/retailers'
                }
              })}>
                + Retailer
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-2">
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto" onClick={() => navigate(`/today-summary?date=${selectedDate}`)}>
                <FileText size={14} className="mr-1" />
                {t('visits.todaysSummary')}
              </Button>
            </div>
            
            {/* Timeline View, GPS Track, and Van Stock Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-2 border-t border-primary-foreground/20 pt-2">
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto" onClick={() => {
              setTimelineDate(selectedDate ? new Date(selectedDate) : new Date());
              setIsTimelineOpen(true);
            }}>
                <Clock size={14} className="mr-1" />
                {t('visits.timeline')}
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto" onClick={() => navigate('/gps-track')}>
                <MapPin size={14} className="mr-1" />
                {t('visits.gpsTrack')}
              </Button>
              <Button variant="secondary" size="sm" className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm h-9 sm:h-auto" onClick={() => setIsVanStockOpen(true)}>
                <Truck size={14} className="mr-1" />
                {t('visits.vanStock')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <h3 className="font-bold text-base sm:text-lg text-primary">{t('visits.todaysProgress')}</h3>
              <div className="text-xs sm:text-sm text-muted-foreground">
                {(selectedDate ? new Date(selectedDate) : new Date()).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'short'
              })}
              </div>
            </div>
            
             {/* Stats Grid - Mobile Responsive */}
             <div className="grid grid-cols-2 gap-2 sm:gap-3">
               <button onClick={() => navigate(`/today-summary?date=${selectedDate}`)} className="bg-gradient-to-r from-success/10 to-success/5 p-2 sm:p-4 rounded-xl border border-success/20 cursor-pointer hover:from-success/15 hover:to-success/10 transition-all flex flex-col items-center justify-center text-center min-h-[80px] sm:min-h-[100px]">
                 <div className="text-lg sm:text-2xl font-bold text-success">₹{visitsForSelectedDate.reduce((sum, visit) => sum + (visit.orderValue || 0), 0).toLocaleString()}</div>
                 <div className="text-xs sm:text-sm text-success/80 font-medium mt-1">{t('visits.totalOrderValue')}</div>
               </button>
               <button onClick={handleOrdersClick} className="bg-gradient-to-r from-primary/10 to-primary/5 p-2 sm:p-4 rounded-xl border border-primary/20 cursor-pointer hover:from-primary/15 hover:to-primary/10 transition-all flex flex-col items-center justify-center text-center min-h-[80px] sm:min-h-[100px]">
                 <div className="text-lg sm:text-2xl font-bold text-primary">{totalOrdersToday}</div>
                 <div className="text-xs sm:text-sm text-primary/80 font-medium mt-1">{t('visits.todaysOrder')}</div>
               </button>
               <button onClick={() => handleStatusClick("planned")} className={`p-2 sm:p-4 rounded-xl text-center transition-all transform hover:scale-105 flex flex-col items-center justify-center min-h-[80px] sm:min-h-[100px] ${statusFilter === "planned" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 border border-blue-200"}`}>
                 <div className="text-lg sm:text-2xl font-bold">{plannedVisitsCount}</div>
                 <div className="text-xs sm:text-sm font-medium opacity-80 mt-1">{t('visits.plannedVisits')}</div>
               </button>
               <button onClick={() => handleStatusClick("unproductive")} className={`p-2 sm:p-4 rounded-xl text-center transition-all transform hover:scale-105 flex flex-col items-center justify-center min-h-[80px] sm:min-h-[100px] ${statusFilter === "unproductive" ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25" : "bg-gradient-to-br from-destructive/10 to-destructive/20 hover:from-destructive/20 hover:to-destructive/30 border border-destructive/30 text-destructive"}`}>
                 <div className="text-lg sm:text-2xl font-bold">{unproductiveVisits}</div>
                 <div className="text-xs sm:text-sm font-medium opacity-80 mt-1">{t('visits.unproductive')}</div>
               </button>
             </div>
           </CardContent>
        </Card>

        {/* AI Recommendations Section */}
        {plannedBeats.length > 0 && currentBeatId && <div className="space-y-3">
            <AIRecommendationBanner recommendations={retailerPriorityRecs} onGenerate={() => generateRetailerRecs('retailer_priority', currentBeatId)} onFeedback={provideRetailerFeedback} loading={retailerRecsLoading} type="retailer_priority" beatId={currentBeatId} />
          </div>}

        {/* Enhanced Search and Filter Bar - Mobile Optimized */}
        <Card className="shadow-card bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-2 sm:p-4 space-y-3">
            <div className="w-full">
              <SearchInput placeholder={t('visits.searchPlaceholder')} value={searchTerm} onChange={setSearchTerm} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="flex-1">
                <VisitFilters filters={filters} onFiltersChange={setFilters} availableCategories={availableCategories} availableLocations={availableLocations} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visits List */}
        <div className="space-y-2 sm:space-y-3">
          {filteredVisits.length === 0 ? <Card className="shadow-card">
              <CardContent className="p-4 sm:p-8 text-center">
                <CalendarIcon size={32} className="sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2 text-sm sm:text-base">{t('visits.noVisitsFound')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  {t('visits.adjustSearch')}
                </p>
                <Button className="mt-2 sm:mt-4 text-xs sm:text-sm h-8 sm:h-auto" onClick={() => setIsCreateVisitModalOpen(true)}>
                  <Plus size={14} className="mr-1 sm:mr-2" />
                  {t('visits.createNewVisit')}
                </Button>
              </CardContent>
            </Card> : filteredVisits.map(visit => <VisitCard key={visit.id} visit={visit} onViewDetails={handleViewDetails} selectedDate={selectedDate} />)}
        </div>

        {/* Create New Visit Modal */}
        <CreateNewVisitModal isOpen={isCreateVisitModalOpen} onClose={() => setIsCreateVisitModalOpen(false)} initialDate={selectedDate} onVisitCreated={() => {
        // Reload data after visit is created
        if (selectedDate) {
          loadPlannedBeats(selectedDate);
        }
      }} />

        {/* Orders Dialog */}
        <Dialog open={isOrdersDialogOpen} onOpenChange={setIsOrdersDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('visits.ordersPlacedToday')}
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-3 sm:mt-4">
              {ordersData.length === 0 ? <div className="text-center py-6 sm:py-8">
                  <p className="text-muted-foreground text-sm sm:text-base">{t('visits.noOrdersToday')}</p>
                </div> : <div className="space-y-3 sm:space-y-4">
                  {ordersData.map((order, index) => <Card key={order.id} className="border border-border/40">
                      <CardHeader className="pb-2 sm:pb-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm sm:text-base">{t('visits.orderNumber')}{index + 1}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {order.retailer_name} • {format(new Date(order.created_at), 'hh:mm a')}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs sm:text-sm">
                            ₹{Number(order.total_amount).toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {order.order_items && order.order_items.length > 0 && <div className="space-y-2">
                            <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('visits.items')}</p>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.product')}</TableHead>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.quantity')}</TableHead>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.rate')}</TableHead>
                                    <TableHead className="text-xs sm:text-sm">{t('visits.total')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {order.order_items.map((item: any) => <TableRow key={item.id}>
                                      <TableCell className="text-xs sm:text-sm">{item.product_name}</TableCell>
                                      <TableCell className="text-xs sm:text-sm">{item.quantity} {item.unit}</TableCell>
                                      <TableCell className="text-xs sm:text-sm">₹{Number(item.rate).toLocaleString()}</TableCell>
                                      <TableCell className="text-xs sm:text-sm">₹{Number(item.total).toLocaleString()}</TableCell>
                                    </TableRow>)}
                                </TableBody>
                              </Table>
                            </div>
                          </div>}
                      </CardContent>
                    </Card>)}
                </div>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Timeline View Dialog */}
        <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('visits.timelineView')} - {format(timelineDate, 'MMM dd, yyyy')}</DialogTitle>
            </DialogHeader>
            <TimelineView visits={timelineVisits} dayStart={timelineDayStart} selectedDate={timelineDate} onDateChange={date => {
            setTimelineDate(date);
            loadTimelineVisits(date);
          }} />
          </DialogContent>
        </Dialog>

        {/* Van Stock Management Dialog */}
        <VanStockManagement open={isVanStockOpen} onOpenChange={setIsVanStockOpen} selectedDate={selectedDate} />
      </div>
    </Layout>;
};