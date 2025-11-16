import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar, ShoppingCart, Target } from "lucide-react";

interface RetailerPerformanceAnalyticsProps {
  lastOrderDate?: string | null;
  lastOrderValue?: number | null;
  avgMonthlyOrders?: number | null;
  avgOrderPerVisit?: number | null;
  totalVisits?: number | null;
  productiveVisits?: number | null;
}

export const RetailerPerformanceAnalytics = ({
  lastOrderDate,
  lastOrderValue,
  avgMonthlyOrders,
  avgOrderPerVisit,
  totalVisits,
  productiveVisits
}: RetailerPerformanceAnalyticsProps) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "₹0";
    return `₹${value.toLocaleString()}`;
  };

  const formatNumber = (value: number | null | undefined, decimals: number = 1) => {
    if (value === null || value === undefined) return "0";
    return value.toFixed(decimals);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Analytics (Last 3 Months)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Last Order Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Last Order Date
            </div>
            <div className="text-lg font-semibold">{formatDate(lastOrderDate)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Last Order Value
            </div>
            <div className="text-lg font-semibold">{formatCurrency(lastOrderValue)}</div>
          </div>

          {/* 3 Month Analytics */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Avg Monthly Orders
            </div>
            <div className="text-lg font-semibold">{formatNumber(avgMonthlyOrders)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Avg Order Per Visit
            </div>
            <div className="text-lg font-semibold">{formatNumber(avgOrderPerVisit, 2)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Total Visits
            </div>
            <div className="text-lg font-semibold">{totalVisits ?? 0}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              Productive Visits
            </div>
            <div className="text-lg font-semibold">
              {productiveVisits ?? 0}
              {totalVisits && totalVisits > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({((productiveVisits ?? 0) / totalVisits * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
