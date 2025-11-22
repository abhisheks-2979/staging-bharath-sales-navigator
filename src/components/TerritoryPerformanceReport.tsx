import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Target, Award, Zap } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface TerritoryPerformanceReportProps {
  territoryId: string;
  territoryName: string;
}

const TerritoryPerformanceReport: React.FC<TerritoryPerformanceReportProps> = ({ territoryId, territoryName }) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    loadPerformanceData();
  }, [territoryId]);

  const loadPerformanceData = async () => {
    setLoading(true);
    
    // Get territory details
    const { data: territory } = await supabase
      .from('territories')
      .select('*, competition_master(*)')
      .eq('id', territoryId)
      .single();

    if (!territory) {
      setLoading(false);
      return;
    }

    // Get retailers in territory
    const { data: allRetailers } = await supabase.from('retailers').select('id, name, address');
    const territoryRetailers = allRetailers?.filter(r => 
      territory.pincode_ranges?.some((pin: string) => r.address?.includes(pin))
    ) || [];
    const retailerIds = territoryRetailers.map(r => r.id);

    // Current month
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    
    // Previous month
    const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
    const previousMonthEnd = endOfMonth(subMonths(new Date(), 1));

    // Current month sales
    const { data: currentMonthOrders } = await supabase
      .from('orders')
      .select('total_amount, order_items(product_id, product_name, quantity)')
      .in('retailer_id', retailerIds)
      .gte('created_at', currentMonthStart.toISOString())
      .lte('created_at', currentMonthEnd.toISOString())
      .eq('status', 'confirmed');

    const currentSales = currentMonthOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;

    // Previous month sales
    const { data: previousMonthOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .in('retailer_id', retailerIds)
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', previousMonthEnd.toISOString())
      .eq('status', 'confirmed');

    const previousSales = previousMonthOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
    const growthPercentage = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : 0;

    // Top products
    const productMap = new Map();
    currentMonthOrders?.forEach(order => {
      order.order_items?.forEach((item: any) => {
        const existing = productMap.get(item.product_name) || { quantity: 0 };
        productMap.set(item.product_name, { 
          name: item.product_name, 
          quantity: existing.quantity + item.quantity 
        });
      });
    });
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // Beats in territory
    const { data: beats } = await supabase
      .from('beats')
      .select('beat_name, beat_id')
      .in('id', retailerIds);

    // Schemes
    const { data: schemes } = await supabase
      .from('product_schemes')
      .select('*')
      .eq('is_active', true);

    // Team member performance
    const { data: assignmentHistory } = await supabase
      .from('territory_assignment_history')
      .select('*, profiles(full_name)')
      .eq('territory_id', territoryId)
      .order('assigned_from', { ascending: false });

    // Competition data
    const { data: competitionData } = await supabase
      .from('competition_data')
      .select('*, competition_master(competitor_name)')
      .in('retailer_id', retailerIds)
      .gte('created_at', currentMonthStart.toISOString());

    setPerformanceData({
      territory,
      currentSales,
      previousSales,
      growthPercentage,
      retailerCount: territoryRetailers.length,
      orderCount: currentMonthOrders?.length || 0,
      topProducts,
      beats: beats || [],
      schemes: schemes || [],
      assignmentHistory: assignmentHistory || [],
      competitionActivities: competitionData || []
    });

    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading performance report...</div>;
  }

  if (!performanceData) {
    return <div className="text-center p-8 text-muted-foreground">No data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">{territoryName} - Performance Report</h3>
        <Badge variant="outline" className="text-sm">
          {format(new Date(), 'MMMM yyyy')}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Current Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{performanceData.currentSales.toFixed(2)}</div>
            <div className={`text-xs flex items-center gap-1 mt-1 ${performanceData.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {performanceData.growthPercentage >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(performanceData.growthPercentage).toFixed(1)}% vs last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Retailers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.retailerCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Active retailers</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.orderCount}</div>
            <div className="text-xs text-muted-foreground mt-1">This month</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Target Market
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceData.territory.target_market_size 
                ? `₹${Number(performanceData.territory.target_market_size).toFixed(0)}` 
                : 'Not set'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Market size</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top 5 Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performanceData.topProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.topProducts.map((product: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No sales data available</p>
          )}
        </CardContent>
      </Card>

      {/* Competition Activities */}
      {performanceData.competitionActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Competition Activities ({performanceData.competitionActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {performanceData.competitionActivities.slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{activity.competition_master?.competitor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.impact_level && <Badge variant="outline" className="mr-2">{activity.impact_level}</Badge>}
                      {format(new Date(activity.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {activity.needs_attention && (
                    <Badge variant="destructive">Needs Attention</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Member History */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment History</CardTitle>
        </CardHeader>
        <CardContent>
          {performanceData.assignmentHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Member</TableHead>
                  <TableHead>Assigned From</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.assignmentHistory.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{format(new Date(assignment.assigned_from), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {assignment.assigned_to 
                        ? format(new Date(assignment.assigned_to), 'MMM dd, yyyy')
                        : <Badge variant="secondary">Current</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {assignment.assigned_to 
                        ? `${Math.ceil((new Date(assignment.assigned_to).getTime() - new Date(assignment.assigned_from).getTime()) / (1000 * 60 * 60 * 24))} days`
                        : 'Ongoing'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No assignment history</p>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {performanceData.growthPercentage < 0 && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <TrendingDown className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Declining Sales Trend</p>
                <p className="text-sm text-muted-foreground">
                  Sales have decreased by {Math.abs(performanceData.growthPercentage).toFixed(1)}%. 
                  Consider increasing retailer visits and launching targeted promotions.
                </p>
              </div>
            </div>
          )}
          
          {performanceData.competitionActivities.length > 3 && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">High Competition Activity</p>
                <p className="text-sm text-muted-foreground">
                  {performanceData.competitionActivities.length} competitor activities detected this month. 
                  Focus on strengthening relationships and differentiating your offerings.
                </p>
              </div>
            </div>
          )}

          {performanceData.growthPercentage > 10 && (
            <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Strong Growth Performance</p>
                <p className="text-sm text-muted-foreground">
                  Excellent {performanceData.growthPercentage.toFixed(1)}% growth! 
                  Consider expanding to similar territories and replicating successful strategies.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TerritoryPerformanceReport;
