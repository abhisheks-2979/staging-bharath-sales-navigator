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
                  onClick={() => navigate(-1)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Receipt size={28} />
                    My Expenses
                  </h1>
                  <p className="text-primary-foreground/80 text-sm">Track your TA & DA expenses</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                >
                  <Plus size={16} className="mr-1" />
                  Add Expense
                </Button>
                {userRole === 'admin' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/expense-management')}
                    className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
                  >
                    <Settings size={16} className="mr-1" />
                    Manage
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">₹{monthlyStats.totalExpenses}</div>
                <div className="text-sm text-primary-foreground/80">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">₹{monthlyStats.pendingAmount}</div>
                <div className="text-sm text-primary-foreground/80">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          <Tabs defaultValue="expenses" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto mb-6">
              <TabsTrigger value="expenses" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                My Expenses
              </TabsTrigger>
              <TabsTrigger value="management" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                Expense Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="expenses" className="mt-0">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
                  <CardContent className="p-4 text-center">
                    <Car className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">₹{monthlyStats.taExpenses}</div>
                    <div className="text-xs text-blue-700">Travel Allowance</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
                  <CardContent className="p-4 text-center">
                    <Coffee className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-600">₹{monthlyStats.daExpenses}</div>
                    <div className="text-xs text-orange-700">Daily Allowance</div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Overview */}
              <Card className="mb-6 bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp size={20} />
                    Monthly Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-xl font-bold text-green-600">₹{monthlyStats.approvedAmount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Success Rate</p>
                      <p className="text-xl font-bold text-green-600">
                        {Math.round((monthlyStats.approvedAmount / monthlyStats.totalExpenses) * 100)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Expenses */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt size={20} />
                    Recent Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenseData.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            expense.type === 'TA' ? 'bg-blue-100' : 'bg-orange-100'
                          }`}>
                            {expense.type === 'TA' ? (
                              <Car size={16} className="text-blue-600" />
                            ) : (
                              <Coffee size={16} className="text-orange-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {expense.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">₹{expense.amount}</p>
                          <Badge className={getStatusColor(expense.status)} variant="secondary">
                            {expense.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="management" className="mt-0">
              <Tabs defaultValue="allowances" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-auto mb-4">
                  <TabsTrigger value="allowances" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                    Beat Allowances
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Expenses;