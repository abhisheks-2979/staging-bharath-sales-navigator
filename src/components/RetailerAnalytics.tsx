import { X, TrendingUp, TrendingDown, Package, Gift, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Retailer {
  id: string;
  name: string;
  type: string;
  phone: string;
  address: string;
  lastVisitDate?: string;
  isSelected: boolean;
  priority?: "high" | "medium" | "low";
  metrics: {
    avgOrders3Months: number;
    avgOrderPerVisit: number;
    visitsIn3Months: number;
  };
}

interface RetailerAnalyticsProps {
  retailer: Retailer;
  onClose: () => void;
}

const mockAnalyticsData = {
  topProducts: [
    { name: "Coca Cola 500ml", quantity: 240, revenue: 48000 },
    { name: "Pepsi 500ml", quantity: 180, revenue: 36000 },
    { name: "Sprite 500ml", quantity: 150, revenue: 30000 },
    { name: "Fanta 500ml", quantity: 120, revenue: 24000 },
    { name: "Mountain Dew 500ml", quantity: 90, revenue: 18000 }
  ],
  enrolledSchemes: [
    { name: "Summer Splash Combo", discount: "15%", status: "Active" },
    { name: "Buy 10 Get 2 Free", discount: "20%", status: "Active" },
    { name: "Festival Bonanza", discount: "12%", status: "Expired" }
  ],
  notBuyingProducts: [
    "Red Bull Energy Drink",
    "Monster Energy",
    "Tropicana Juice 1L",
    "Real Juice 1L",
    "Minute Maid 500ml"
  ],
  potential: {
    category: "High Value",
    score: 85,
    growth: "+12%",
    recommendation: "Focus on premium products and energy drinks segment"
  }
};

export const RetailerAnalytics = ({ retailer, onClose }: RetailerAnalyticsProps) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Analytics Snapshot
            </h2>
            <p className="text-sm text-muted-foreground">{retailer.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(retailer.metrics.avgOrders3Months)}
                  </p>
                  <p className="text-sm text-muted-foreground">3-Month Avg Orders</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(retailer.metrics.avgOrderPerVisit)}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Order per Visit</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{retailer.metrics.visitsIn3Months}</p>
                  <p className="text-sm text-muted-foreground">Visits in 3 Months</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Top Purchasing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockAnalyticsData.topProducts.map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.quantity} units</p>
                    </div>
                    <p className="font-semibold text-primary">{formatCurrency(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enrolled Schemes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Enrolled Schemes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockAnalyticsData.enrolledSchemes.map((scheme, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded">
                    <div>
                      <p className="font-medium">{scheme.name}</p>
                      <p className="text-sm text-muted-foreground">Discount: {scheme.discount}</p>
                    </div>
                    <Badge variant={scheme.status === "Active" ? "default" : "secondary"}>
                      {scheme.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Products Not Buying */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Opportunity Products (Not Purchasing)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {mockAnalyticsData.notBuyingProducts.map((product, index) => (
                  <div key={index} className="p-2 bg-destructive/10 text-destructive rounded text-sm">
                    {product}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Retailer Potential */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Retailer Potential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Category:</span>
                  <Badge className="bg-primary text-primary-foreground">
                    {mockAnalyticsData.potential.category}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Potential Score:</span>
                  <span className="text-2xl font-bold text-primary">
                    {mockAnalyticsData.potential.score}/100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Growth Trend:</span>
                  <span className="text-lg font-semibold text-green-600">
                    {mockAnalyticsData.potential.growth}
                  </span>
                </div>
                <Separator />
                <div>
                  <p className="font-medium mb-2">Recommendation:</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                    {mockAnalyticsData.potential.recommendation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};