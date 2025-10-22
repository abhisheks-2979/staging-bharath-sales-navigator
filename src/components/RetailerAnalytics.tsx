import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  isOpen: boolean;
}

export const RetailerAnalytics = ({ retailer, onClose, isOpen }: RetailerAnalyticsProps) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95%] max-w-3xl mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Analytics - {retailer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
