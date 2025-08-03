import { BarChart3, PieChart, TrendingUp, ArrowLeft, Map, Users, Package, Calendar, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Analytics = () => {
  const navigate = useNavigate();
  const [hasLiked, setHasLiked] = useState(false);

  // Check if user has already liked
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const { data, error } = await supabase
            .from('analytics_likes')
            .select('id')
            .eq('user_id', user.user.id)
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
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        if (hasLiked) {
          // Remove like
          await supabase
            .from('analytics_likes')
            .delete()
            .eq('user_id', user.user.id)
            .eq('page_type', 'general_analytics');
          
          setHasLiked(false);
          toast({
            title: "Feedback Removed",
            description: "Thank you for your feedback!"
          });
        } else {
          // Add like
          await supabase
            .from('analytics_likes')
            .insert({
              user_id: user.user.id,
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

  // Market Analysis Data
  const marketData = [
    { area: 'Bangalore North', potential: 85, penetration: 65, competitors: 8 },
    { area: 'Bangalore South', potential: 92, penetration: 58, competitors: 12 },
    { area: 'Bangalore East', potential: 78, penetration: 72, competitors: 6 },
    { area: 'Bangalore West', potential: 88, penetration: 45, competitors: 10 },
  ];

  // Retailer Analysis Data
  const retailerCategoryData = [
    { name: 'Kirana Stores', value: 45, color: '#3b82f6' },
    { name: 'Supermarkets', value: 25, color: '#10b981' },
    { name: 'General Stores', value: 20, color: '#f59e0b' },
    { name: 'Specialty', value: 10, color: '#ef4444' },
  ];

  const retailerPerformance = [
    { category: 'A', count: 15, revenue: 450 },
    { category: 'B', count: 28, revenue: 320 },
    { category: 'C', count: 35, revenue: 180 },
  ];

  // Order Analysis Data
  const orderTrends = [
    { month: 'Sep', orders: 142, value: 285 },
    { month: 'Oct', orders: 158, value: 315 },
    { month: 'Nov', orders: 167, value: 340 },
    { month: 'Dec', orders: 185, value: 380 },
    { month: 'Jan', orders: 195, value: 420 },
  ];

  const productMix = [
    { product: 'Beverages', sales: 35, growth: 12 },
    { product: 'Snacks', sales: 28, growth: 8 },
    { product: 'Personal Care', sales: 20, growth: 15 },
    { product: 'Household', sales: 17, growth: -3 },
  ];

  // Planning Insights
  const planningData = [
    { metric: 'Territory Coverage', current: 75, target: 85, opportunity: 'High' },
    { metric: 'Customer Frequency', current: 2.3, target: 3.0, opportunity: 'Medium' },
    { metric: 'Average Order Size', current: 3500, target: 4000, opportunity: 'High' },
    { metric: 'New Customer Acquisition', current: 8, target: 12, opportunity: 'Medium' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 size={28} />
                  Analytics & Planning
                </h1>
                <p className="text-primary-foreground/80 text-sm">Analyze market data and plan strategically</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`text-primary-foreground hover:bg-primary-foreground/20 ${
                  hasLiked ? "bg-primary-foreground/20" : ""
                }`}
                title={hasLiked ? "Remove like" : "Like this page"}
              >
                <Heart size={20} className={hasLiked ? "fill-current" : ""} />
              </Button>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">75%</div>
                <div className="text-sm text-primary-foreground/80">Territory Coverage</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">₹420K</div>
                <div className="text-sm text-primary-foreground/80">Monthly Revenue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          <Tabs defaultValue="market" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="market">Market</TabsTrigger>
              <TabsTrigger value="retailers">Retailers</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="planning">Planning</TabsTrigger>
            </TabsList>

            {/* Market Analysis */}
            <TabsContent value="market" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map size={20} />
                    Market Penetration by Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marketData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="area" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Bar dataKey="potential" fill="#e2e8f0" name="Market Potential" />
                        <Bar dataKey="penetration" fill="#3b82f6" name="Our Penetration" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                {marketData.map((area, index) => (
                  <Card key={index} className="shadow-lg">
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-2">{area.area}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Penetration</span>
                          <span className="font-semibold">{area.penetration}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Competitors</span>
                          <span className="font-semibold">{area.competitors}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Retailer Analysis */}
            <TabsContent value="retailers" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={20} />
                    Retailer Mix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center mb-4">
                    <div className="h-48 w-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={retailerCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {retailerCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {retailerCategoryData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Performance by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {retailerPerformance.map((cat, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div>
                          <p className="font-semibold">Category {cat.category}</p>
                          <p className="text-sm text-muted-foreground">{cat.count} retailers</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{cat.revenue}K</p>
                          <p className="text-xs text-muted-foreground">avg revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order Analysis */}
            <TabsContent value="orders" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={20} />
                    Order Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={orderTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Area 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="orders" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.3}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productMix.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{product.product}</p>
                          <p className="text-xs text-muted-foreground">{product.sales}% of sales</p>
                        </div>
                        <div className={`text-right ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <p className="font-bold text-sm">
                            {product.growth >= 0 ? '+' : ''}{product.growth}%
                          </p>
                          <p className="text-xs">growth</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Strategic Planning */}
            <TabsContent value="planning" className="space-y-4">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={20} />
                    Performance vs Targets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {planningData.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.metric}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            item.opportunity === 'High' ? 'bg-red-100 text-red-800' :
                            item.opportunity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {item.opportunity} Opportunity
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Current: {item.current}</span>
                          <span>Target: {item.target}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${Math.min((item.current / item.target) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-purple-600">Strategic Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <span className="font-medium">•</span>
                      <span className="text-sm">Focus on Bangalore West area for market expansion</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium">•</span>
                      <span className="text-sm">Increase visit frequency to Category B retailers</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium">•</span>
                      <span className="text-sm">Push Personal Care products for higher growth</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium">•</span>
                      <span className="text-sm">Target 4 new customer acquisitions this month</span>
                    </div>
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