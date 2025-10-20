import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { ArrowLeft, TrendingUp, TrendingDown, Users, ShoppingCart, Target, Heart, RefreshCw, Activity, Info, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { cn } from "@/lib/utils";

const Analytics = () => {
  const navigate = useNavigate();
  const [hasLiked, setHasLiked] = useState(false);
  const [kpiView, setKpiView] = useState<'monthly' | 'daily'>('monthly');
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
  const [topRetailers, setTopRetailers] = useState<any[]>([]);
  const [bottomRetailers, setBottomRetailers] = useState<any[]>([]);

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let startDate: Date;
      let endDate = new Date();
      
      if (kpiView === 'daily') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }

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

      const visitIds = visits?.map(v => v.id) || [];
      const { data: orders } = await supabase
        .from('orders')
        .select('visit_id, total_amount')
        .in('visit_id', visitIds);

      const progressByDate: any = {};
      
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
          
          const visitOrders = orders?.filter(o => o.visit_id === visit.id) || [];
          if (visitOrders.length > 0) {
            progressByDate[dateKey].productiveVisits += 1;
            progressByDate[dateKey].orderValue += visitOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
          }
        }
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
        .select('*, order_items(product_name, quantity, total), visits!inner(planned_date)')
        .eq('user_id', user.id)
        .gte('visits.planned_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('visits.planned_date', format(dateRange.to, 'yyyy-MM-dd'));

      const productMap: any = {};
      
      orders?.forEach(order => {
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
        });
      });

      const productArray = Object.values(productMap).sort((a: any, b: any) => b.revenue - a.revenue);
      setProductData(productArray);
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
            orderValue: 0
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
    } catch (error) {
      console.error('Error fetching retailer rankings:', error);
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
  }, [kpiView]);

  useEffect(() => {
    fetchWeeklyProgress();
    fetchProductData();
    fetchRetailerRankings();
  }, [dateRange]);

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
            .single();
          
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

        <div className="p-4 -mt-4 relative z-10">
          <Tabs defaultValue="kpi" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="kpi">KPI</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="retailers">Retailers</TabsTrigger>
            </TabsList>

            {/* KPI Dashboard */}
            <TabsContent value="kpi" className="space-y-4">
              <Card className="shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="view-toggle" className={kpiView === 'monthly' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                          MONTHLY
                        </Label>
                        <Switch
                          id="view-toggle"
                          checked={kpiView === 'daily'}
                          onCheckedChange={(checked) => setKpiView(checked ? 'daily' : 'monthly')}
                        />
                        <Label htmlFor="view-toggle" className={kpiView === 'daily' ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                          DAILY
                        </Label>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchKPIData}
                      disabled={loading}
                      className="text-primary"
                    >
                      <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                      <span className="ml-2">Refresh</span>
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    Last Synced at: {format(lastSynced, 'hh:mm a')}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;