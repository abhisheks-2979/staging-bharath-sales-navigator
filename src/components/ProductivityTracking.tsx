import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, Calendar, Users, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProductivityData {
  user_id: string;
  user_name: string;
  beat_name: string;
  date: string;
  orders_count: number;
  total_order_value: number;
  daily_allowance: number;
  travel_allowance: number;
  total_allowance: number;
  productivity_ratio: number;
}

interface ProductivitySummary {
  totalUsers: number;
  totalOrders: number;
  totalOrderValue: number;
  totalAllowances: number;
  avgProductivity: number;
}

const ProductivityTracking = () => {
  const [productivityData, setProductivityData] = useState<ProductivityData[]>([]);
  const [summary, setSummary] = useState<ProductivitySummary>({
    totalUsers: 0,
    totalOrders: 0,
    totalOrderValue: 0,
    totalAllowances: 0,
    avgProductivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [sortBy, setSortBy] = useState('productivity_ratio');
  const { toast } = useToast();

  const fetchProductivityData = async () => {
    try {
      setLoading(true);
      
      // Get date range based on filter
      const today = new Date();
      let startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate = today;
          break;
        case 'week':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(today.getMonth() - 1);
          break;
        default:
          startDate = today;
      }

      // Fetch orders with user and beat information
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          visits!inner(
            user_id,
            retailer_id,
            retailers!inner(beat_name)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', today.toISOString());

      if (ordersError) throw ordersError;

      // Fetch beat allowances
      const { data: allowancesData, error: allowancesError } = await supabase
        .from('beat_allowances')
        .select(`
          *,
          profiles!inner(full_name)
        `);

      if (allowancesError) throw allowancesError;

      // Group data by user and date
      const groupedData = new Map<string, ProductivityData>();

      ordersData?.forEach(order => {
        const userId = order.visits.user_id;
        const beatName = order.visits.retailers.beat_name;
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        const key = `${userId}_${date}`;

        if (!groupedData.has(key)) {
          const allowance = allowancesData?.find(a => a.user_id === userId);
          groupedData.set(key, {
            user_id: userId,
            user_name: allowance?.profiles?.full_name || 'Unknown User',
            beat_name: beatName,
            date: date,
            orders_count: 0,
            total_order_value: 0,
            daily_allowance: allowance?.daily_allowance || 0,
            travel_allowance: allowance?.travel_allowance || 0,
            total_allowance: (allowance?.daily_allowance || 0) + (allowance?.travel_allowance || 0),
            productivity_ratio: 0
          });
        }

        const existing = groupedData.get(key)!;
        existing.orders_count += 1;
        existing.total_order_value += order.total_amount;
        existing.productivity_ratio = existing.total_allowance > 0 
          ? existing.total_order_value / existing.total_allowance 
          : 0;
      });

      const dataArray = Array.from(groupedData.values());

      // Sort data
      dataArray.sort((a, b) => {
        switch (sortBy) {
          case 'productivity_ratio':
            return b.productivity_ratio - a.productivity_ratio;
          case 'orders_count':
            return b.orders_count - a.orders_count;
          case 'total_order_value':
            return b.total_order_value - a.total_order_value;
          default:
            return b.productivity_ratio - a.productivity_ratio;
        }
      });

      setProductivityData(dataArray);

      // Calculate summary
      const newSummary = {
        totalUsers: new Set(dataArray.map(d => d.user_id)).size,
        totalOrders: dataArray.reduce((sum, d) => sum + d.orders_count, 0),
        totalOrderValue: dataArray.reduce((sum, d) => sum + d.total_order_value, 0),
        totalAllowances: dataArray.reduce((sum, d) => sum + d.total_allowance, 0),
        avgProductivity: dataArray.length > 0 
          ? dataArray.reduce((sum, d) => sum + d.productivity_ratio, 0) / dataArray.length 
          : 0
      };

      setSummary(newSummary);

    } catch (error) {
      console.error('Error fetching productivity data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch productivity data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductivityData();
  }, [dateFilter, sortBy]);

  const filteredData = productivityData.filter(item =>
    item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.beat_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductivityColor = (ratio: number) => {
    if (ratio >= 5) return 'text-green-600 bg-green-50';
    if (ratio >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getProductivityLabel = (ratio: number) => {
    if (ratio >= 5) return 'Excellent';
    if (ratio >= 3) return 'Good';
    if (ratio >= 1) return 'Average';
    return 'Below Target';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{summary.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{summary.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Order Value</p>
                <p className="text-2xl font-bold">₹{summary.totalOrderValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Allowances</p>
                <p className="text-2xl font-bold">₹{summary.totalAllowances.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Productivity</p>
                <p className="text-2xl font-bold">{summary.avgProductivity.toFixed(1)}x</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Productivity Tracking</CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="productivity_ratio">Productivity</SelectItem>
                  <SelectItem value="orders_count">Order Count</SelectItem>
                  <SelectItem value="total_order_value">Order Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user name or beat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Beat</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Productivity Ratio</TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No productivity data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((item, index) => (
                      <TableRow key={`${item.user_id}_${item.date}_${index}`}>
                        <TableCell className="font-medium">{item.user_name}</TableCell>
                        <TableCell>{item.beat_name}</TableCell>
                        <TableCell>{format(new Date(item.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{item.orders_count}</TableCell>
                        <TableCell>₹{item.total_order_value.toFixed(2)}</TableCell>
                        <TableCell>₹{item.total_allowance.toFixed(2)}</TableCell>
                        <TableCell>{item.productivity_ratio.toFixed(2)}x</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getProductivityColor(item.productivity_ratio)}`}>
                            {getProductivityLabel(item.productivity_ratio)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductivityTracking;