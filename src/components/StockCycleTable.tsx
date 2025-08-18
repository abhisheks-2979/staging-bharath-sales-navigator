import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, Package, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface StockCycleData {
  id: string;
  visit_date: string;
  product_name: string;
  ordered_quantity: number;
  stock_quantity: number;
  calculated_balance: number;
  average_consumption: number;
  previous_order_qty?: number;
  previous_stock_qty?: number;
}

interface Retailer {
  id: string;
  name: string;
}

interface StockCycleTableProps {
  selectedRetailerId?: string;
}

export const StockCycleTable: React.FC<StockCycleTableProps> = ({ selectedRetailerId }) => {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedRetailer, setSelectedRetailer] = useState<string>(selectedRetailerId || '');
  const [stockData, setStockData] = useState<StockCycleData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch retailers for the current user
  useEffect(() => {
    const fetchRetailers = async () => {
      try {
        const { data, error } = await supabase
          .from('retailers')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setRetailers(data || []);
      } catch (error) {
        console.error('Error fetching retailers:', error);
        toast({
          title: "Error",
          description: "Failed to fetch retailers",
          variant: "destructive",
        });
      }
    };

    fetchRetailers();
  }, [toast]);

  // Fetch stock cycle data for selected retailer
  useEffect(() => {
    if (!selectedRetailer) {
      setStockData([]);
      return;
    }

    const fetchStockData = async () => {
      setLoading(true);
      try {
        // Get the last 6 visits (current + previous 5)
        const { data: rawData, error } = await supabase
          .from('stock_cycle_data')
          .select('*')
          .eq('retailer_id', selectedRetailer)
          .order('visit_date', { ascending: false })
          .limit(6);

        if (error) throw error;

        // Calculate balances and averages
        const processedData = rawData?.map((item, index) => {
          // Get previous visit data
          const previousVisit = rawData[index + 1];
          
          // Calculate balance: Previous Stock + Previous Order - Current Stock
          const calculated_balance = previousVisit 
            ? (previousVisit.stock_quantity + previousVisit.ordered_quantity) - item.stock_quantity
            : 0;

          // Calculate average consumption from historical data
          const relevantVisits = rawData.slice(index + 1);
          const average_consumption = relevantVisits.length > 0
            ? relevantVisits.reduce((sum, visit) => sum + visit.ordered_quantity, 0) / relevantVisits.length
            : 0;

          return {
            ...item,
            calculated_balance,
            average_consumption: Math.round(average_consumption * 100) / 100,
            previous_order_qty: previousVisit?.ordered_quantity || 0,
            previous_stock_qty: previousVisit?.stock_quantity || 0,
          };
        }) || [];

        setStockData(processedData);
      } catch (error) {
        console.error('Error fetching stock data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch stock cycle data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [selectedRetailer, toast]);

  // Set up real-time subscription for stock cycle data updates
  useEffect(() => {
    if (!selectedRetailer) return;

    const channel = supabase
      .channel('stock_cycle_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_cycle_data',
          filter: `retailer_id=eq.${selectedRetailer}`,
        },
        () => {
          // Refetch data when changes occur
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRetailer]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Stock Cycle Tracking
        </CardTitle>
        
        {/* Retailer Selection */}
        <div className="flex gap-4 items-center">
          <Select value={selectedRetailer} onValueChange={setSelectedRetailer}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Select a retailer to view stock data" />
            </SelectTrigger>
            <SelectContent>
              {retailers.map((retailer) => (
                <SelectItem key={retailer.id} value={retailer.id}>
                  {retailer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading stock data...</div>
        ) : !selectedRetailer ? (
          <div className="text-center py-8 text-muted-foreground">
            Please select a retailer to view stock cycle data
          </div>
        ) : stockData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No stock data found for this retailer
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Visits</p>
                      <p className="text-2xl font-bold">{stockData.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Products Tracked</p>
                      <p className="text-2xl font-bold">
                        {new Set(stockData.map(item => item.product_name)).size}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Order Size</p>
                      <p className="text-2xl font-bold">
                        {Math.round((stockData.reduce((sum, item) => sum + item.ordered_quantity, 0) / stockData.length) * 100) / 100}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Stock Level</p>
                      <p className="text-2xl font-bold">
                        {Math.round((stockData.reduce((sum, item) => sum + item.stock_quantity, 0) / stockData.length) * 100) / 100}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stock Cycle Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date of Visit</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Ordered Qty</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Previous Order</TableHead>
                    <TableHead className="text-right">Previous Stock</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Avg Consumption</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(item.visit_date), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {item.product_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.ordered_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.stock_quantity}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.previous_order_qty || '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.previous_stock_qty || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={item.calculated_balance > 0 ? "default" : "destructive"}
                          className="font-medium"
                        >
                          {item.calculated_balance}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.average_consumption.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};