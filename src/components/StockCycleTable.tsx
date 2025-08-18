import { useState, useEffect } from "react";
import { Calendar, Plus, Download, Package } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface StockCycleData {
  id: string;
  visit_date: string;
  product_id: string;
  product_name: string;
  ordered_quantity: number;
  stock_quantity: number;
  visit_id?: string;
}

interface StockCycleTableProps {
  retailerId: string;
  retailerName: string;
  currentVisitId?: string;
}

interface ProductWithStock {
  product_id: string;
  product_name: string;
  visits: Array<{
    visit_date: string;
    ordered_quantity: number;
    stock_quantity: number;
    visit_id?: string;
  }>;
}

export const StockCycleTable = ({ retailerId, retailerName, currentVisitId }: StockCycleTableProps) => {
  const { user } = useAuth();
  const [stockData, setStockData] = useState<StockCycleData[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    product_id: "",
    ordered_quantity: "",
    stock_quantity: ""
  });

  useEffect(() => {
    if (user && retailerId) {
      loadAllData();
    }
  }, [user, retailerId, selectedDate]);

  const loadAllData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load both stock data and all available products
      await Promise.all([
        loadStockData(),
        loadAllProducts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllProducts = async () => {
    if (!user) return;
    
    try {
      // Get all products that are available for ordering
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAllProducts(products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadStockData = async () => {
    if (!user) return;
    
    try {
      // Get last 6 visits worth of data
      let dateFilter = new Date();
      if (selectedDate) {
        dateFilter = selectedDate;
      }
      
      const endDate = format(dateFilter, 'yyyy-MM-dd');
      const startDate = format(subDays(dateFilter, 180), 'yyyy-MM-dd'); // Get last 6 months for comprehensive data
      
      const { data, error } = await supabase
        .from('stock_cycle_data')
        .select('*')
        .eq('user_id', user.id)
        .eq('retailer_id', retailerId)
        .gte('visit_date', startDate)
        .lte('visit_date', endDate)
        .order('visit_date', { ascending: false })
        .order('product_name', { ascending: true });

      if (error) throw error;
      
      // Also get order data to sync with stock cycle data
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          retailer_id,
          order_items (
            product_id,
            product_name,
            quantity
          )
        `)
        .eq('user_id', user.id)
        .eq('retailer_id', retailerId)
        .eq('status', 'confirmed')
        .gte('created_at', startDate + 'T00:00:00.000Z')
        .lte('created_at', endDate + 'T23:59:59.999Z');

      if (!orderError && orderData) {
        // Process order data to create/update stock cycle entries
        await syncOrderDataWithStockCycle(orderData);
      }
      
      setStockData(data || []);
    } catch (error) {
      console.error('Error loading stock data:', error);
      toast({
        title: "Error Loading Data",
        description: "Could not load stock cycle data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const syncOrderDataWithStockCycle = async (orderData: any[]) => {
    if (!user) return;
    
    // Process each order to update stock cycle data
    for (const order of orderData) {
      const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd');
      
      for (const item of order.order_items || []) {
        // Check if stock cycle entry exists for this product and date
        const { data: existing } = await supabase
          .from('stock_cycle_data')
          .select('id, ordered_quantity')
          .eq('user_id', user.id)
          .eq('retailer_id', retailerId)
          .eq('product_id', item.product_id)
          .eq('visit_date', orderDate)
          .maybeSingle();

        if (existing) {
          // Update existing entry with ordered quantity
          await supabase
            .from('stock_cycle_data')
            .update({ 
              ordered_quantity: existing.ordered_quantity + item.quantity 
            })
            .eq('id', existing.id);
        } else {
          // Create new entry
          await supabase
            .from('stock_cycle_data')
            .insert({
              user_id: user.id,
              retailer_id: retailerId,
              product_id: item.product_id,
              product_name: item.product_name,
              ordered_quantity: item.quantity,
              stock_quantity: 0, // Will be updated separately
              visit_date: orderDate
            });
        }
      }
    }
  };

  const handleAddProduct = async () => {
    if (!user || !newProduct.product_name || !newProduct.stock_quantity) {
      toast({
        title: "Missing Information",
        description: "Please provide product name and stock quantity.",
        variant: "destructive",
      });
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const productId = newProduct.product_id || newProduct.product_name.toLowerCase().replace(/\s+/g, '_');
      
      // Check if entry already exists for today
      const { data: existing } = await supabase
        .from('stock_cycle_data')
        .select('id')
        .eq('user_id', user.id)
        .eq('retailer_id', retailerId)
        .eq('product_id', productId)
        .eq('visit_date', today)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        await supabase
          .from('stock_cycle_data')
          .update({
            stock_quantity: parseInt(newProduct.stock_quantity),
            ordered_quantity: parseInt(newProduct.ordered_quantity) || 0
          })
          .eq('id', existing.id);
      } else {
        // Create new entry
        const productData = {
          user_id: user.id,
          retailer_id: retailerId,
          visit_id: currentVisitId || null,
          product_id: productId,
          product_name: newProduct.product_name,
          ordered_quantity: parseInt(newProduct.ordered_quantity) || 0,
          stock_quantity: parseInt(newProduct.stock_quantity),
          visit_date: today
        };

        await supabase
          .from('stock_cycle_data')
          .insert(productData);
      }

      toast({
        title: "Stock Updated",
        description: `Stock data for ${newProduct.product_name} has been recorded.`,
      });

      setNewProduct({
        product_name: "",
        product_id: "",
        ordered_quantity: "",
        stock_quantity: ""
      });
      setShowAddModal(false);
      loadAllData();
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast({
        title: "Error Adding Product",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const calculateBalance = (currentStock: number, previousStock: number, orderedQty: number) => {
    // Balance = Previous Stock + Ordered - Current Stock (consumption)
    return previousStock + orderedQty - currentStock;
  };

  const calculateAverageConsumption = (productId: string) => {
    const productData = stockData.filter(item => item.product_id === productId);
    if (productData.length < 2) return 0;

    let totalConsumption = 0;
    let validEntries = 0;

    for (let i = 0; i < productData.length - 1; i++) {
      const current = productData[i];
      const previous = productData[i + 1];
      
      const consumption = calculateBalance(current.stock_quantity, previous.stock_quantity, current.ordered_quantity);
      if (consumption >= 0) {
        totalConsumption += consumption;
        validEntries++;
      }
    }

    return validEntries > 0 ? Math.round(totalConsumption / validEntries) : 0;
  };

  // Create comprehensive product data that includes all available products
  const createComprehensiveProductData = () => {
    const productMap = new Map<string, ProductWithStock>();
    
    // First, add all available products from the products table
    allProducts.forEach(product => {
      productMap.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        visits: []
      });
    });
    
    // Then, add products from stock data (in case some aren't in products table)
    stockData.forEach(item => {
      if (!productMap.has(item.product_id)) {
        productMap.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product_name,
          visits: []
        });
      }
      
      const product = productMap.get(item.product_id)!;
      product.visits.push({
        visit_date: item.visit_date,
        ordered_quantity: item.ordered_quantity,
        stock_quantity: item.stock_quantity,
        visit_id: item.visit_id
      });
    });
    
    // Sort visits by date (newest first) and limit to last 6 visits
    productMap.forEach(product => {
      product.visits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
      product.visits = product.visits.slice(0, 6);
    });
    
    return Array.from(productMap.values());
  };

  const comprehensiveProductData = createComprehensiveProductData();
  
  // Get unique visit dates for headers (last 6 visits max)
  const uniqueDates = Array.from(new Set(stockData.map(item => item.visit_date)))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading stock data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Stock Cycle - {retailerName}</CardTitle>
            <div className="flex gap-2">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {comprehensiveProductData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No products available</p>
              <p className="text-sm">Add products to start tracking stock cycles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background">Product Name</TableHead>
                    {uniqueDates.map(date => (
                      <TableHead key={date} className="text-center min-w-[150px]">
                        <div className="space-y-1">
                          <div className="font-semibold">{format(new Date(date), "MMM dd, yyyy")}</div>
                          <div className="text-xs text-muted-foreground grid grid-cols-3 gap-1">
                            <span>Order</span>
                            <span>Stock</span>
                            <span>Balance</span>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[120px]">Avg. Consumption</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comprehensiveProductData.map((product) => {
                    const avgConsumption = calculateAverageConsumption(product.product_id);
                    
                    return (
                      <TableRow key={product.product_id} className="hover:bg-muted/50">
                        <TableCell className="font-medium sticky left-0 bg-background">
                          {product.product_name}
                        </TableCell>
                        {uniqueDates.map(date => {
                          const visitData = product.visits.find(v => v.visit_date === date);
                          const previousVisitIndex = product.visits.findIndex(v => v.visit_date === date) + 1;
                          const previousVisit = product.visits[previousVisitIndex];
                          
                          if (!visitData) {
                            return (
                              <TableCell key={date} className="text-center text-muted-foreground">
                                <div className="text-sm">No visit data</div>
                              </TableCell>
                            );
                          }

                          const balance = previousVisit 
                            ? previousVisit.stock_quantity + visitData.ordered_quantity - visitData.stock_quantity
                            : visitData.ordered_quantity - visitData.stock_quantity;

                          return (
                            <TableCell key={date} className="text-center">
                              <div className="space-y-1">
                                <div className="grid grid-cols-3 gap-1 text-sm">
                                  <Badge variant="outline" className="text-xs px-1">
                                    {visitData.ordered_quantity}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs px-1">
                                    {visitData.stock_quantity}
                                  </Badge>
                                  <Badge 
                                    variant={balance > 0 ? "default" : balance < 0 ? "destructive" : "secondary"} 
                                    className="text-xs px-1"
                                  >
                                    {balance}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-sm">
                            {avgConsumption}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="w-[95%] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Update Product Stock Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Select 
                value={newProduct.product_name} 
                onValueChange={(value) => {
                  const selectedProduct = allProducts.find(p => p.name === value);
                  setNewProduct(prev => ({ 
                    ...prev, 
                    product_name: value,
                    product_id: selectedProduct?.id || value.toLowerCase().replace(/\s+/g, '_')
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {allProducts.map(product => (
                    <SelectItem key={product.id} value={product.name}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderedQty">Ordered Quantity</Label>
                <Input
                  id="orderedQty"
                  type="number"
                  value={newProduct.ordered_quantity}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, ordered_quantity: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockQty">Current Stock *</Label>
                <Input
                  id="stockQty"
                  type="number"
                  value={newProduct.stock_quantity}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProduct}
                className="flex-1"
              >
                Update Stock Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};