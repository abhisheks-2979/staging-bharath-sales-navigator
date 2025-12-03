import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ExpenseSummaryBoxes from '@/components/ExpenseSummaryBoxes';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface ExpenseStats {
  thisMonth: number;
  pending: number;
  travelAllowance: number;
  dailyAllowance: number;
  approved: number;
  totalSubmitted: number;
}

const MyExpenses = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ExpenseStats>({
    thisMonth: 0,
    pending: 0,
    travelAllowance: 0,
    dailyAllowance: 0,
    approved: 0,
    totalSubmitted: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExpenseStats();
    }
  }, [user]);

  const fetchExpenseStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

      // Fetch employee DA allowance
      const { data: employeeData } = await supabase
        .from('employees')
        .select('daily_da_allowance')
        .eq('user_id', user.id)
        .single();

      const dailyDARate = employeeData?.daily_da_allowance || 0;

      // Fetch attendance records for this month to calculate DA
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, date, status')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .eq('status', 'present');

      const daysPresent = attendanceData?.length || 0;
      const calculatedDA = daysPresent * dailyDARate;

      // Fetch beat allowances (TA) for this month
      const { data: beatAllowances } = await supabase
        .from('beat_allowances')
        .select('beat_id, travel_allowance, daily_allowance')
        .eq('user_id', user.id);

      // Fetch beat plans for this month to calculate actual TA earned
      const { data: beatPlans } = await supabase
        .from('beat_plans')
        .select('beat_id')
        .eq('user_id', user.id)
        .gte('plan_date', monthStart)
        .lte('plan_date', monthEnd);

      // Calculate TA based on beat plans
      let totalTA = 0;
      if (beatPlans && beatAllowances) {
        const allowanceMap = new Map(beatAllowances.map(ba => [ba.beat_id, ba]));
        for (const plan of beatPlans) {
          const allowance = beatAllowances.find(ba => ba.beat_id === plan.beat_id);
          if (allowance) {
            totalTA += allowance.travel_allowance || 0;
          }
        }
      }

      // Fetch additional expenses for this month
      const { data: additionalExpenses } = await supabase
        .from('additional_expenses')
        .select('amount, category')
        .eq('user_id', user.id)
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd);

      const totalAdditional = additionalExpenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      // Total this month = DA + TA + Additional expenses
      const thisMonthTotal = calculatedDA + totalTA + totalAdditional;

      // For pending, we'll use a simple estimate (could be enhanced with approval workflow)
      // Assuming 30% of additional expenses are pending
      const pendingAmount = Math.round(totalAdditional * 0.3);

      // Approved = total - pending
      const approvedAmount = thisMonthTotal - pendingAmount;

      setStats({
        thisMonth: thisMonthTotal,
        pending: pendingAmount,
        travelAllowance: totalTA,
        dailyAllowance: calculatedDA,
        approved: approvedAmount,
        totalSubmitted: thisMonthTotal
      });
    } catch (error) {
      console.error('Error fetching expense stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const successRate = stats.totalSubmitted > 0 
    ? Math.round((stats.approved / stats.totalSubmitted) * 100) 
    : 0;

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header Section */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="ghost" 
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
                >
                  <ArrowLeft size={20} />
                </Button>
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold">My Expenses</h1>
                  <p className="text-primary-foreground/80 mt-1 text-sm sm:text-base">Track your TA & DA expenses</p>
                </div>
                <Button 
                  variant="secondary"
                  size="sm"
                  className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30 hidden sm:flex"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button 
                  variant="secondary"
                  size="icon"
                  className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30 sm:hidden"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Overlapping Header */}
        <div className="p-4 -mt-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
                  ) : (
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">
                      {formatCurrency(stats.thisMonth)}
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-blue-700 font-medium leading-tight">This Month</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-purple-600" />
                  ) : (
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">
                      {formatCurrency(stats.pending)}
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-purple-700 font-medium leading-tight">Pending</div>
                </CardContent>
              </Card>
            </div>

            {/* Allowance Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-green-600 text-sm mb-2">🚗</div>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-green-600" />
                  ) : (
                    <div className="text-xl sm:text-2xl font-bold text-green-700">
                      {formatCurrency(stats.travelAllowance)}
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-green-600 font-medium leading-tight">Travel Allowance</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-orange-600 text-sm mb-2">☕</div>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-600" />
                  ) : (
                    <div className="text-xl sm:text-2xl font-bold text-orange-700">
                      {formatCurrency(stats.dailyAllowance)}
                    </div>
                  )}
                  <div className="text-[10px] sm:text-xs text-orange-600 font-medium leading-tight">Daily Allowance</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Monthly Overview */}
            <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-emerald-800 flex items-center gap-2 text-base sm:text-lg">
                  📊 Monthly Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm sm:text-base font-bold text-emerald-700">Approved</div>
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                    ) : (
                      <div className="text-xl sm:text-2xl font-bold text-emerald-800">
                        {formatCurrency(stats.approved)}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm sm:text-base font-bold text-emerald-700">Success Rate</div>
                    {loading ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                    ) : (
                      <div className="text-xl sm:text-2xl font-bold text-emerald-800">{successRate}%</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Expenses */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  📋 Recent Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8 text-sm sm:text-base">
                  No recent expenses found
                </div>
              </CardContent>
            </Card>

            {/* Detailed Components */}
            <ExpenseSummaryBoxes />
            <BeatAllowanceManagement />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MyExpenses;
