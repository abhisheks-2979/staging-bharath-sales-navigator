import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Package, Users, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BeatAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  beatId: string;
  beatName: string;
  userId: string;
}

interface BeatMetrics {
  ordersThisMonth: number;
  avgBusiness: number;
  revenueGrowth: number;
  visitsPerMonth: number;
  retailersAdded3Months: number;
  totalRetailers: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function BeatAnalyticsModal({ isOpen, onClose, beatId, beatName, userId }: BeatAnalyticsModalProps) {
  const [metrics, setMetrics] = useState<BeatMetrics>({
    ordersThisMonth: 0,
    avgBusiness: 0,
    revenueGrowth: 0,
    visitsPerMonth: 0,
    retailersAdded3Months: 0,
    totalRetailers: 0
  });
  const [productSales, setProductSales] = useState<any[]>([]);
  const [topRetailers, setTopRetailers] = useState<any[]>([]);
  const [revenueGrowthData, setRevenueGrowthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && beatId) {
      loadAnalytics();
    }
  }, [isOpen, beatId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Get retailers in this beat
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name')
        .eq('beat_id', beatId)
        .eq('user_id', userId);

      const retailerIds = retailers?.map(r => r.id) || [];

      if (retailerIds.length === 0) {
        setLoading(false);
        return;
      }

      // Orders this month
      const { data: ordersThisMonth } = await supabase
        .from('orders')
        .select('total_amount')
        .in('retailer_id', retailerIds)
        .gte('order_date', currentMonthStart)
        .eq('status', 'confirmed');

      const ordersCount = ordersThisMonth?.length || 0;
      const totalRevenue = ordersThisMonth?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      // Last month revenue for growth calculation
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
        .gte('visit_date', currentMonthStart);

      // Retailers added in last 3 months
      const { data: newRetailers } = await supabase
        .from('retailers')
        .select('id')
        .eq('beat_id', beatId)
        .eq('user_id', userId)
        .gte('created_at', threeMonthsAgo);

      // Product sales breakdown
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_name, quantity, total, order_id')
        .gte('created_at', currentMonthStart);

      if (orderItems) {
        const { data: beatOrders } = await supabase
          .from('orders')
          .select('id')
          .in('retailer_id', retailerIds);

        const beatOrderIds = new Set(beatOrders?.map(o => o.id) || []);
        const filteredItems = orderItems.filter(item => beatOrderIds.has(item.order_id));

        const productMap = new Map();
        filteredItems.forEach(item => {
          const current = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(item.product_name, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + item.total
          });
        });

        const productData = Array.from(productMap.entries())
          .map(([name, data]: [string, any]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 6);

        setProductSales(productData);
      }

      // Top retailers by revenue
      const retailerRevenueMap = new Map();
      ordersThisMonth?.forEach((order: any) => {
        const retailer = retailers?.find(r => r.id === order.retailer_id);
        if (retailer) {
          const current = retailerRevenueMap.get(retailer.name) || 0;
          retailerRevenueMap.set(retailer.name, current + order.total_amount);
        }
      });

      const topRetailersData = Array.from(retailerRevenueMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTopRetailers(topRetailersData);

      // Revenue growth over last 6 months
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: monthOrders } = await supabase
          .from('orders')
          .select('total_amount')
          .in('retailer_id', retailerIds)
          .gte('order_date', monthStart)
          .lte('order_date', monthEnd)
          .eq('status', 'confirmed');

        const monthRevenue = monthOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

        monthlyData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthRevenue
        });
      }

      setRevenueGrowthData(monthlyData);

      setMetrics({
        ordersThisMonth: ordersCount,
        avgBusiness: totalRevenue / (ordersCount || 1),
        revenueGrowth: growth,
        visitsPerMonth: visits?.length || 0,
        retailersAdded3Months: newRetailers?.length || 0,
        totalRetailers: retailerIds.length
      });
    } catch (error) {
      console.error('Error loading beat analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <BarChart className="h-6 w-6" />
            {beatName} - Analytics
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{metrics.ordersThisMonth}</div>
                  <div className="text-xs text-muted-foreground">Orders (Month)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">₹{(metrics.avgBusiness / 1000).toFixed(1)}K</div>
                  <div className="text-xs text-muted-foreground">Avg Business</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.revenueGrowth >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    {Math.abs(metrics.revenueGrowth).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Revenue Growth</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{metrics.visitsPerMonth}</div>
                  <div className="text-xs text-muted-foreground">Visits (Month)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold">{metrics.retailersAdded3Months}</div>
                  <div className="text-xs text-muted-foreground">New (3M)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{metrics.totalRetailers}</div>
                  <div className="text-xs text-muted-foreground">Total Retailers</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="products">Sales by Product</TabsTrigger>
                <TabsTrigger value="retailers">Top Retailers</TabsTrigger>
                <TabsTrigger value="growth">Revenue Trend</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Sales by Product (This Month)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productSales.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={productSales}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={productSales}
                              dataKey="revenue"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={(entry) => `${entry.name}: ₹${(entry.revenue / 1000).toFixed(1)}K`}
                            >
                              {productSales.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No product sales data available for this beat
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="retailers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top 5 Retailers by Revenue (This Month)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topRetailers.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topRetailers} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} />
                          <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                          <Bar dataKey="revenue" fill="#00C49F" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No retailer revenue data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="growth" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueGrowthData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueGrowthData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `₹${value.toLocaleString()}`} />
                          <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No revenue trend data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
