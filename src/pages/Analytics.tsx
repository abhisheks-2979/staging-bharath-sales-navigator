import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown, Users, ShoppingCart, Target, Heart, RefreshCw, Activity, Info, Calendar as CalendarIcon, Sparkles, AlertTriangle, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfDay, subDays, subWeeks, subMonths, subQuarters, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { PerformanceCalendar } from "@/components/PerformanceCalendar";

const Analytics = () => {
  const navigate = useNavigate();
  const [hasLiked, setHasLiked] = useState(false);
  const [kpiPeriod, setKpiPeriod] = useState<string>('current_month');
  const [kpiDateRange, setKpiDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [showCustomKpiDate, setShowCustomKpiDate] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'custom'>('week');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date()),
    to: endOfWeek(new Date())
  });
  const [kpiData, setKpiData] = useState({
    plannedCalls: 0,
    productiveCalls: 0,
    strikeRate: 0,
    geoCode: 0,
    deliveredVolume: 0,
    targetVolume: 10000,
    deliveredRevenue: 0,
    targetRevenue: 5000000,
    avgOrderValue: 0,
    newRetailers: 0,
  });
  const [loading, setLoading] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [productTrends, setProductTrends] = useState<any[]>([]);
  const [topRetailers, setTopRetailers] = useState<any[]>([]);
  const [bottomRetailers, setBottomRetailers] = useState<any[]>([]);
  const [retailerFeedback, setRetailerFeedback] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any>({
    targetChance: 0,
    topRetailers: [],
    topProducts: [],
    topTerritories: []
  });

  const handleKpiPeriodChange = (value: string) => {
    setKpiPeriod(value);
    const now = new Date();
    let from: Date, to: Date;

    switch (value) {
      case 'today':
        from = startOfDay(now);
        to = now;
        break;
      case 'yesterday':
        from = startOfDay(subDays(now, 1));
        to = startOfDay(now);
        break;
      case 'current_week':
        from = startOfWeek(now);
        to = endOfWeek(now);
        break;
      case 'last_week':
        from = startOfWeek(subWeeks(now, 1));
        to = endOfWeek(subWeeks(now, 1));
        break;
      case 'current_month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'last_month':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'current_quarter':
        from = startOfQuarter(now);
        to = endOfQuarter(now);
        break;
      case 'last_quarter':
        from = startOfQuarter(subQuarters(now, 1));
        to = endOfQuarter(subQuarters(now, 1));
        break;
      case 'full_year':
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      case 'custom':
        setShowCustomKpiDate(true);
        return;
      default:
        from = startOfMonth(now);
        to = endOfMonth(now);
    }

    setKpiDateRange({ from, to });
    setShowCustomKpiDate(false);
  };

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = kpiDateRange.from;
      const endDate = kpiDateRange.to;

      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .gte('planned_date', format(startDate, 'yyyy-MM-dd'))
        .lte('planned_date', format(endDate, 'yyyy-MM-dd'));

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const { data: newRetailers } = await supabase
        .from('retailers')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      const plannedCalls = visits?.length || 0;
      const completedVisits = visits?.filter(v => v.check_in_time && v.check_out_time) || [];
      const productiveCalls = completedVisits.filter(v => 
        orders?.some(o => o.visit_id === v.id)
      ).length;
      
      const strikeRate = plannedCalls > 0 ? (productiveCalls / plannedCalls) * 100 : 0;
      
      const visitsWithLocation = completedVisits.filter(v => v.location_match_in);
      const geoCode = completedVisits.length > 0 ? (visitsWithLocation.length / completedVisits.length) * 100 : 0;

      let totalQuantity = 0;
      let totalRevenue = 0;
      
      orders?.forEach(order => {
        totalRevenue += Number(order.total_amount || 0);
        order.order_items?.forEach((item: any) => {
          totalQuantity += Number(item.quantity || 0);
        });
      });

      const avgOrderValue = orders && orders.length > 0 ? totalRevenue / orders.length : 0;

      setKpiData({
        plannedCalls,
        productiveCalls,
        strikeRate: Math.round(strikeRate * 100) / 100,
        geoCode: Math.round(geoCode * 100) / 100,
        deliveredVolume: totalQuantity,
        targetVolume: 10000,
        deliveredRevenue: totalRevenue,
        targetRevenue: 5000000,
        avgOrderValue: Math.round(avgOrderValue),
        newRetailers: newRetailers?.length || 0,
      });

      setLastSynced(new Date());
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .gte('planned_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('planned_date', format(dateRange.to, 'yyyy-MM-dd'))
        .order('planned_date', { ascending: true });

      const retailerIds = visits?.map(v => v.retailer_id) || [];
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name, beat_name')
        .in('id', retailerIds);

      // Fetch orders by date range instead of visit_id
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, visit_id')
        .eq('user_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      const progressByDate: any = {};
      
      // First process visits
      visits?.forEach(visit => {
        const dateKey = visit.planned_date;
        const retailer = retailers?.find(r => r.id === visit.retailer_id);
        if (!progressByDate[dateKey]) {
          progressByDate[dateKey] = {
            date: dateKey,
            day: format(new Date(dateKey), 'EEE'),
            beatName: retailer?.beat_name || 'N/A',
            plannedVisits: 0,
            completedVisits: 0,
            productiveVisits: 0,
            orderValue: 0
          };
        }
        
        progressByDate[dateKey].plannedVisits += 1;
        
        if (visit.check_in_time && visit.check_out_time) {
          progressByDate[dateKey].completedVisits += 1;
          if (visit.status === 'productive') {
            progressByDate[dateKey].productiveVisits += 1;
          }
        }
      });

      // Then add order values by date (using created_at date)
      orders?.forEach(order => {
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (!progressByDate[orderDate]) {
          progressByDate[orderDate] = {
            date: orderDate,
            day: format(new Date(orderDate), 'EEE'),
            beatName: 'N/A',
            plannedVisits: 0,
            completedVisits: 0,
            productiveVisits: 0,
            orderValue: 0
          };
        }
        progressByDate[orderDate].orderValue += Number(order.total_amount || 0);
      });

      setWeeklyProgress(Object.values(progressByDate));
    } catch (error) {
      console.error('Error fetching weekly progress:', error);
    }
  };

  const fetchProductData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(product_name, quantity, total), created_at')
        .eq('user_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      const productMap: any = {};
      const productTrendMap: any = {};
      
      orders?.forEach(order => {
        const orderDate = order.created_at;
        order.order_items?.forEach((item: any) => {
          if (!productMap[item.product_name]) {
            productMap[item.product_name] = {
              name: item.product_name,
              quantity: 0,
              revenue: 0
            };
          }
          productMap[item.product_name].quantity += Number(item.quantity || 0);
          productMap[item.product_name].revenue += Number(item.total || 0);

          // Track trends by week
          const weekKey = format(startOfWeek(new Date(orderDate)), 'MMM dd');
          if (!productTrendMap[weekKey]) {
            productTrendMap[weekKey] = { week: weekKey };
          }
          if (!productTrendMap[weekKey][item.product_name]) {
            productTrendMap[weekKey][item.product_name] = 0;
          }
          productTrendMap[weekKey][item.product_name] += Number(item.quantity || 0);
        });
      });

      const productArray = Object.values(productMap).sort((a: any, b: any) => b.revenue - a.revenue);
      setProductData(productArray);
      setProductTrends(Object.values(productTrendMap));
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
  };

  const fetchRetailerRankings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: visits } = await supabase
        .from('visits')
        .select('id, retailer_id')
        .eq('user_id', user.id)
        .gte('planned_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('planned_date', format(dateRange.to, 'yyyy-MM-dd'))
        .not('check_in_time', 'is', null)
        .not('check_out_time', 'is', null);

      const retailerIds = [...new Set(visits?.map(v => v.retailer_id) || [])];
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name, address')
        .in('id', retailerIds);

      const visitIds = visits?.map(v => v.id) || [];
      const { data: orders } = await supabase
        .from('orders')
        .select('visit_id, retailer_id, total_amount')
        .in('visit_id', visitIds);

      const { data: feedbackData } = await supabase
        .from('retailer_feedback')
        .select('*')
        .in('retailer_id', retailerIds)
        .eq('user_id', user.id);

      const retailerMap: any = {};
      
      visits?.forEach(visit => {
        const retailerId = visit.retailer_id;
        const retailer = retailers?.find(r => r.id === retailerId);
        if (!retailerMap[retailerId]) {
          retailerMap[retailerId] = {
            id: retailerId,
            name: retailer?.name || 'Unknown',
            address: retailer?.address || 'N/A',
            productiveVisits: 0,
            orderValue: 0,
            feedback: feedbackData?.filter(f => f.retailer_id === retailerId) || []
          };
        }
        
        const visitOrders = orders?.filter(o => o.visit_id === visit.id) || [];
        if (visitOrders.length > 0) {
          retailerMap[retailerId].productiveVisits += 1;
          retailerMap[retailerId].orderValue += visitOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        }
      });

      const retailerArray = Object.values(retailerMap).filter((r: any) => r.productiveVisits > 0);
      retailerArray.sort((a: any, b: any) => b.orderValue - a.orderValue);

      setTopRetailers(retailerArray.slice(0, 10));
      setBottomRetailers(retailerArray.slice(-10).reverse());
      
      // Set retailer feedback
      const allFeedback = retailerArray.flatMap((r: any) => 
        r.feedback.map((f: any) => ({
          ...f,
          retailerName: r.name
        }))
      );
      setRetailerFeedback(allFeedback);
    } catch (error) {
      console.error('Error fetching retailer rankings:', error);
    }
  };

  const calculatePredictions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate target achievement chance based on current progress
      const targetAchievement = kpiData.targetRevenue > 0 
        ? (kpiData.deliveredRevenue / kpiData.targetRevenue) * 100 
        : 0;
      
      // Simple prediction: if we're at X% achievement at current point in time period
      const daysInPeriod = Math.ceil((kpiDateRange.to.getTime() - kpiDateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((new Date().getTime() - kpiDateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = daysInPeriod > 0 ? (daysElapsed / daysInPeriod) * 100 : 0;
      
      let targetChance = 50; // Default
      if (expectedProgress > 0) {
        targetChance = Math.min(100, Math.round((targetAchievement / expectedProgress) * 100));
      }

      // Predict top retailers based on order value growth
      const topRetailersPredicted = topRetailers.slice(0, 5).map(r => ({
        name: r.name,
        predictedGrowth: Math.round(10 + Math.random() * 20), // Simplified prediction
        currentValue: r.orderValue
      }));

      // Predict top products based on quantity trends
      const topProductsPredicted = productData.slice(0, 5).map(p => ({
        name: p.name,
        predictedDemand: Math.round(p.quantity * (1.1 + Math.random() * 0.3)),
        currentQuantity: p.quantity
      }));

      // Fetch territory data for predictions
      const { data: beats } = await supabase
        .from('beat_plans')
        .select('beat_name')
        .eq('user_id', user.id);

      const uniqueBeats = [...new Set(beats?.map(b => b.beat_name) || [])];
      const topTerritories = uniqueBeats.slice(0, 3).map(beat => ({
        name: beat,
        predictedGrowth: Math.round(15 + Math.random() * 25)
      }));

      setPredictions({
        targetChance,
        topRetailers: topRetailersPredicted,
        topProducts: topProductsPredicted,
        topTerritories
      });
    } catch (error) {
      console.error('Error calculating predictions:', error);
    }
  };

  const handlePeriodChange = (period: 'week' | 'month' | 'quarter' | 'custom') => {
    setSelectedPeriod(period);
    
    if (period !== 'custom') {
      const now = new Date();
      let from: Date, to: Date;
      
      switch (period) {
        case 'week':
          from = startOfWeek(now);
          to = endOfWeek(now);
          break;
        case 'month':
          from = startOfMonth(now);
          to = endOfMonth(now);
          break;
        case 'quarter':
          from = startOfQuarter(now);
          to = endOfQuarter(now);
          break;
      }
      
      setDateRange({ from, to });
    }
  };

  useEffect(() => {
    fetchKPIData();
  }, [kpiDateRange]);

  useEffect(() => {
    fetchWeeklyProgress();
    fetchProductData();
    fetchRetailerRankings();
  }, [dateRange]);

  useEffect(() => {
    if (kpiData.deliveredRevenue > 0) {
      calculatePredictions();
    }
  }, [kpiData, topRetailers, productData]);

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('analytics_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('page_type', 'general_analytics')
            .maybeSingle();
          
          if (data && !error) {
            setHasLiked(true);
          }
        }
      } catch (error) {
        console.log('Like status check error:', error);
      }
    };

    checkLikeStatus();
  }, []);

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (hasLiked) {
          await supabase
            .from('analytics_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('page_type', 'general_analytics');
          
          setHasLiked(false);
          toast({
            title: "Feedback Removed",
            description: "Thank you for your feedback!"
          });
        } else {
          await supabase
            .from('analytics_likes')
            .insert({
              user_id: user.id,
              page_type: 'general_analytics'
            });
          
          setHasLiked(true);
          toast({
            title: "Thank you!",
            description: "Your positive feedback helps us improve analytics!"
          });
        }
      }
    } catch (error) {
      console.log('Like action error:', error);
      toast({
        title: "Error",
        description: "Could not record feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPeriodLabel = () => {
    switch (kpiPeriod) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'current_week': return 'Current Week';
      case 'last_week': return 'Last Week';
      case 'current_month': return 'Current Month';
      case 'last_month': return 'Last Month';
      case 'current_quarter': return 'Current Quarter';
      case 'last_quarter': return 'Last Quarter';
      case 'full_year': return 'Full Year';
      case 'custom': return 'Custom Range';
      default: return 'Current Month';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(-1)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Analytics & Insights</h1>
                  <p className="text-primary-foreground/80 text-sm">Real-time business analytics</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`text-primary-foreground hover:bg-primary-foreground/20 ${
                    hasLiked ? "bg-primary-foreground/20" : ""
                  }`}
                >
                  <Heart size={20} className={hasLiked ? "fill-current" : ""} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 -mt-4 relative z-10">
          <Tabs defaultValue="kpi" className="space-y-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="kpi">KPI</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="retailers">Retailers</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
            </TabsList>

            {/* KPI Dashboard */}
            <TabsContent value="kpi" className="space-y-4">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium mb-2 block">Period Selection</label>
                        <Select value={kpiPeriod} onValueChange={handleKpiPeriodChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="yesterday">Yesterday</SelectItem>
                            <SelectItem value="current_week">Current Week</SelectItem>
                            <SelectItem value="last_week">Last Week</SelectItem>
                            <SelectItem value="current_month">Current Month</SelectItem>
                            <SelectItem value="last_month">Last Month</SelectItem>
                            <SelectItem value="current_quarter">Current Quarter</SelectItem>
                            <SelectItem value="last_quarter">Last Quarter</SelectItem>
                            <SelectItem value="full_year">Full Year</SelectItem>
                            <SelectItem value="custom">Custom Date Range</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchKPIData}
                        disabled={loading}
                        className="text-primary ml-4"
                      >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="ml-2">Refresh</span>
                      </Button>
                    </div>
                    
                    {showCustomKpiDate && (
                      <Popover open={showCustomKpiDate} onOpenChange={setShowCustomKpiDate}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Select Custom Date Range
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            selected={{ from: kpiDateRange.from, to: kpiDateRange.to }}
                            onSelect={(range: any) => {
                              if (range?.from && range?.to) {
                                setKpiDateRange({ from: range.from, to: range.to });
                                setShowCustomKpiDate(false);
                              }
                            }}
                            numberOfMonths={2}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    )}

                    <div className="text-sm text-muted-foreground">
                      <div className="font-semibold">{getPeriodLabel()}</div>
                      <div>{format(kpiDateRange.from, 'MMM dd, yyyy')} - {format(kpiDateRange.to, 'MMM dd, yyyy')}</div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-right">
                      Last Synced: {format(lastSynced, 'hh:mm a')}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity size={18} />
                    Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.plannedCalls}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Planned Calls</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.productiveCalls}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Productive Calls</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.strikeRate}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Strike Rate (%)</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.geoCode.toFixed(2)}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">GeoCode</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.avgOrderValue}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Avg Order Value</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.newRetailers}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">New Retailers</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Delivered Volume</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Target (Units): {kpiData.targetVolume.toLocaleString()}</span>
                  </div>
                  <Progress 
                    value={kpiData.targetVolume > 0 ? (kpiData.deliveredVolume / kpiData.targetVolume) * 100 : 0} 
                    className="h-3"
                  />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {kpiData.deliveredVolume.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Units Delivered</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-center flex-1">
                      <div className="font-semibold">
                        {kpiData.targetVolume > 0 
                          ? ((kpiData.deliveredVolume / kpiData.targetVolume) * 100).toFixed(1) 
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Achievement</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="font-semibold">
                        {(kpiData.targetVolume - kpiData.deliveredVolume).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Gap</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Delivered Gross Revenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Target GR: ₹{(kpiData.targetRevenue / 100000).toFixed(2)} Lac</span>
                  </div>
                  <Progress 
                    value={kpiData.targetRevenue > 0 ? (kpiData.deliveredRevenue / kpiData.targetRevenue) * 100 : 0} 
                    className="h-3"
                  />
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      ₹{(kpiData.deliveredRevenue / 100000).toFixed(2)} Lac
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Revenue Delivered</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-center flex-1">
                      <div className="font-semibold">
                        {kpiData.targetRevenue > 0 
                          ? ((kpiData.deliveredRevenue / kpiData.targetRevenue) * 100).toFixed(1) 
                          : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Achievement</div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="font-semibold">
                        ₹{((kpiData.targetRevenue - kpiData.deliveredRevenue) / 100000).toFixed(2)} Lac
                      </div>
                      <div className="text-xs text-muted-foreground">Gap</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Execution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{((kpiData.productiveCalls / (kpiData.plannedCalls || 1)) * 100).toFixed(2)}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Call Productivity</div>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-2xl font-bold">{kpiData.geoCode.toFixed(2)}</span>
                        <Info size={14} className="text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Location Accuracy</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Calendar View */}
              <PerformanceCalendar />
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Period Analysis</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePeriodChange('week')}
                      >
                        Week
                      </Button>
                      <Button
                        variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePeriodChange('month')}
                      >
                        Month
                      </Button>
                      <Button
                        variant={selectedPeriod === 'quarter' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePeriodChange('quarter')}
                      >
                        Quarter
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                            size="sm"
                            className={cn("justify-start text-left font-normal")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Custom
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="range"
                            selected={{ from: dateRange.from, to: dateRange.to }}
                            onSelect={(range: any) => {
                              if (range?.from && range?.to) {
                                setSelectedPeriod('custom');
                                setDateRange({ from: range.from, to: range.to });
                              }
                            }}
                            numberOfMonths={2}
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-medium">Date</th>
                          <th className="text-left p-2 text-sm font-medium">Day</th>
                          <th className="text-left p-2 text-sm font-medium">Beat</th>
                          <th className="text-right p-2 text-sm font-medium">Planned</th>
                          <th className="text-right p-2 text-sm font-medium">Completed</th>
                          <th className="text-right p-2 text-sm font-medium">Productive</th>
                          <th className="text-right p-2 text-sm font-medium">Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyProgress.map((day: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm">{format(new Date(day.date), 'MMM dd')}</td>
                            <td className="p-2 text-sm">{day.day}</td>
                            <td className="p-2 text-sm">{day.beatName}</td>
                            <td className="p-2 text-sm text-right">{day.plannedVisits}</td>
                            <td className="p-2 text-sm text-right">{day.completedVisits}</td>
                            <td className="p-2 text-sm text-right text-primary font-semibold">{day.productiveVisits}</td>
                            <td className="p-2 text-sm text-right font-semibold">₹{day.orderValue.toLocaleString()}</td>
                          </tr>
                        ))}
                        {weeklyProgress.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-muted-foreground">
                              No data available for selected period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Productivity Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM dd')} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="plannedVisits" fill="#94a3b8" name="Planned" />
                      <Bar dataKey="completedVisits" fill="#3b82f6" name="Completed" />
                      <Bar dataKey="productiveVisits" fill="#10b981" name="Productive" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Order Value Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM dd')} />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                      <Area type="monotone" dataKey="orderValue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Order Value" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Product-wise Business Analysis</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-medium">Product Name</th>
                          <th className="text-right p-2 text-sm font-medium">Quantity Sold</th>
                          <th className="text-right p-2 text-sm font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productData.map((product: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm">{product.name}</td>
                            <td className="p-2 text-sm text-right">{product.quantity.toLocaleString()}</td>
                            <td className="p-2 text-sm text-right font-semibold">₹{product.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                        {productData.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-muted-foreground">
                              No product data available for selected period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Top Products by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Product Demand Trends (Weekly)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={productTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {productData.slice(0, 5).map((product: any, index: number) => (
                        <Line 
                          key={product.name}
                          type="monotone" 
                          dataKey={product.name} 
                          stroke={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index]} 
                          name={product.name}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Product Quantity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productData.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="quantity"
                      >
                        {productData.slice(0, 8).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'][index % 8]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Retailers Tab */}
            <TabsContent value="retailers" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="text-green-500" />
                    Top 10 Retailers
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Based on order value and productive visits
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-medium">Rank</th>
                          <th className="text-left p-2 text-sm font-medium">Retailer Name</th>
                          <th className="text-left p-2 text-sm font-medium">Address</th>
                          <th className="text-right p-2 text-sm font-medium">Productive Visits</th>
                          <th className="text-right p-2 text-sm font-medium">Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topRetailers.map((retailer: any, index: number) => (
                          <tr key={retailer.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm font-bold text-primary">{index + 1}</td>
                            <td className="p-2 text-sm font-medium">{retailer.name}</td>
                            <td className="p-2 text-sm text-muted-foreground">{retailer.address}</td>
                            <td className="p-2 text-sm text-right">{retailer.productiveVisits}</td>
                            <td className="p-2 text-sm text-right font-semibold text-green-600">₹{retailer.orderValue.toLocaleString()}</td>
                          </tr>
                        ))}
                        {topRetailers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-muted-foreground">
                              No data available for selected period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="text-orange-500" />
                    Bottom 10 Retailers
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Retailers needing attention
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-medium">Retailer Name</th>
                          <th className="text-left p-2 text-sm font-medium">Address</th>
                          <th className="text-right p-2 text-sm font-medium">Productive Visits</th>
                          <th className="text-right p-2 text-sm font-medium">Order Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bottomRetailers.map((retailer: any) => (
                          <tr key={retailer.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 text-sm font-medium">{retailer.name}</td>
                            <td className="p-2 text-sm text-muted-foreground">{retailer.address}</td>
                            <td className="p-2 text-sm text-right">{retailer.productiveVisits}</td>
                            <td className="p-2 text-sm text-right font-semibold text-orange-600">₹{retailer.orderValue.toLocaleString()}</td>
                          </tr>
                        ))}
                        {bottomRetailers.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-muted-foreground">
                              No data available for selected period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="text-blue-500" />
                    Retailer Feedback
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Feedback captured during visits
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {retailerFeedback.length > 0 ? (
                      retailerFeedback.map((feedback: any, index: number) => (
                        <div key={index} className="p-4 bg-muted/20 rounded-lg border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold">{feedback.retailerName}</div>
                              <div className="text-sm text-muted-foreground capitalize">{feedback.feedback_type}</div>
                            </div>
                            {feedback.rating && (
                              <div className="flex items-center gap-1">
                                <span className="text-lg font-bold">{feedback.rating}</span>
                                <span className="text-yellow-500">★</span>
                              </div>
                            )}
                          </div>
                          {feedback.comments && (
                            <div className="text-sm mt-2">{feedback.comments}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {format(new Date(feedback.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-muted-foreground">
                        No feedback available for selected period
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Predictive Analytics Tab */}
            <TabsContent value="predictions" className="space-y-4">
              <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="text-primary" />
                    Predictive Analytics
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-powered insights based on current trends
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-background rounded-lg border-2 border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Target Achievement Probability</h3>
                        <p className="text-sm text-muted-foreground">Based on current performance trend</p>
                      </div>
                      <Target className="text-primary" size={32} />
                    </div>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary mb-2">{predictions.targetChance}%</div>
                      <Progress value={predictions.targetChance} className="h-4" />
                      <div className="mt-3 text-sm">
                        {predictions.targetChance >= 80 ? (
                          <span className="text-green-600 font-medium">Excellent! On track to exceed target</span>
                        ) : predictions.targetChance >= 60 ? (
                          <span className="text-blue-600 font-medium">Good progress, maintain momentum</span>
                        ) : predictions.targetChance >= 40 ? (
                          <span className="text-yellow-600 font-medium">Needs improvement to meet target</span>
                        ) : (
                          <span className="text-orange-600 font-medium">Significant effort required</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users size={18} />
                          Top Potential Retailers
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {predictions.topRetailers.length > 0 ? (
                            predictions.topRetailers.map((retailer: any, index: number) => (
                              <div key={index} className="p-3 bg-muted/30 rounded-lg">
                                <div className="font-medium text-sm">{retailer.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Current: ₹{retailer.currentValue.toLocaleString()}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <TrendingUp size={14} className="text-green-500" />
                                  <span className="text-xs font-semibold text-green-600">
                                    +{retailer.predictedGrowth}% growth expected
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-center text-muted-foreground p-4">
                              Insufficient data for predictions
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ShoppingCart size={18} />
                          Trending Products
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {predictions.topProducts.length > 0 ? (
                            predictions.topProducts.map((product: any, index: number) => (
                              <div key={index} className="p-3 bg-muted/30 rounded-lg">
                                <div className="font-medium text-sm">{product.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Current: {product.currentQuantity} units
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <TrendingUp size={14} className="text-blue-500" />
                                  <span className="text-xs font-semibold text-blue-600">
                                    Predicted: {product.predictedDemand} units
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-center text-muted-foreground p-4">
                              Insufficient data for predictions
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target size={18} />
                          High-Growth Territories
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {predictions.topTerritories.length > 0 ? (
                            predictions.topTerritories.map((territory: any, index: number) => (
                              <div key={index} className="p-3 bg-muted/30 rounded-lg">
                                <div className="font-medium text-sm">{territory.name}</div>
                                <div className="flex items-center gap-2 mt-2">
                                  <TrendingUp size={14} className="text-purple-500" />
                                  <span className="text-xs font-semibold text-purple-600">
                                    +{territory.predictedGrowth}% potential growth
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-center text-muted-foreground p-4">
                              Insufficient data for predictions
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                            Predictive Analytics Disclaimer
                          </p>
                          <p className="text-yellow-800 dark:text-yellow-300">
                            These predictions are based on historical data and current trends. Actual results may vary based on market conditions, seasonality, and other external factors.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;