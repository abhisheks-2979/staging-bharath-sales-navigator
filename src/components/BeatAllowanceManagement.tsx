import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import AdditionalExpenses from '@/components/AdditionalExpenses';

interface ExpenseRow {
  id: string;
  date: string;
  beat_name: string;
  beat_id: string;
  ta: number;
  da: number;
  additional_expenses: number;
  total_expenses: number;
  order_value: number;
}

interface TAData {
  date: string;
  beat_name: string;
  ta: number;
}

interface DAData {
  days_attended: number;
  leave_days: number;
  da_per_day: number;
  monthly_da: number;
}

interface AdditionalExpenseData {
  date: string;
  expense_type: string;
  details: string;
  value: number;
  bill_attached: boolean;
}

const BeatAllowanceManagement = () => {
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateRangeStart, setDateRangeStart] = useState<Date>();
  const [dateRangeEnd, setDateRangeEnd] = useState<Date>();
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month' | 'date-range'>('day');
  const [loading, setLoading] = useState(true);
  const [isAdditionalExpensesOpen, setIsAdditionalExpensesOpen] = useState(false);
  const [taData, setTAData] = useState<TAData[]>([]);
  const [daData, setDAData] = useState<DAData | null>(null);
  const [additionalExpenseData, setAdditionalExpenseData] = useState<AdditionalExpenseData[]>([]);
  const [selectedTotalExpenses, setSelectedTotalExpenses] = useState<ExpenseRow | null>(null);
  const { toast } = useToast();

  const fetchExpenseData = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Fetch beat plans (journey plans) to get dates and beats
      const { data: beatPlans, error: beatPlansError } = await supabase
        .from('beat_plans')
        .select('plan_date, beat_id, beat_name')
        .eq('user_id', user.data.user.id)
        .order('plan_date', { ascending: false });

      if (beatPlansError) throw beatPlansError;

      // Fetch beat allowances (TA/DA)
      const { data: allowanceData, error: allowanceError } = await supabase
        .from('beat_allowances')
        .select('*')
        .eq('user_id', user.data.user.id);

      if (allowanceError) throw allowanceError;

      // Fetch additional expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('additional_expenses')
        .select('*')
        .eq('user_id', user.data.user.id);

      if (expensesError) throw expensesError;

      // Fetch orders with visit data to get order values
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, visit_id, created_at')
        .eq('user_id', user.data.user.id);

      if (ordersError) throw ordersError;

      // Fetch visits to link orders to beats
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('id, planned_date, retailer_id')
        .eq('user_id', user.data.user.id);

      if (visitsError) throw visitsError;

      // Fetch retailers to get beat info
      const { data: retailersData, error: retailersError } = await supabase
        .from('retailers')
        .select('id, beat_id, beat_name')
        .eq('user_id', user.data.user.id);

      if (retailersError) throw retailersError;

      // Create maps for easier data lookup
      const allowanceMap = new Map();
      allowanceData?.forEach((allowance: any) => {
        const date = allowance.created_at.split('T')[0];
        const key = `${allowance.beat_id}-${date}`;
        allowanceMap.set(key, allowance);
      });

      const expensesMap = new Map();
      expensesData?.forEach((expense: any) => {
        const key = `${expense.expense_date}`;
        const current = expensesMap.get(key) || 0;
        expensesMap.set(key, current + parseFloat(expense.amount));
      });

      // Create retailer to beat map
      const retailerToBeatMap = new Map();
      retailersData?.forEach((retailer: any) => {
        retailerToBeatMap.set(retailer.id, { beat_id: retailer.beat_id, beat_name: retailer.beat_name });
      });

      const orderMap = new Map();
      ordersData?.forEach((order: any) => {
        const visit = visitsData?.find((v: any) => v.id === order.visit_id);
        if (visit) {
          const retailerInfo = retailerToBeatMap.get(visit.retailer_id);
          if (retailerInfo) {
            const date = visit.planned_date;
            const beatId = retailerInfo.beat_id;
            const key = `${beatId}-${date}`;
            const current = orderMap.get(key) || 0;
            orderMap.set(key, current + parseFloat(order.total_amount || 0));
          }
        }
      });

      // Create expense rows from beat plans
      const rows: ExpenseRow[] = [];
      beatPlans?.forEach((plan: any) => {
        const key = `${plan.beat_id}-${plan.plan_date}`;
        const allowance = allowanceMap.get(key);
        const additionalExpenses = expensesMap.get(plan.plan_date) || 0;
        const orderValue = orderMap.get(key) || 0;
        
        const ta = allowance?.travel_allowance || 0;
        const da = allowance?.daily_allowance || 0;
        
        rows.push({
          id: plan.plan_date + '-' + plan.beat_id,
          date: plan.plan_date,
          beat_name: plan.beat_name,
          beat_id: plan.beat_id,
          ta: ta,
          da: da,
          additional_expenses: additionalExpenses,
          total_expenses: ta + da + additionalExpenses,
          order_value: orderValue
        });
      });

      setExpenseRows(rows);
    } catch (error) {
      console.error('Error fetching expense data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses data",
        variant: "destructive",
      });
    }
  };

  const fetchTAData = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data: allowanceData, error } = await supabase
        .from('beat_allowances')
        .select('created_at, beat_name, travel_allowance')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const taData: TAData[] = allowanceData?.map((item: any) => ({
        date: item.created_at.split('T')[0],
        beat_name: item.beat_name,
        ta: item.travel_allowance
      })) || [];

      setTAData(taData);
    } catch (error) {
      console.error('Error fetching TA data:', error);
    }
  };

  const fetchDAData = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Fetch attendance data to calculate days attended and leave days
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('user_id', user.data.user.id);

      if (attendanceError) throw attendanceError;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const attendanceThisMonth = attendanceData?.filter((record: any) => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      }) || [];

      const daysAttended = attendanceThisMonth.filter((record: any) => record.status === 'present').length;
      const leaveDays = attendanceThisMonth.filter((record: any) => record.status === 'absent').length;
      
      const daPerDay = 500; // Default DA per day
      const monthlyDA = daPerDay * daysAttended;

      setDAData({
        days_attended: daysAttended,
        leave_days: leaveDays,
        da_per_day: daPerDay,
        monthly_da: monthlyDA
      });
    } catch (error) {
      console.error('Error fetching DA data:', error);
    }
  };

  const fetchAdditionalExpenseData = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data: expensesData, error } = await supabase
        .from('additional_expenses')
        .select('expense_date, category, custom_category, description, amount, bill_url')
        .eq('user_id', user.data.user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const additionalExpenses: AdditionalExpenseData[] = expensesData?.map((item: any) => ({
        date: item.expense_date,
        expense_type: item.category === 'Other' ? item.custom_category : item.category,
        details: item.description || '',
        value: item.amount,
        bill_attached: !!item.bill_url
      })) || [];

      setAdditionalExpenseData(additionalExpenses);
    } catch (error) {
      console.error('Error fetching additional expense data:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        fetchExpenseData(),
        fetchTAData(),
        fetchDAData(),
        fetchAdditionalExpenseData()
      ]);
      setLoading(false);
    };
    initializeData();
  }, []);

  // Auto-refresh data when filter changes
  useEffect(() => {
    if (!loading) {
      fetchExpenseData();
    }
  }, [filterType, selectedDate, dateRangeStart, dateRangeEnd]);

  const handleTotalExpensesClick = (row: ExpenseRow) => {
    setSelectedTotalExpenses(row);
  };

  const handleAdditionalExpensesClick = () => {
    setIsAdditionalExpensesOpen(true);
  };

  const filteredExpenseRows = expenseRows.filter(row => {
    const rowDate = new Date(row.date);
    let dateMatch = true;

    switch (filterType) {
      case 'day':
        if (selectedDate) {
          dateMatch = rowDate.getFullYear() === selectedDate.getFullYear() &&
                     rowDate.getMonth() === selectedDate.getMonth() &&
                     rowDate.getDate() === selectedDate.getDate();
        }
        break;
      case 'week':
        if (selectedDate) {
          const weekStart = new Date(selectedDate);
          weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          dateMatch = rowDate >= weekStart && rowDate <= weekEnd;
        }
        break;
      case 'month':
        if (selectedDate) {
          dateMatch = rowDate.getFullYear() === selectedDate.getFullYear() &&
                     rowDate.getMonth() === selectedDate.getMonth();
        }
        break;
      case 'date-range':
        if (dateRangeStart && dateRangeEnd) {
          const rangeStart = new Date(dateRangeStart);
          rangeStart.setHours(0, 0, 0, 0);
          const rangeEnd = new Date(dateRangeEnd);
          rangeEnd.setHours(23, 59, 59, 999);
          dateMatch = rowDate >= rangeStart && rowDate <= rangeEnd;
        }
        break;
    }
    
    return dateMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle>My Expenses</CardTitle>
            <Button
              onClick={handleAdditionalExpensesClick}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Additional Expenses
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(value: 'day' | 'week' | 'month' | 'date-range') => setFilterType(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="date-range">Date Range</SelectItem>
                </SelectContent>
              </Select>

              {filterType !== 'date-range' ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, filterType === 'month' ? "MMMM yyyy" : filterType === 'week' ? `'Week of' MMM dd, yyyy` : "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !dateRangeStart && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRangeStart ? format(dateRangeStart, "MMM dd") : <span>Start</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRangeStart}
                        onSelect={setDateRangeStart}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !dateRangeEnd && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRangeEnd ? format(dateRangeEnd, "MMM dd") : <span>End</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRangeEnd}
                        onSelect={setDateRangeEnd}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* 4-Column Structure */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Beat</TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50"
                    >
                      Total Expenses
                    </TableHead>
                    <TableHead className="text-right">Order for the Day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenseRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No expense records found for the selected criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenseRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {new Date(row.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{row.beat_name}</TableCell>
                        <TableCell 
                          className="text-right font-bold cursor-pointer hover:bg-muted/50 hover:text-primary"
                          onClick={() => handleTotalExpensesClick(row)}
                        >
                          ₹{row.total_expenses.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{row.order_value.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Tabs for TA, DA, Additional Expenses */}
            <Tabs defaultValue="ta" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ta">TA</TabsTrigger>
                <TabsTrigger value="da">DA</TabsTrigger>
                <TabsTrigger value="additional">Additional Expenses</TabsTrigger>
              </TabsList>
              
              <TabsContent value="ta" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Travel Allowance (TA)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Beat Name</TableHead>
                            <TableHead className="text-right">TA Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {taData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                No TA records found
                              </TableCell>
                            </TableRow>
                          ) : (
                            taData.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                <TableCell>{item.beat_name}</TableCell>
                                <TableCell className="text-right">₹{item.ta}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="da" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Allowance (DA)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {daData ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{daData.days_attended}</div>
                          <div className="text-sm text-muted-foreground">Days Attended</div>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{daData.leave_days}</div>
                          <div className="text-sm text-muted-foreground">Leave Days</div>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-2xl font-bold text-blue-600">₹{daData.da_per_day}</div>
                          <div className="text-sm text-muted-foreground">DA / Day</div>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                          <div className="text-2xl font-bold text-primary">₹{daData.monthly_da}</div>
                          <div className="text-sm text-muted-foreground">Monthly DA</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No DA data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Expense Type</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-center">Bill Attached</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {additionalExpenseData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                No additional expenses found
                              </TableCell>
                            </TableRow>
                          ) : (
                            additionalExpenseData.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                                <TableCell>{item.expense_type}</TableCell>
                                <TableCell>{item.details}</TableCell>
                                <TableCell className="text-right">₹{item.value}</TableCell>
                                <TableCell className="text-center">
                                  {item.bill_attached ? (
                                    <span className="text-green-600">✓</span>
                                  ) : (
                                    <span className="text-red-600">✗</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Additional Expenses Dialog */}
      <Dialog open={isAdditionalExpensesOpen} onOpenChange={setIsAdditionalExpensesOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Additional Expenses</DialogTitle>
          </DialogHeader>
          <AdditionalExpenses
            onExpensesUpdated={() => {
              fetchExpenseData();
              fetchAdditionalExpenseData();
              setIsAdditionalExpensesOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Total Expenses Breakdown Dialog */}
      <Dialog open={!!selectedTotalExpenses} onOpenChange={() => setSelectedTotalExpenses(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Breakdown</DialogTitle>
          </DialogHeader>
          {selectedTotalExpenses && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Date:</strong> {new Date(selectedTotalExpenses.date).toLocaleDateString()}
                </div>
                <div>
                  <strong>Beat:</strong> {selectedTotalExpenses.beat_name}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Travel Allowance (TA):</span>
                  <span>₹{selectedTotalExpenses.ta}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Allowance (DA):</span>
                  <span>₹{selectedTotalExpenses.da}</span>
                </div>
                <div className="flex justify-between">
                  <span>Additional Expenses:</span>
                  <span>₹{selectedTotalExpenses.additional_expenses}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total Expenses:</span>
                    <span>₹{selectedTotalExpenses.total_expenses}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BeatAllowanceManagement;