import { useState } from "react";
import { ArrowLeft, Download, Share, FileText, Clock, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const TodaySummary = () => {
  const navigate = useNavigate();

  const summaryData = {
    date: new Date().toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    beat: "Beat 1 (Central Bangalore)",
    plannedVisits: 15,
    completedVisits: 12,
    productiveVisits: 10,
    totalOrders: 8,
    totalOrderValue: 145750,
    avgOrderValue: 18219,
    visitEfficiency: 80,
    orderConversionRate: 67
  };

  const visitBreakdown = [
    { status: "Productive", count: 10, color: "success" },
    { status: "Unproductive", count: 2, color: "destructive" },
    { status: "Store Closed", count: 2, color: "muted" },
    { status: "Pending", count: 3, color: "warning" }
  ];

  const topRetailers = [
    { name: "Vardhman Kirana", orderValue: 25000, location: "Indiranagar" },
    { name: "Mahesh Kirana", orderValue: 22000, location: "MG Road" },
    { name: "New Corner Store", orderValue: 18500, location: "Koramangala" },
    { name: "City Mart", orderValue: 15750, location: "Brigade Road" }
  ];

  // Dialog state and data sources for details
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState<string>("");
  const [dialogContentType, setDialogContentType] = useState<"orders" | "visits" | "efficiency">("orders");
  const [dialogFilter, setDialogFilter] = useState<string | null>(null);

  const productSales = [
    { name: "Premium Coffee Beans", quantity: 120, revenue: 54000 },
    { name: "Energy Drinks Pack", quantity: 95, revenue: 47500 },
    { name: "Organic Snacks", quantity: 80, revenue: 32000 },
    { name: "Fresh Milk 1L", quantity: 72, revenue: 21600 },
    { name: "Breakfast Cereal", quantity: 56, revenue: 25200 },
  ];

  const orders = [
    { retailer: "Vardhman Kirana", amount: 25000, items: 12 },
    { retailer: "Mahesh Kirana", amount: 22000, items: 10 },
    { retailer: "New Corner Store", amount: 18500, items: 8 },
    { retailer: "City Mart", amount: 15750, items: 6 },
  ];

  const visitsByStatus: Record<string, Array<{ retailer: string; note?: string }>> = {
    Productive: [
      { retailer: "Vardhman Kirana" },
      { retailer: "Mahesh Kirana" },
      { retailer: "New Corner Store" },
      { retailer: "City Mart" },
    ],
    Unproductive: [
      { retailer: "Shree Stores", note: "No requirements today" },
      { retailer: "Anand Mart", note: "Budget constraints" },
    ],
    "Store Closed": [
      { retailer: "Kaveri Traders", note: "Closed at time of visit" },
      { retailer: "Sunrise Kirana", note: "Weekly off" },
    ],
    Pending: [
      { retailer: "Green Fresh" },
      { retailer: "Bright Mart" },
      { retailer: "Royal Stores" },
    ],
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
                Start: 9:00 AM | End: 6:30 PM
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
                onClick={() => openOrdersDialog("Total Order Value - Orders")}
                className="text-center p-4 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition"
              >
                <div className="text-2xl font-bold text-primary">₹{summaryData.totalOrderValue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Order Value</div>
              </div>
              <div
                role="button"
                onClick={() => openOrdersDialog("Orders Placed")}
                className="text-center p-4 bg-success/10 rounded-lg cursor-pointer hover:bg-success/20 transition"
              >
                <div className="text-2xl font-bold text-success">{summaryData.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Orders Placed</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                role="button"
                onClick={openEfficiencyDialog}
                className="text-center p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition"
              >
                <div className="text-lg font-bold">{summaryData.visitEfficiency}%</div>
                <div className="text-sm text-muted-foreground">Visit Efficiency</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">₹{summaryData.avgOrderValue.toLocaleString()}</div>
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
              {visitBreakdown.map((item) => (
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
                    {Math.round((item.count / summaryData.plannedVisits) * 100)}%
                  </div>
                </div>
              ))}
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
              {topRetailers.map((retailer, index) => (
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
              ))}
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
                {productSales.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.quantity}</TableCell>
                    <TableCell className="text-right">₹{p.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
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
                <span className="font-semibold">47.2 km</span>
              </div>
              <div className="flex justify-between">
                <span>Travel Time:</span>
                <span className="font-semibold">2h 15m</span>
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