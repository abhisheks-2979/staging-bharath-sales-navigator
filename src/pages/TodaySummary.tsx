import { useState, useEffect } from "react";
import { ArrowLeft, Download, Share, FileText, Clock, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const TodaySummary = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  
  // Get date from URL params or use today
  const dateParam = searchParams.get('date');
  const summaryDate = dateParam ? new Date(dateParam) : new Date();
  
  // Real data state
  const [summaryData, setSummaryData] = useState({
    date: summaryDate.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    beat: "Loading...",
    startTime: "Loading...",
    endTime: "Loading...",
    plannedVisits: 0,
    completedVisits: 0,
    productiveVisits: 0,
    totalOrders: 0,
    totalOrderValue: 0,
    avgOrderValue: 0,
    visitEfficiency: 0,
    orderConversionRate: 0,
    distanceCovered: 0,
    travelTime: "0h 0m"
  });

  const [visitBreakdown, setVisitBreakdown] = useState([
    { status: "Productive", count: 0, color: "success" },
    { status: "Unproductive", count: 0, color: "destructive" },
    { status: "Store Closed", count: 0, color: "muted" },
    { status: "Pending", count: 0, color: "warning" }
  ]);

  const [topRetailers, setTopRetailers] = useState<Array<{ name: string; orderValue: number; location: string }>>([]);
  const [productSales, setProductSales] = useState<Array<{ name: string; quantity: number; revenue: number }>>([]);
  const [orders, setOrders] = useState<Array<{ retailer: string; amount: number; items: number }>>([]);
  const [visitsByStatus, setVisitsByStatus] = useState<Record<string, Array<{ retailer: string; note?: string }>>>({});
  const [productGroupedOrders, setProductGroupedOrders] = useState<Array<{ product: string; quantity: number; value: number; orders: number }>>([]);

  // Dialog state and data sources for details
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogContentType, setDialogContentType] = useState<"orders" | "visits" | "efficiency" | "products">("orders");
  const [dialogFilter, setDialogFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchTodaysData();
  }, [summaryDate]);

  const fetchTodaysData = async () => {
    try {
      setLoading(true);
      const targetDate = summaryDate.toISOString().split('T')[0];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch visits for target date
      const { data: visits } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .eq('planned_date', targetDate);

      // Fetch retailers for today's visits
      const retailerIds = visits?.map(v => v.retailer_id) || [];
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name, address')
        .in('id', retailerIds);

      // Fetch orders for target date
      const { data: todayOrders } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('user_id', user.id)
        .gte('created_at', `${targetDate}T00:00:00`)
        .lte('created_at', `${targetDate}T23:59:59`);

      // Fetch beat plan for target date
      const { data: beatPlan } = await supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', targetDate)
        .single();

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

      // Calculate first check-in and last check-out times
      const allCheckInTimes = visits?.filter(v => v.check_in_time).map(v => new Date(v.check_in_time!)) || [];
      const allCheckOutTimes = visits?.filter(v => v.check_out_time).map(v => new Date(v.check_out_time!)) || [];
      
      const firstCheckIn = allCheckInTimes.length > 0 
        ? new Date(Math.min(...allCheckInTimes.map(t => t.getTime())))
        : null;
      const lastCheckOut = allCheckOutTimes.length > 0 
        ? new Date(Math.max(...allCheckOutTimes.map(t => t.getTime())))
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

      // Update summary data
      setSummaryData({
        date: summaryDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        beat: beatPlan?.beat_name || "No beat planned",
        startTime: formatTime(firstCheckIn),
        endTime: lastCheckOut ? formatTime(lastCheckOut) : (firstCheckIn ? "In Progress" : "Not started"),
        plannedVisits: totalPlanned,
        completedVisits: completedVisits.length,
        productiveVisits: productiveVisits.length,
        totalOrders: totalOrdersCount,
        totalOrderValue,
        avgOrderValue,
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

      // Process product sales
      const productSalesMap = new Map();
      todayOrders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const existing = productSalesMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productSalesMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + Number(item.total || 0)
          });
        });
      });

      const productSalesData = Array.from(productSalesMap.entries())
        .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setProductSales(productSalesData);

      // Process orders for dialog
      const ordersData = todayOrders?.map(order => ({
        retailer: order.retailer_name,
        amount: Number(order.total_amount || 0),
        items: order.order_items?.length || 0
      })) || [];

      setOrders(ordersData);

      // Process product-grouped orders for Total Order Value dialog
      const productOrderMap = new Map();
      todayOrders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const existing = productOrderMap.get(item.product_name) || { quantity: 0, value: 0, orderCount: 0 };
          productOrderMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            value: existing.value + Number(item.total || 0),
            orderCount: existing.orderCount + 1
          });
        });
      });

      const productGroupedData = Array.from(productOrderMap.entries())
        .map(([product, data]) => ({ 
          product, 
          quantity: data.quantity, 
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

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Downloaded",
      description: "Today's summary has been downloaded successfully",
    });
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <CardTitle className="text-xl font-bold">Today's Summary</CardTitle>
                <p className="text-primary-foreground/80">{summaryData.date}</p>
              </div>
            </div>
            <FileText size={24} />
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Download PDF
          </Button>
          <Button 
            variant="outline"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share size={16} />
            Share Summary
          </Button>
        </div>

        {/* Beat Information */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="font-semibold">{summaryData.beat}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Start: {summaryData.startTime} | End: {summaryData.endTime}
              </span>
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
                onClick={openProductsDialog}
                className="text-center p-4 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition"
              >
                <div className="text-2xl font-bold text-primary">
                  {loading ? "Loading..." : `₹${summaryData.totalOrderValue.toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">Total Order Value</div>
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
                onClick={openEfficiencyDialog}
                className="text-center p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition"
              >
                <div className="text-lg font-bold">
                  {loading ? "Loading..." : `${summaryData.visitEfficiency}%`}
                </div>
                <div className="text-sm text-muted-foreground">Visit Efficiency</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">
                  {loading ? "Loading..." : `₹${summaryData.avgOrderValue.toLocaleString()}`}
                </div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
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
                topRetailers.map((retailer, index) => (
                <div key={retailer.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-semibold">{retailer.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} />
                      {retailer.location}
                    </div>
                  </div>
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
                  <TableHead className="text-right">Qty</TableHead>
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
                     <TableCell className="text-right">{p.quantity}</TableCell>
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
              {dialogContentType === "products" && (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Total: ₹{productGroupedOrders.reduce((sum, p) => sum + p.value, 0).toLocaleString()} • {productGroupedOrders.reduce((sum, p) => sum + p.quantity, 0)} units • {productGroupedOrders.length} products
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productGroupedOrders.length > 0 ? (
                        productGroupedOrders.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{p.product}</TableCell>
                            <TableCell className="text-right">{p.quantity}</TableCell>
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
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((o, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{o.retailer}</TableCell>
                          <TableCell className="text-right">{o.items}</TableCell>
                          <TableCell className="text-right">₹{o.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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

      </div>
    </div>
  );
};