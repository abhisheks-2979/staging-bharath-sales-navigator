import { Receipt, Car, Coffee, ArrowLeft, Plus, TrendingUp, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import BeatAllowanceManagement from "@/components/BeatAllowanceManagement";
import ProductivityTracking from "@/components/ProductivityTracking";
import AdditionalExpenses from "@/components/AdditionalExpenses";

const Expenses = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const expenseData = [
    { id: 1, date: "2024-01-20", type: "TA", description: "Client visit - Indiranagar", amount: 250, status: "approved" },
    { id: 2, date: "2024-01-20", type: "DA", description: "Lunch allowance", amount: 180, status: "approved" },
    { id: 3, date: "2024-01-19", type: "TA", description: "Market survey - Koramangala", amount: 320, status: "pending" },
    { id: 4, date: "2024-01-19", type: "DA", description: "Daily allowance", amount: 180, status: "approved" },
    { id: 5, date: "2024-01-18", type: "TA", description: "Distributor meeting", amount: 150, status: "approved" },
  ];

  const monthlyStats = {
    totalExpenses: 1080,
    taExpenses: 720,
    daExpenses: 360,
    pendingAmount: 320,
    approvedAmount: 760
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Settings size={28} />
                    Expense Management
                  </h1>
                  <p className="text-primary-foreground/80 text-sm">Manage your allowances and track productivity</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          <Tabs defaultValue="allowances" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto mb-4">
              <TabsTrigger value="allowances" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Expenses
              </TabsTrigger>
              <TabsTrigger value="productivity" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Productivity Tracking
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="allowances" className="mt-4">
              <BeatAllowanceManagement />
            </TabsContent>
            
            <TabsContent value="productivity" className="mt-4">
              <ProductivityTracking />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Expenses;