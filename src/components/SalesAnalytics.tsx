import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar as CalendarIcon,
  Download,
  BarChart3,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SalesData {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  averageOrdersPerPeriod: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface SalesAnalyticsProps {
  userId: string;
  retailerId: string;
}

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ userId, retailerId }) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'average'>('quantity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'product' | 'variant'>('product');
  const [categories, setCategories] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Set date range based on selection
  useEffect(() => {
    const now = new Date();
    switch (dateRange) {
      case 'weekly':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case 'monthly':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      default:
        break;
    }
  }, [dateRange]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('name');

        if (error) throw error;
        
        const categoryNames = data?.map(cat => cat.name) || [];
        setCategories(['all', ...categoryNames]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch sales data
  useEffect(() => {
    const fetchSalesData = async () => {
      setLoading(true);
      try {
        // Fetch orders within date range
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            retailer_id,
            total_amount,
            created_at,
            order_items (
              product_id,
              product_name,
              category,
              quantity,
              total,
              rate
            )
          `)
          .eq('user_id', userId)
          .eq('retailer_id', retailerId)
          .eq('status', 'confirmed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (ordersError) throw ordersError;

        // Fetch products with variants for variant-level analysis
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            category_id,
            product_categories (name),
            product_variants (
              id,
              variant_name,
              sku
            )
          `);

        if (productsError) throw productsError;

        // Calculate previous period for trend comparison
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const prevStartDate = subDays(startDate, periodDays);
        const prevEndDate = subDays(endDate, periodDays);

        const { data: prevOrders, error: prevOrdersError } = await supabase
          .from('orders')
          .select(`
            order_items (
              product_id,
              quantity,
              total
            )
          `)
          .eq('user_id', userId)
          .eq('retailer_id', retailerId)
          .eq('status', 'confirmed')
          .gte('created_at', prevStartDate.toISOString())
          .lte('created_at', prevEndDate.toISOString());

        if (prevOrdersError) throw prevOrdersError;

        // Process data
        const salesMap = new Map<string, SalesData>();
        const prevSalesMap = new Map<string, number>();

        // Process current period data
        orders?.forEach(order => {
          order.order_items?.forEach(item => {
            const product = products?.find(p => p.id === item.product_id);
            const categoryName = product?.product_categories?.name || item.category || 'Unknown';
            
            if (viewMode === 'product') {
              const key = item.product_id;
              const existing = salesMap.get(key);
              
              if (existing) {
                existing.quantitySold += item.quantity;
                existing.totalRevenue += item.total;
              } else {
                salesMap.set(key, {
                  productId: item.product_id,
                  productName: item.product_name,
                  category: categoryName,
                  quantitySold: item.quantity,
                  totalRevenue: item.total,
                  averageOrdersPerPeriod: 0,
                  trend: 'stable',
                  trendPercentage: 0
                });
              }
            } else {
              // Variant mode - would need order_items to include variant_id
              // For now, group by product
              const key = item.product_id;
              const existing = salesMap.get(key);
              
              if (existing) {
                existing.quantitySold += item.quantity;
                existing.totalRevenue += item.total;
              } else {
                salesMap.set(key, {
                  productId: item.product_id,
                  productName: item.product_name,
                  category: categoryName,
                  quantitySold: item.quantity,
                  totalRevenue: item.total,
                  averageOrdersPerPeriod: 0,
                  trend: 'stable',
                  trendPercentage: 0
                });
              }
            }
          });
        });

        // Process previous period data for trend analysis
        prevOrders?.forEach(order => {
          order.order_items?.forEach(item => {
            const key = item.product_id;
            const existing = prevSalesMap.get(key) || 0;
            prevSalesMap.set(key, existing + item.quantity);
          });
        });

        // Calculate trends and averages
        const salesArray = Array.from(salesMap.values()).map(sale => {
          const orderCount = orders?.filter(order => 
            order.order_items?.some(item => item.product_id === sale.productId)
          ).length || 0;
          
          sale.averageOrdersPerPeriod = orderCount / Math.max(periodDays / 7, 1); // Weekly average
          
          // Calculate trend
          const prevQuantity = prevSalesMap.get(sale.productId) || 0;
          if (prevQuantity === 0 && sale.quantitySold > 0) {
            sale.trend = 'up';
            sale.trendPercentage = 100;
          } else if (prevQuantity > 0) {
            const change = ((sale.quantitySold - prevQuantity) / prevQuantity) * 100;
            if (change > 5) {
              sale.trend = 'up';
              sale.trendPercentage = change;
            } else if (change < -5) {
              sale.trend = 'down';
              sale.trendPercentage = Math.abs(change);
            } else {
              sale.trend = 'stable';
              sale.trendPercentage = Math.abs(change);
            }
          }
          
          return sale;
        });

        setSalesData(salesArray);
      } catch (error) {
        console.error('Error fetching sales data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch sales data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (userId && retailerId) {
      fetchSalesData();
    }
  }, [userId, retailerId, startDate, endDate, viewMode]);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = salesData;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'quantity':
          aValue = a.quantitySold;
          bValue = b.quantitySold;
          break;
        case 'revenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'average':
          aValue = a.averageOrdersPerPeriod;
          bValue = b.averageOrdersPerPeriod;
          break;
        default:
          aValue = a.quantitySold;
          bValue = b.quantitySold;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [salesData, selectedCategory, sortBy, sortOrder]);

  // Get top sellers and not ordered products
  const topSellers = filteredAndSortedData.slice(0, 5);
  const notOrdered = salesData.filter(item => item.quantitySold === 0);

  const exportData = () => {
    const csvData = filteredAndSortedData.map(item => ({
      'Product Name': item.productName,
      'Variant Name': item.variantName || 'N/A',
      'Category': item.category,
      'Quantity Sold': item.quantitySold,
      'Total Revenue': item.totalRevenue,
      'Average Orders': item.averageOrdersPerPeriod.toFixed(2),
      'Trend': item.trend,
      'Trend %': item.trendPercentage.toFixed(1)
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_analytics_${format(startDate, 'yyyy-MM-dd')}_to_${format(endDate, 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSalesColor = (quantitySold: number, maxQuantity: number) => {
    const percentage = maxQuantity > 0 ? (quantitySold / maxQuantity) * 100 : 0;
    if (percentage >= 70) return 'bg-green-100 border-green-200';
    if (percentage >= 30) return 'bg-yellow-100 border-yellow-200';
    return 'bg-red-100 border-red-200';
  };

  const maxQuantity = Math.max(...filteredAndSortedData.map(item => item.quantitySold), 1);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Range */}
            <div className="flex gap-2">
              <Button
                variant={dateRange === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('weekly')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange('monthly')}
              >
                Last 30 Days
              </Button>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateRange === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDateRange('custom');
                      setShowDatePicker(true);
                    }}
                  >
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        className="rounded-md border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        className="rounded-md border"
                      />
                    </div>
                    <Button onClick={() => setShowDatePicker(false)} className="w-full">
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* View Mode */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'product' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('product')}
              >
                By Product
              </Button>
              <Button
                variant={viewMode === 'variant' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('variant')}
              >
                By Variant
              </Button>
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Controls */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">Quantity Sold</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="average">Avg Orders</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
            </Button>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{filteredAndSortedData.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ₹{filteredAndSortedData.reduce((sum, item) => sum + item.totalRevenue, 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Not Ordered</p>
                <p className="text-2xl font-bold text-red-500">{notOrdered.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sections */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="top">Top Sellers</TabsTrigger>
          <TabsTrigger value="not-ordered">Not Ordered</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sales data found for the selected period
            </div>
          ) : (
            filteredAndSortedData.map((item) => (
              <Card key={`${item.productId}-${item.variantId || 'main'}`} 
                className={getSalesColor(item.quantitySold, maxQuantity)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.productName}</h3>
                        {item.variantName && (
                          <Badge variant="outline">{item.variantName}</Badge>
                        )}
                        {getTrendIcon(item.trend)}
                        <span className="text-sm text-muted-foreground">
                          {item.trendPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Qty Sold</p>
                          <p className="font-semibold">{item.quantitySold}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="font-semibold">₹{item.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Orders/Week</p>
                          <p className="font-semibold">{item.averageOrdersPerPeriod.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="top" className="space-y-3">
          {topSellers.map((item, index) => (
            <Card key={`${item.productId}-${item.variantId || 'main'}`} 
              className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-500">{index + 1}</Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.productName}</h3>
                      {item.variantName && (
                        <Badge variant="outline">{item.variantName}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Qty Sold</p>
                        <p className="font-semibold">{item.quantitySold}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                        <p className="font-semibold">₹{item.totalRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Orders/Week</p>
                        <p className="font-semibold">{item.averageOrdersPerPeriod.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="not-ordered" className="space-y-3">
          {notOrdered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              All products have sales in the selected period!
            </div>
          ) : (
            notOrdered.map((item) => (
              <Card key={`${item.productId}-${item.variantId || 'main'}`} 
                className="bg-red-50 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.productName}</h3>
                        {item.variantName && (
                          <Badge variant="outline">{item.variantName}</Badge>
                        )}
                        <Badge variant="destructive">No Sales</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};