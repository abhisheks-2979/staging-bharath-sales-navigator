import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Download, Share, FileText, Clock, MapPin, CalendarIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, parse } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ReportGenerator } from "@/components/ReportGenerator";
import { calculateJointVisitScore } from "@/components/JointSalesFeedbackModal";
import { JointSalesFeedbackViewModal } from "@/components/JointSalesFeedbackViewModal";

type DateFilterType = 'today' | 'week' | 'lastWeek' | 'month' | 'custom' | 'dateRange';

export const TodaySummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  
  // Date filtering state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date()
  });
  const [filterType, setFilterType] = useState<DateFilterType>('today');
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Real data state
  const [summaryData, setSummaryData] = useState({
    date: selectedDate.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    beat: "Loading...",
    beatNames: [] as string[],
    startTime: "Loading...",
    endTime: "Loading...",
    plannedVisits: 0,
    completedVisits: 0,
    productiveVisits: 0,
    totalOrders: 0,
    totalOrderValue: 0,
    avgOrderValue: 0,
    totalKgSold: 0,
    totalKgSoldFormatted: "0 KG",
    visitEfficiency: 0,
    orderConversionRate: 0,
    distanceCovered: 0,
    travelTime: "0h 0m",
  });

  const [visitBreakdown, setVisitBreakdown] = useState([
    { status: "Productive", count: 0, color: "success" },
    { status: "Unproductive", count: 0, color: "destructive" },
    { status: "Store Closed", count: 0, color: "muted" },
    { status: "Pending", count: 0, color: "warning" }
  ]);

  const [topRetailers, setTopRetailers] = useState<Array<{ name: string; orderValue: number; location: string }>>([]);
  const [productSales, setProductSales] = useState<Array<{ name: string; kgSold: number; kgFormatted: string; revenue: number }>>([]);
  const [orders, setOrders] = useState<Array<{ retailer: string; amount: number; kgSold: number; kgFormatted: string; creditAmount: number; cashInHand: number; paymentMethod: string }>>([]);
  const [visitsByStatus, setVisitsByStatus] = useState<Record<string, Array<{ retailer: string; note?: string }>>>({});
  const [productGroupedOrders, setProductGroupedOrders] = useState<Array<{ product: string; kgSold: number; kgFormatted: string; value: number; orders: number }>>([]);
  
  // Joint Sales Data
  const [jointSalesData, setJointSalesData] = useState<{
    totalVisits: number;
    retailersCovered: number;
    memberName: string;
    orderIncrease: number;
    avgScore: number;
    feedback: Array<{ retailerId: string; retailerName: string; impact: string; orderIncrease: number; score: number; feedbackDate: string }>;
  } | null>(null);
  
  // Retailer-based report data
  const [retailerReportData, setRetailerReportData] = useState<Array<{
    retailerName: string;
    address: string;
    phoneNumber: string;
    visitStatus: string;
    orderPerKG: number;
    totalValue: number;
  }>>([]);

  const [pointsEarnedToday, setPointsEarnedToday] = useState(0);

  // Dialog state and data sources for details
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogContentType, setDialogContentType] = useState<"orders" | "visits" | "efficiency" | "products" | "kgBreakdown" | "retailerValue">("orders");
  const [dialogFilter, setDialogFilter] = useState<string | null>(null);
  
  // Joint Sales Feedback View Modal state
  const [jointFeedbackViewOpen, setJointFeedbackViewOpen] = useState(false);
  const [selectedJointFeedback, setSelectedJointFeedback] = useState<{ retailerId: string; retailerName: string; feedbackDate: string } | null>(null);

  // Handle URL query parameter for date from Attendance page
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      try {
        const parsedDate = parse(dateParam, 'yyyy-MM-dd', new Date());
        handleDateFilterChange('custom', parsedDate);
      } catch (error) {
        console.error('Error parsing date from URL:', error);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTodaysData();
  }, [dateRange, filterType]);

  // Auto-refresh when page becomes visible or when focusing on today's data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && filterType === 'today') {
        console.log('Page visible, refreshing today\'s data...');
        fetchTodaysData();
      }
    };

    const handleFocus = () => {
      if (filterType === 'today') {
        console.log('Window focused, refreshing today\'s data...');
        fetchTodaysData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Auto-refresh every 30 seconds when viewing today's data
    let refreshInterval: number | null = null;
    if (filterType === 'today') {
      refreshInterval = window.setInterval(() => {
        console.log('Auto-refreshing today\'s data...');
        fetchTodaysData();
      }, 30000); // 30 seconds
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [dateRange, filterType]);

  const handleDateFilterChange = (type: DateFilterType, date?: Date, rangeTo?: Date) => {
    setFilterType(type);
    
    const now = new Date();
    
    switch (type) {
      case 'today':
        setDateRange({ from: now, to: now });
        setSelectedDate(now);
        break;
      case 'week':
        setDateRange({ 
          from: startOfWeek(now, { weekStartsOn: 1 }), 
          to: endOfWeek(now, { weekStartsOn: 1 }) 
        });
        setSelectedDate(now);
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        setDateRange({ 
          from: startOfWeek(lastWeek, { weekStartsOn: 1 }), 
          to: endOfWeek(lastWeek, { weekStartsOn: 1 }) 
        });
        setSelectedDate(lastWeek);
        break;
      case 'month':
        setDateRange({ 
          from: startOfMonth(now), 
          to: endOfMonth(now) 
        });
        setSelectedDate(now);
        break;
      case 'custom':
        if (date) {
          setDateRange({ from: date, to: date });
          setSelectedDate(date);
        }
        break;
      case 'dateRange':
        if (date && rangeTo) {
          setDateRange({ from: date, to: rangeTo });
          setSelectedDate(date);
        }
        break;
    }
  };

  const fetchTodaysData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch attendance data for the selected period
      let attendanceQuery = supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id);

      if (filterType === 'today' || filterType === 'custom') {
        const targetDate = format(dateRange.from, 'yyyy-MM-dd');
        attendanceQuery = attendanceQuery.eq('date', targetDate);
      } else {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        attendanceQuery = attendanceQuery.gte('date', fromDate).lte('date', toDate);
      }

      const { data: attendanceData } = await attendanceQuery;

      // Determine date query based on filter type
      let visitsQuery = supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id);

      if (filterType === 'today' || filterType === 'custom') {
        const targetDate = format(dateRange.from, 'yyyy-MM-dd');
        visitsQuery = visitsQuery.eq('planned_date', targetDate);
      } else {
        // For week/lastWeek/month, use date range
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        visitsQuery = visitsQuery.gte('planned_date', fromDate).lte('planned_date', toDate);
      }

      // Execute visits query first
      const { data: visits } = await visitsQuery;

      // Fetch orders based on created_at date (not visit_id, since many orders don't have visit_id linked)
      let todayOrders: any[] = [];
      
      // Build date range for orders query
      const orderFromDate = new Date(dateRange.from);
      orderFromDate.setHours(0, 0, 0, 0);
      const orderToDate = new Date(dateRange.to);
      orderToDate.setHours(23, 59, 59, 999);
      
      const { data: fetchedOrders } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('created_at', orderFromDate.toISOString())
        .lte('created_at', orderToDate.toISOString());
      
      todayOrders = fetchedOrders || [];

      // Fetch retailers for today's visits
      const retailerIds = visits?.map(v => v.retailer_id) || [];
      let retailers: any[] = [];
      if (retailerIds.length > 0) {
        const { data } = await supabase
          .from('retailers')
          .select('id, name, address, phone')
          .in('id', retailerIds);
        retailers = data || [];
      }

      // Fetch points earned for the date range
      const fromDate = filterType === 'today' || filterType === 'custom' ? dateRange.from : dateRange.from;
      const toDate = filterType === 'today' || filterType === 'custom' ? dateRange.to : dateRange.to;
      const { data: pointsData } = await supabase
        .from('gamification_points')
        .select('points')
        .eq('user_id', user.id)
        .gte('earned_at', new Date(fromDate).toISOString())
        .lte('earned_at', new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).toISOString());
      
      const totalPointsEarned = pointsData?.reduce((sum, item) => sum + item.points, 0) || 0;
      setPointsEarnedToday(totalPointsEarned);

      // Fetch beat plans for the date range
      let beatPlansQuery = supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', user.id);

      if (filterType === 'today' || filterType === 'custom') {
        const targetDate = format(dateRange.from, 'yyyy-MM-dd');
        beatPlansQuery = beatPlansQuery.eq('plan_date', targetDate);
      } else {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        beatPlansQuery = beatPlansQuery.gte('plan_date', fromDate).lte('plan_date', toDate);
      }

      const { data: beatPlans } = await beatPlansQuery;
      const beatPlan = beatPlans && beatPlans.length > 0 ? beatPlans[0] : null;
      
      // Fetch ALL joint sales feedback for the user in the date range
      // This includes both beat plan-linked and independently recorded feedback
      const jointFromDate = format(dateRange.from, 'yyyy-MM-dd');
      const jointToDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const { data: jointSalesFeedback } = await supabase
        .from('joint_sales_feedback')
        .select('*, retailers(name)')
        .eq('fse_user_id', user.id)
        .gte('feedback_date', jointFromDate)
        .lte('feedback_date', jointToDate);
      
      if (jointSalesFeedback && jointSalesFeedback.length > 0) {
        // Get unique manager IDs and fetch their names
        const uniqueManagerIds = [...new Set(jointSalesFeedback.map(f => f.manager_id).filter(Boolean))];
        
        let memberNames: string[] = [];
        if (uniqueManagerIds.length > 0) {
          const { data: memberProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', uniqueManagerIds);
          
          memberNames = memberProfiles?.map(p => p.full_name || 'Unknown') || [];
        }
        
        const totalOrderIncrease = jointSalesFeedback.reduce((sum, f) => sum + (f.order_increase_amount || 0), 0);
        const uniqueRetailers = new Set(jointSalesFeedback.map(f => f.retailer_id)).size;
        
        // Create a map of manager names for feedback display
        const managerNameMap = new Map();
        if (uniqueManagerIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', uniqueManagerIds);
          profiles?.forEach(p => managerNameMap.set(p.id, p.full_name || 'Unknown'));
        }
        
        // Calculate scores for each feedback
        const feedbackWithScores = jointSalesFeedback.map(f => ({
          retailerId: f.retailer_id,
          retailerName: (f.retailers as any)?.name || 'Unknown',
          impact: f.joint_sales_impact || 'No impact notes',
          orderIncrease: f.order_increase_amount || 0,
          score: calculateJointVisitScore(f),
          feedbackDate: f.feedback_date
        }));
        
        const avgScore = feedbackWithScores.length > 0 
          ? Math.round((feedbackWithScores.reduce((sum, f) => sum + f.score, 0) / feedbackWithScores.length) * 10) / 10
          : 0;
        
        setJointSalesData({
          totalVisits: jointSalesFeedback.length,
          retailersCovered: uniqueRetailers,
          memberName: memberNames.length > 0 ? memberNames.join(', ') : 'Unknown',
          orderIncrease: totalOrderIncrease,
          avgScore,
          feedback: feedbackWithScores
        });
      } else {
        setJointSalesData(null);
      }
      
      // Collect all unique beat names
      const uniqueBeatNames = beatPlans 
        ? Array.from(new Set(beatPlans.map(bp => bp.beat_name).filter(Boolean)))
        : [];
      const beatNamesDisplay = uniqueBeatNames.length > 0 ? uniqueBeatNames : ['No beat planned'];

      // Create retailer lookup map
      const retailerMap = new Map();
      retailers?.forEach(retailer => {
        retailerMap.set(retailer.id, retailer);
      });

      // Process visits data
      const totalPlanned = visits?.length || 0;
      const completedVisits = visits?.filter(v => v.check_out_time !== null) || [];
      const productiveVisits = visits?.filter(v => v.status === 'productive') || [];
      const pendingVisits = visits?.filter(v => v.status === 'planned') || [];
      const closedVisits = visits?.filter(v => v.status === 'store_closed') || [];
      const unproductiveVisits = visits?.filter(v => v.status === 'unproductive') || [];

      // Get attendance start/end times from attendance table
      const allAttendanceCheckIns = attendanceData?.filter(a => a.check_in_time).map(a => new Date(a.check_in_time!)) || [];
      const allAttendanceCheckOuts = attendanceData?.filter(a => a.check_out_time).map(a => new Date(a.check_out_time!)) || [];
      
      const firstCheckIn = allAttendanceCheckIns.length > 0 
        ? new Date(Math.min(...allAttendanceCheckIns.map(t => t.getTime())))
        : null;
      const lastCheckOut = allAttendanceCheckOuts.length > 0 
        ? new Date(Math.max(...allAttendanceCheckOuts.map(t => t.getTime())))
        : null;

      const formatTime = (date: Date | null) => {
        if (!date) return "Not started";
        return date.toLocaleTimeString('en-IN', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
      };

      // Process orders data
      const totalOrderValue = todayOrders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const totalOrdersCount = todayOrders?.length || 0;
      const avgOrderValue = totalOrdersCount > 0 ? totalOrderValue / totalOrdersCount : 0;
      
      // Calculate total KG sold (convert all units to KG)
      const convertToKg = (quantity: number, unit: string): number => {
        const lowerUnit = unit.toLowerCase();
        if (lowerUnit === 'kg' || lowerUnit === 'kilogram' || lowerUnit === 'kilograms') {
          return quantity;
        } else if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams') {
          return quantity / 1000;
        } else if (lowerUnit === 'l' || lowerUnit === 'liter' || lowerUnit === 'liters' || lowerUnit === 'litre' || lowerUnit === 'litres') {
          return quantity; // Treat liters as KG for beverages
        } else if (lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters' || lowerUnit === 'millilitre' || lowerUnit === 'millilitres') {
          return quantity / 1000; // Convert ml to liters/kg
        }
        return 0; // For pieces and other units, don't count towards KG
      };
      
      const formatKg = (totalGrams: number): string => {
        const kg = Math.floor(totalGrams);
        const grams = Math.round((totalGrams - kg) * 1000);
        if (grams === 0) {
          return `${kg} KG`;
        }
        return `${kg} KG ${grams} g`;
      };
      
      let totalKgFromOrders = 0;
      todayOrders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          totalKgFromOrders += convertToKg(item.quantity, item.unit || 'piece');
        });
      });
      
      const totalKgSoldFormatted = formatKg(totalKgFromOrders);

      // Calculate distance and time metrics
      let totalDistance = 0;
      let timeAtRetailers = 0;
      
      console.log('📊 Today\'s Summary Data:', {
        totalVisits: visits?.length || 0,
        completedVisits: completedVisits.length,
        totalOrders: totalOrdersCount,
        totalOrderValue
      });
      
      if (visits && visits.length > 0) {
        // Sort visits by check-in time to calculate distance in order
        const sortedVisits = [...visits].sort((a, b) => {
          if (!a.check_in_time) return 1;
          if (!b.check_in_time) return -1;
          return new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime();
        });
        
        // Calculate distance between consecutive visits
        let distanceCalculated = 0;
        for (let i = 0; i < sortedVisits.length - 1; i++) {
          const v1 = sortedVisits[i];
          const v2 = sortedVisits[i + 1];
          
          if (v1.check_in_location && v2.check_in_location && 
              typeof v1.check_in_location === 'object' && 
              typeof v2.check_in_location === 'object') {
            const loc1 = v1.check_in_location as any;
            const loc2 = v2.check_in_location as any;
            const lat1 = loc1.latitude;
            const lon1 = loc1.longitude;
            const lat2 = loc2.latitude;
            const lon2 = loc2.longitude;
            
            if (lat1 && lon1 && lat2 && lon2) {
              const R = 6371;
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLon = (lon2 - lon1) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                       Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              totalDistance += distance;
              distanceCalculated++;
            }
          }
        }
        
        console.log('🗺️ Distance calculated between', distanceCalculated, 'visit pairs');
        
        // Calculate time spent at retailers (check-in to check-out)
        completedVisits.forEach(visit => {
          if (visit.check_in_time && visit.check_out_time) {
            const checkIn = new Date(visit.check_in_time);
            const checkOut = new Date(visit.check_out_time);
            const minutesAtRetailer = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
            timeAtRetailers += minutesAtRetailer;
          }
        });
      }
      
      const hours = Math.floor(timeAtRetailers / 60);
      const minutes = Math.round(timeAtRetailers % 60);
      const timeAtRetailersStr = `${hours}h ${minutes}m`;

      // Update summary data with dynamic title
      const getDateTitle = () => {
        if (filterType === 'today') return 'Today';
        if (filterType === 'week') return 'This Week';
        if (filterType === 'lastWeek') return 'Last Week';
        if (filterType === 'month') return 'This Month';
        return format(selectedDate, 'dd MMM yyyy');
      };

      setSummaryData({
        date: filterType === 'today' || filterType === 'custom' 
          ? selectedDate.toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : `${format(dateRange.from, 'dd MMM')} - ${format(dateRange.to, 'dd MMM yyyy')}`,
        beat: beatPlan?.beat_name || "No beat planned",
        beatNames: beatNamesDisplay,
        startTime: formatTime(firstCheckIn),
        endTime: lastCheckOut ? formatTime(lastCheckOut) : (firstCheckIn ? "In Progress" : "Not started"),
        plannedVisits: totalPlanned,
        completedVisits: completedVisits.length,
        productiveVisits: productiveVisits.length,
        totalOrders: totalOrdersCount,
        totalOrderValue,
        avgOrderValue,
        totalKgSold: totalKgFromOrders,
        totalKgSoldFormatted,
        visitEfficiency: totalPlanned > 0 ? Math.round((completedVisits.length / totalPlanned) * 100) : 0,
        orderConversionRate: completedVisits.length > 0 ? Math.round((productiveVisits.length / completedVisits.length) * 100) : 0,
        distanceCovered: totalDistance > 0 ? Math.round(totalDistance * 10) / 10 : 0,
        travelTime: timeAtRetailersStr
      });
      
      console.log('📈 Calculated Metrics:', {
        distanceCovered: Math.round(totalDistance * 10) / 10,
        timeAtRetailers: timeAtRetailersStr,
        visitEfficiency: totalPlanned > 0 ? Math.round((completedVisits.length / totalPlanned) * 100) : 0,
        orderConversionRate: completedVisits.length > 0 ? Math.round((productiveVisits.length / completedVisits.length) * 100) : 0
      });

      // Update visit breakdown
      setVisitBreakdown([
        { status: "Productive", count: productiveVisits.length, color: "success" },
        { status: "Unproductive", count: unproductiveVisits.length, color: "destructive" },
        { status: "Store Closed", count: closedVisits.length, color: "muted" },
        { status: "Pending", count: pendingVisits.length, color: "warning" }
      ]);

      // Process top retailers (based on order value)
      const retailerOrderMap = new Map();
      todayOrders?.forEach(order => {
        const retailer = retailerMap.get(order.retailer_id);
        const existing = retailerOrderMap.get(order.retailer_name) || { value: 0, location: '' };
        retailerOrderMap.set(order.retailer_name, {
          value: existing.value + Number(order.total_amount || 0),
          location: retailer?.address || 'Location not available'
        });
      });

      const topRetailersData = Array.from(retailerOrderMap.entries())
        .map(([name, data]) => ({ name, orderValue: data.value, location: data.location }))
        .sort((a, b) => b.orderValue - a.orderValue)
        .slice(0, 4);

      setTopRetailers(topRetailersData);

      // Process product sales with KG conversion
      const productSalesMap = new Map();
      todayOrders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const existing = productSalesMap.get(item.product_name) || { kgSold: 0, revenue: 0 };
          const itemKg = convertToKg(item.quantity, item.unit || 'piece');
          productSalesMap.set(item.product_name, {
            kgSold: existing.kgSold + itemKg,
            revenue: existing.revenue + Number(item.total || 0)
          });
        });
      });

      const productSalesData = Array.from(productSalesMap.entries())
        .map(([name, data]) => ({ 
          name, 
          kgSold: data.kgSold,
          kgFormatted: data.kgSold > 0 ? formatKg(data.kgSold) : 'N/A',
          revenue: data.revenue 
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setProductSales(productSalesData);

      // Process orders for dialog
      const ordersData = todayOrders?.map(order => {
        let kgSum = 0;
        order.order_items?.forEach((item: any) => {
          kgSum += convertToKg(item.quantity, item.unit || 'piece');
        });
        
        // Derive credit from multiple fields with safe fallbacks
        const totalAmount = Number(order.total_amount ?? 0);
        const paid = Number(order.credit_paid_amount ?? order.amount_paid ?? 0);
        const pendingField = order.pending_amount ?? order.credit_pending_amount;
        const derivedPending = (order.is_credit_order ? Math.max(0, totalAmount - paid) : 0);
        const creditAmount = Number(pendingField ?? derivedPending ?? 0);
        
        // Format payment method for display
        const paymentMethod = order.payment_method 
          ? order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)
          : 'N/A';
        
        // Debug log to verify credit calculation in runtime
        try {
          console.log('[TodaySummary] Order credit calc', {
            order_id: order.id,
            retailer: order.retailer_name,
            totalAmount,
            paid,
            pending_amount: order.pending_amount,
            credit_pending_amount: order.credit_pending_amount,
            is_credit_order: order.is_credit_order,
            derivedPending,
            creditAmount
          });
        } catch (e) {}
        
        return {
          retailer: order.retailer_name,
          amount: totalAmount,
          kgSold: kgSum,
          kgFormatted: kgSum > 0 ? formatKg(kgSum) : '0 KG',
          creditAmount: creditAmount,
          cashInHand: totalAmount - creditAmount,
          paymentMethod: paymentMethod
        };
      }) || [];

      setOrders(ordersData);

      // Process product-grouped orders for Total Order Value dialog with KG
      const productOrderMap = new Map();
      todayOrders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const existing = productOrderMap.get(item.product_name) || { kgSold: 0, value: 0, orderCount: 0 };
          const itemKg = convertToKg(item.quantity, item.unit || 'piece');
          productOrderMap.set(item.product_name, {
            kgSold: existing.kgSold + itemKg,
            value: existing.value + Number(item.total || 0),
            orderCount: existing.orderCount + 1
          });
        });
      });

      const productGroupedData = Array.from(productOrderMap.entries())
        .map(([product, data]) => ({ 
          product, 
          kgSold: data.kgSold,
          kgFormatted: data.kgSold > 0 ? formatKg(data.kgSold) : 'N/A',
          value: data.value,
          orders: data.orderCount
        }))
        .sort((a, b) => b.value - a.value);

      setProductGroupedOrders(productGroupedData);

      // Process visits by status for dialog
      const visitsByStatusData = {
        Productive: productiveVisits.map(v => ({ retailer: retailerMap.get(v.retailer_id)?.name || 'Unknown' })),
        Unproductive: unproductiveVisits.map(v => ({ retailer: retailerMap.get(v.retailer_id)?.name || 'Unknown', note: v.no_order_reason || 'No order placed' })),
        "Store Closed": closedVisits.map(v => ({ retailer: retailerMap.get(v.retailer_id)?.name || 'Unknown', note: 'Store was closed' })),
        Pending: pendingVisits.map(v => ({ retailer: retailerMap.get(v.retailer_id)?.name || 'Unknown' }))
      };

      setVisitsByStatus(visitsByStatusData);

      // Prepare retailer-based report data - fetch additional retailer details if needed
      const retailerReportDataArray: Array<{
        retailerName: string;
        address: string;
        phoneNumber: string;
        visitStatus: string;
        orderPerKG: number;
        totalValue: number;
      }> = [];
      
      // Process each visit to build comprehensive report data
      for (const visit of (visits || [])) {
        const retailer = retailerMap.get(visit.retailer_id);
        const retailerOrders = todayOrders?.filter(o => o.retailer_id === visit.retailer_id) || [];
        
        let totalKgForRetailer = 0;
        let totalValueForRetailer = 0;
        
        retailerOrders.forEach(order => {
          order.order_items?.forEach((item: any) => {
            totalKgForRetailer += convertToKg(item.quantity, item.unit || 'piece');
          });
          totalValueForRetailer += Number(order.total_amount || 0);
        });
        
        // Determine visit status
        let visitStatus = 'Pending';
        if (visit.status === 'productive') visitStatus = 'Productive';
        else if (visit.status === 'unproductive') visitStatus = 'Non-Productive';
        else if (visit.status === 'store_closed') visitStatus = 'Store Closed';
        else if (visit.status === 'canceled') visitStatus = 'Canceled';
        else if (visit.status === 'planned') visitStatus = 'Planned';
        
        // Use retailer data from the map, with fallbacks
        const retailerName = retailer?.name || 'Unknown Retailer';
        const retailerAddress = retailer?.address || 'Address not available';
        const retailerPhone = retailer?.phone || 'Phone not available';
        
        console.log('Report row data:', {
          visitId: visit.id,
          retailerId: visit.retailer_id,
          retailerName,
          retailerAddress,
          retailerPhone,
          visitStatus,
          totalKgForRetailer,
          totalValueForRetailer
        });
        
        retailerReportDataArray.push({
          retailerName,
          address: retailerAddress,
          phoneNumber: retailerPhone,
          visitStatus,
          orderPerKG: totalKgForRetailer,
          totalValue: totalValueForRetailer
        });
      }
      
      console.log('Final report data:', retailerReportDataArray);
      setRetailerReportData(retailerReportDataArray);

    } catch (error) {
      console.error('Error fetching today\'s data:', error);
      toast({
        title: "Error",
        description: "Failed to load today's data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openProductsDialog = () => {
    setDialogTitle("Orders by Product");
    setDialogContentType("products");
    setDialogFilter(null);
    setDialogOpen(true);
  };

  const openRetailerValueDialog = () => {
    setDialogTitle("Order Value by Retailer");
    setDialogContentType("retailerValue");
    setDialogFilter(null);
    setDialogOpen(true);
  };

  const openKgBreakdownDialog = () => {
    setDialogTitle("Total KG Sold - Product-wise Breakdown");
    setDialogContentType("kgBreakdown");
    setDialogFilter(null);
    setDialogOpen(true);
  };

  const openOrdersDialog = (title: string) => {
    setDialogTitle(title);
    setDialogContentType("orders");
    setDialogFilter(null);
    setDialogOpen(true);
  };

  const openEfficiencyDialog = () => {
    setDialogTitle("Visit Efficiency Details");
    setDialogContentType("efficiency");
    setDialogFilter(null);
    setDialogOpen(true);
  };

  const openVisitsDialog = (status: string) => {
    setDialogTitle(`${status} Visits`);
    setDialogContentType("visits");
    setDialogFilter(status);
    setDialogOpen(true);
  };

  const sanitizeText = (text: string): string => {
    // Remove or replace non-ASCII characters that don't render well in PDFs
    return text
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(60, 60, 60);
      doc.text(
        filterType === 'today' ? "Today's Summary" : 
        filterType === 'week' ? "This Week's Summary" :
        filterType === 'lastWeek' ? "Last Week's Summary" :
        filterType === 'month' ? "Monthly Summary" :
        filterType === 'dateRange' ? "Date Range Summary" : "Visit Summary", 
        pageWidth / 2, 
        yPosition, 
        { align: 'center' }
      );
      
      yPosition += 10;
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(summaryData.date, pageWidth / 2, yPosition, { align: 'center' });
      
      // Beat Information
      yPosition += 15;
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text(`Beat: ${summaryData.beat}`, 14, yPosition);
      yPosition += 7;
      doc.text(`Start: ${summaryData.startTime} | End: ${summaryData.endTime}`, 14, yPosition);
      
      // Key Metrics Section
      yPosition += 15;
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text("Key Metrics", 14, yPosition);
      yPosition += 10;
      
      const metricsData = [
        ['Total Order Value', `Rs. ${summaryData.totalOrderValue.toLocaleString('en-IN')}`],
        ['Orders Placed', summaryData.totalOrders.toString()],
        ['Total KG Sold', summaryData.totalKgSoldFormatted],
        ['Avg Order Value', `Rs. ${summaryData.avgOrderValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`]
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: metricsData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Visit Breakdown Section
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text("Visit Breakdown", 14, yPosition);
      yPosition += 10;
      
      const visitBreakdownData = visitBreakdown.map(item => [
        item.status,
        item.count.toString(),
        `${summaryData.plannedVisits > 0 ? Math.round((item.count / summaryData.plannedVisits) * 100) : 0}%`
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Status', 'Count', 'Percentage']],
        body: visitBreakdownData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Top Performing Retailers
      if (topRetailers.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text("Top Performing Retailers", 14, yPosition);
        yPosition += 10;
        
        const retailersData = topRetailers.map((retailer, index) => [
          `#${index + 1}`,
          sanitizeText(retailer.name) || 'Unknown Retailer',
          sanitizeText(retailer.location) || 'Location not available',
          `Rs. ${retailer.orderValue.toLocaleString('en-IN')}`
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Rank', 'Retailer', 'Location', 'Order Value']],
          body: retailersData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Product-wise Sales
      if (productSales.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text("Product-wise Sales", 14, yPosition);
        yPosition += 10;
        
        const productsData = productSales.map(p => [
          sanitizeText(p.name) || 'Unknown Product',
          p.kgFormatted,
          `Rs. ${p.revenue.toLocaleString('en-IN')}`
        ]);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Product', 'KG Sold', 'Revenue']],
          body: productsData,
          theme: 'grid',
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Joint Sales Highlight (if available)
      if (jointSalesData) {
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text("Joint Sales Visit Highlight", 14, yPosition);
        yPosition += 10;
        
        const jointSalesMetrics = [
          ['Joint Sales Member', sanitizeText(jointSalesData.memberName)],
          ['Retailers Covered', jointSalesData.retailersCovered.toString()],
          ['Total Feedback Entries', jointSalesData.totalVisits.toString()],
          ['Order Increase', `Rs. ${jointSalesData.orderIncrease.toLocaleString('en-IN')}`]
        ];
        
        autoTable(doc, {
          startY: yPosition,
          head: [['Metric', 'Value']],
          body: jointSalesMetrics,
          theme: 'grid',
          headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
          margin: { left: 14, right: 14 }
        });
        
        yPosition = (doc as any).lastAutoTable.finalY + 10;
        
        // Joint Sales Feedback Details
        if (jointSalesData.feedback.length > 0) {
          const feedbackData = jointSalesData.feedback.map(f => [
            sanitizeText(f.retailerName),
            sanitizeText(f.impact).substring(0, 50) + (f.impact.length > 50 ? '...' : ''),
            `Rs. ${f.orderIncrease.toLocaleString('en-IN')}`
          ]);
          
          autoTable(doc, {
            startY: yPosition,
            head: [['Retailer', 'Impact Notes', 'Order Increase']],
            body: feedbackData,
            theme: 'grid',
            headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8 },
            margin: { left: 14, right: 14 }
          });
          
          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
      }
      
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Performance Summary
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text("Performance Summary", 14, yPosition);
      yPosition += 10;
      
      const performanceData = [
        ['Planned Visits', summaryData.plannedVisits.toString()],
        ['Completed Visits', summaryData.completedVisits.toString()],
        ['Order Conversion Rate', `${summaryData.orderConversionRate}%`],
        ['Distance Covered', summaryData.distanceCovered > 0 ? `${summaryData.distanceCovered} km` : 'No location data'],
        ['Time at Retailers', summaryData.travelTime]
      ];
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: performanceData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 }
      });
      
      // Save the PDF
      const fileName = `Summary_${format(selectedDate, 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF Downloaded",
        description: `${fileName} has been downloaded successfully`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    toast({
      title: "Summary Shared",
      description: "Today's summary has been shared with your team",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading today's summary...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-xl font-bold">
                  {filterType === 'today' ? "Today's Summary" : 
                   filterType === 'week' ? "This Week's Summary" :
                   filterType === 'lastWeek' ? "Last Week's Summary" :
                   filterType === 'month' ? "Monthly Summary" :
                   filterType === 'dateRange' ? "Date Range Summary" :
                   "Visit Summary"}
                </CardTitle>
                <p className="text-primary-foreground/80">{summaryData.date}</p>
              </div>
            </div>
            <FileText size={24} />
          </CardHeader>
        </Card>

        {/* Date Filter Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Quick Filter Buttons */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant={filterType === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('today')}
                  className="text-xs"
                >
                  Today
                </Button>
                <Button
                  variant={filterType === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('week')}
                  className="text-xs"
                >
                  Week
                </Button>
                <Button
                  variant={filterType === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('month')}
                  className="text-xs"
                >
                  Month
                </Button>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={filterType === 'dateRange' || filterType === 'custom' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                    >
                      <CalendarIcon className="mr-1 h-3 w-3" />
                      Range
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from) {
                          if (range.to) {
                            handleDateFilterChange('dateRange', range.from, range.to);
                            setCalendarOpen(false);
                          } else {
                            // Single date selected - treat as custom single day
                            handleDateFilterChange('custom', range.from);
                          }
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Date Display with Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (filterType === 'today' || filterType === 'custom') {
                      newDate.setDate(newDate.getDate() - 1);
                      handleDateFilterChange('custom', newDate);
                    } else if (filterType === 'week') {
                      newDate.setDate(newDate.getDate() - 7);
                      handleDateFilterChange('week', newDate);
                    } else if (filterType === 'month') {
                      newDate.setMonth(newDate.getMonth() - 1);
                      handleDateFilterChange('month', newDate);
                    }
                  }}
                >
                  ←
                </Button>
                <div className="flex-1 text-center font-medium text-sm">
                  {filterType === 'today' ? format(selectedDate, 'EEEE, d MMMM yyyy') :
                   filterType === 'custom' ? format(selectedDate, 'EEEE, d MMMM yyyy') :
                   filterType === 'week' ? `${format(dateRange.from, 'd MMM')} - ${format(dateRange.to, 'd MMM yyyy')}` :
                   filterType === 'month' ? format(selectedDate, 'MMMM yyyy') :
                   filterType === 'dateRange' ? `${format(dateRange.from, 'd MMM')} - ${format(dateRange.to, 'd MMM yyyy')}` :
                   format(selectedDate, 'd MMM yyyy')}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (filterType === 'today' || filterType === 'custom') {
                      newDate.setDate(newDate.getDate() + 1);
                      handleDateFilterChange('custom', newDate);
                    } else if (filterType === 'week') {
                      newDate.setDate(newDate.getDate() + 7);
                      handleDateFilterChange('week', newDate);
                    } else if (filterType === 'month') {
                      newDate.setMonth(newDate.getMonth() + 1);
                      handleDateFilterChange('month', newDate);
                    }
                  }}
                >
                  →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 text-xs sm:text-sm"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <ReportGenerator 
            data={retailerReportData}
            dateRange={
              filterType === 'today' ? format(selectedDate, 'MMM dd, yyyy') :
              filterType === 'week' ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` :
              filterType === 'lastWeek' ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` :
              filterType === 'month' ? format(selectedDate, 'MMMM yyyy') :
              filterType === 'dateRange' ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}` :
              format(selectedDate, 'MMM dd, yyyy')
            }
          />
        </div>

        {/* Selected Period Information - Beat on top, times below */}
        <Card>
          <CardContent className="p-3 space-y-2">
            {/* Beat Name - Top */}
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-primary shrink-0" />
              <span className="font-semibold text-sm">
                {summaryData.beatNames.length > 0 
                  ? summaryData.beatNames.join(', ')
                  : 'No beat'}
              </span>
            </div>
            
            {/* Start & End Time - Below */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-green-600">▶</span>
                <span className="text-muted-foreground">Start:</span>
                <span className="font-semibold">{summaryData.startTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600">■</span>
                <span className="text-muted-foreground">End:</span>
                <span className="font-semibold">{summaryData.endTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div
                role="button"
                onClick={openRetailerValueDialog}
                className="text-center p-4 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition overflow-hidden"
              >
                <div className="text-xl font-bold text-primary break-words">
                  {loading ? "Loading..." : `₹${summaryData.totalOrderValue.toLocaleString()}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total Order Value</div>
              </div>
              <div
                role="button"
                onClick={() => openOrdersDialog("Orders Placed")}
                className="text-center p-4 bg-success/10 rounded-lg cursor-pointer hover:bg-success/20 transition"
              >
                <div className="text-2xl font-bold text-success">
                  {loading ? "Loading..." : summaryData.totalOrders}
                </div>
                <div className="text-sm text-muted-foreground">Orders Placed</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                role="button"
                onClick={openKgBreakdownDialog}
                className="text-center p-3 bg-warning/10 rounded-lg cursor-pointer hover:bg-warning/20 transition"
              >
                <div className="text-lg font-bold text-warning">
                  {loading ? "Loading..." : summaryData.totalKgSoldFormatted}
                </div>
                <div className="text-sm text-muted-foreground">Total KG Sold (Unit)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">
                  {loading ? "Loading..." : `₹${summaryData.avgOrderValue.toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div
                role="button"
                onClick={() => navigate('/leaderboard')}
                className="text-center p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-lg cursor-pointer hover:from-amber-500/15 hover:to-yellow-500/15 transition border border-amber-500/20"
              >
                <div className="text-2xl font-bold text-amber-600">
                  {loading ? "Loading..." : pointsEarnedToday}
                </div>
                <div className="text-sm text-amber-600/80 font-medium">Points Earned Today</div>
                <div className="text-xs text-muted-foreground mt-1">Tap to view details in Leaderboard</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visit Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visit Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-muted-foreground">Loading visit data...</div>
              ) : visitBreakdown.length === 0 ? (
                <div className="text-center text-muted-foreground">No visits planned for today</div>
              ) : (
                visitBreakdown.map((item) => (
                <div
                  key={item.status}
                  onClick={() => openVisitsDialog(item.status)}
                  role="button"
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={
                        item.color === "success" ? "bg-success text-success-foreground" :
                        item.color === "destructive" ? "bg-destructive text-destructive-foreground" :
                        item.color === "warning" ? "bg-warning text-warning-foreground" :
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {item.status}
                    </Badge>
                    <span className="text-sm">{item.count} visits</span>
                  </div>
                  <div className="text-sm font-medium">
                    {summaryData.plannedVisits > 0 ? Math.round((item.count / summaryData.plannedVisits) * 100) : 0}%
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Retailers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Retailers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center text-muted-foreground">Loading retailers...</div>
              ) : topRetailers.length === 0 ? (
                <div className="text-center text-muted-foreground">No orders placed today</div>
              ) : (
                topRetailers.slice(0, 3).map((retailer, index) => (
                <div key={retailer.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="font-semibold">{retailer.name}</div>
                  <div className="text-right">
                    <div className="font-bold text-success">₹{retailer.orderValue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Joint Sales Highlight Section */}
        {jointSalesData && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-purple-600">🤝</span>
                  Joint Sales Visit
                </CardTitle>
                {jointSalesData.avgScore > 0 && (
                  <Badge className={`text-sm px-3 py-1 ${
                    jointSalesData.avgScore >= 8 ? 'bg-green-100 text-green-700' :
                    jointSalesData.avgScore >= 6 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    Score: {jointSalesData.avgScore}/10
                  </Badge>
                )}
              </div>
              <p className="text-sm text-purple-600 font-medium mt-1">
                with {jointSalesData.memberName}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-purple-100 rounded-lg">
                  <div className="text-xl font-bold text-purple-700">
                    {jointSalesData.retailersCovered}
                  </div>
                  <div className="text-xs text-purple-600">Retailers</div>
                </div>
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <div className="text-lg font-bold text-green-700">
                    ₹{jointSalesData.orderIncrease.toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">Order Increase</div>
                </div>
                <div className="text-center p-3 bg-blue-100 rounded-lg">
                  <div className="text-xl font-bold text-blue-700">
                    {jointSalesData.avgScore > 0 ? jointSalesData.avgScore : '-'}
                  </div>
                  <div className="text-xs text-blue-600">Avg Score</div>
                </div>
              </div>

              {jointSalesData.feedback.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-purple-700">Feedback Summary</div>
                  {jointSalesData.feedback.slice(0, 3).map((feedback, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-white rounded-lg border border-purple-100 text-sm cursor-pointer hover:border-purple-300 transition-colors"
                      onClick={() => {
                        setSelectedJointFeedback({
                          retailerId: feedback.retailerId,
                          retailerName: feedback.retailerName,
                          feedbackDate: feedback.feedbackDate
                        });
                        setJointFeedbackViewOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{feedback.retailerName}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${
                            feedback.score >= 8 ? 'border-green-300 text-green-700' :
                            feedback.score >= 6 ? 'border-yellow-300 text-yellow-700' :
                            'border-orange-300 text-orange-700'
                          }`}>
                            {feedback.score}/10
                          </Badge>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-muted-foreground text-xs line-clamp-1">{feedback.impact}</div>
                      {feedback.orderIncrease > 0 && (
                        <div className="text-green-600 font-medium text-xs mt-1">
                          +₹{feedback.orderIncrease.toLocaleString()} increase
                        </div>
                      )}
                    </div>
                  ))}
                  {jointSalesData.feedback.length > 3 && (
                    <div className="text-xs text-center text-purple-600 font-medium">
                      +{jointSalesData.feedback.length - 3} more entries
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product-wise Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product-wise Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">KG Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Loading product sales...
                    </TableCell>
                  </TableRow>
                ) : productSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No product sales today
                    </TableCell>
                  </TableRow>
                ) : (
                  productSales.map((p) => (
                   <TableRow key={p.name}>
                     <TableCell className="font-medium">{p.name}</TableCell>
                     <TableCell className="text-right">{p.kgFormatted}</TableCell>
                     <TableCell className="text-right">₹{p.revenue.toLocaleString()}</TableCell>
                   </TableRow>
                 ))
               )}
               </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Planned Visits:</span>
                <span className="font-semibold">{summaryData.plannedVisits}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Visits:</span>
                <span className="font-semibold">{summaryData.completedVisits}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Conversion Rate:</span>
                <span className="font-semibold text-success">{summaryData.orderConversionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Covered:</span>
                <span className="font-semibold">
                  {summaryData.distanceCovered > 0 ? `${summaryData.distanceCovered} km` : 'No location data'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time at Retailers:</span>
                <span className="font-semibold">{summaryData.travelTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-2">
              {dialogContentType === "kgBreakdown" && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Total KG: {summaryData.totalKgSoldFormatted} • {productGroupedOrders.length} products
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">KG Sold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productGroupedOrders.length > 0 ? (
                        productGroupedOrders
                          .filter(p => p.kgSold > 0)
                          .map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{p.product}</TableCell>
                              <TableCell className="text-right">{p.kgFormatted}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                            No KG-based products sold today
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {dialogContentType === "products" && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Total: ₹{productGroupedOrders.reduce((sum, p) => sum + p.value, 0).toLocaleString()} • {productGroupedOrders.length} products
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">KG</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productGroupedOrders.length > 0 ? (
                        productGroupedOrders.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{p.product}</TableCell>
                            <TableCell className="text-right">{p.kgFormatted}</TableCell>
                            <TableCell className="text-right">₹{p.value.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No orders placed today
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {dialogContentType === "orders" && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Total: ₹{orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString()} • {orders.length} orders
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Retailer</TableHead>
                        <TableHead className="text-right">KG</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{o.retailer}</TableCell>
                          <TableCell className="text-right">{o.kgFormatted}</TableCell>
                          <TableCell className="text-right">₹{o.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {dialogContentType === "retailerValue" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-primary/10 rounded-lg overflow-hidden">
                      <div className="text-sm font-bold text-primary whitespace-nowrap">
                        ₹{orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Total</div>
                    </div>
                    <div className="text-center p-3 bg-destructive/10 rounded-lg overflow-hidden">
                      <div className="text-sm font-bold text-destructive whitespace-nowrap">
                        ₹{orders.reduce((sum, o) => sum + o.creditAmount, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Credit</div>
                    </div>
                    <div className="text-center p-3 bg-success/10 rounded-lg overflow-hidden">
                      <div className="text-sm font-bold text-success whitespace-nowrap">
                        ₹{orders.reduce((sum, o) => sum + o.cashInHand, 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Amount Collected</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Retailer</TableHead>
                          <TableHead className="text-right min-w-[100px]">Total Value</TableHead>
                          <TableHead className="text-right min-w-[100px]">Credit</TableHead>
                          <TableHead className="text-right min-w-[100px]">Cash in Hand</TableHead>
                          <TableHead className="text-center min-w-[80px]">Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length > 0 ? (
                          orders.map((o, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{o.retailer}</TableCell>
                              <TableCell className="text-right">₹{o.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-warning">
                                {o.creditAmount > 0 ? `₹${o.creditAmount.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell className="text-right text-success">
                                ₹{o.cashInHand.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs">
                                  {o.paymentMethod}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No orders placed today
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {dialogContentType === "visits" && (
                <div className="space-y-2">
                  {(visitsByStatus[dialogFilter || "Productive"] || []).map((v, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-muted/50">
                      <div className="font-medium">{v.retailer}</div>
                      {v.note && <div className="text-sm text-muted-foreground">{v.note}</div>}
                    </div>
                  ))}
                  {(!visitsByStatus[dialogFilter || ""] || visitsByStatus[dialogFilter || ""].length === 0) && (
                    <div className="text-sm text-muted-foreground">No records available.</div>
                  )}
                </div>
              )}

              {dialogContentType === "efficiency" && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Planned Visits</span>
                    <span className="font-semibold">{summaryData.plannedVisits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Visits</span>
                    <span className="font-semibold">{summaryData.completedVisits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Visit Efficiency</span>
                    <span className="font-semibold">{summaryData.visitEfficiency}%</span>
                  </div>
                  <div className="pt-2">
                    <div className="mb-2 text-muted-foreground">Completed Visits</div>
                    <div className="space-y-2">
                      {(visitsByStatus["Productive"] || []).map((v, idx) => (
                        <div key={idx} className="p-3 rounded-md bg-muted/50">
                          <div className="font-medium">{v.retailer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Joint Sales Feedback View Modal */}
        {selectedJointFeedback && (
          <JointSalesFeedbackViewModal
            isOpen={jointFeedbackViewOpen}
            onClose={() => {
              setJointFeedbackViewOpen(false);
              setSelectedJointFeedback(null);
            }}
            retailerId={selectedJointFeedback.retailerId}
            retailerName={selectedJointFeedback.retailerName}
            feedbackDate={selectedJointFeedback.feedbackDate}
            onEdit={() => {}}
            onDeleted={() => {
              setJointFeedbackViewOpen(false);
              setSelectedJointFeedback(null);
            }}
          />
        )}

      </div>
    </div>
    </Layout>
  );
};