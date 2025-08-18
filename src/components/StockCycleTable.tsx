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

export const StockCycleTable = ({ retailerId, retailerName, currentVisitId }: StockCycleTableProps) => {
  const { user } = useAuth();
  const [stockData, setStockData] = useState<StockCycleData[]>([]);
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
      loadStockData();
    }
  }, [user, retailerId, selectedDate]);

  const loadStockData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get last 6 visits (including today) by default, or filter by selected date
      let dateFilter = new Date();
      if (selectedDate) {
        dateFilter = selectedDate;
      }
      
      const endDate = format(dateFilter, 'yyyy-MM-dd');
      const startDate = format(subDays(dateFilter, 30), 'yyyy-MM-dd'); // Get last 30 days for more data
      
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
      setStockData(data || []);
    } catch (error) {
      console.error('Error loading stock data:', error);
      toast({
        title: "Error Loading Data",
        description: "Could not load stock cycle data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!user || !newProduct.product_name || !newProduct.ordered_quantity || !newProduct.stock_quantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        user_id: user.id,
        retailer_id: retailerId,
        visit_id: currentVisitId || null,
        product_id: newProduct.product_id || newProduct.product_name.toLowerCase().replace(/\s+/g, '_'),
        product_name: newProduct.product_name,
        ordered_quantity: parseInt(newProduct.ordered_quantity),
        stock_quantity: parseInt(newProduct.stock_quantity),
        visit_date: format(new Date(), 'yyyy-MM-dd')
      };

      const { error } = await supabase
        .from('stock_cycle_data')
        .insert(productData);

      if (error) throw error;

      toast({
        title: "Product Added",
        description: `Stock data for ${newProduct.product_name} has been recorded.`,
      });

      setNewProduct({
        product_name: "",
        product_id: "",
        ordered_quantity: "",
        stock_quantity: ""
      });
      setShowAddModal(false);
      loadStockData();
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

  // Group data by product and visit date
  const groupedData = stockData.reduce((acc, item) => {
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        product_name: item.product_name,
        visits: []
      };
    }
    acc[item.product_id].visits.push(item);
    return acc;
  }, {} as Record<string, { product_name: string; visits: StockCycleData[] }>);

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
          {Object.keys(groupedData).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock data recorded yet</p>
              <p className="text-sm">Start by adding product stock information</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Product Name</TableHead>
                    {uniqueDates.map(date => (
                      <TableHead key={date} className="text-center min-w-[120px]">
                        {format(new Date(date), "MMM dd")}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Avg. Consumption</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedData).map(([productId, productInfo]) => {
                    const avgConsumption = calculateAverageConsumption(productId);
                    
                    return (
                      <TableRow key={productId}>
                        <TableCell className="font-medium">
                          {productInfo.product_name}
                        </TableCell>
                        {uniqueDates.map(date => {
                          const visitData = productInfo.visits.find(v => v.visit_date === date);
                          const previousVisit = productInfo.visits.find(v => 
                            new Date(v.visit_date) < new Date(date)
                          );
                          
                          if (!visitData) {
                            return <TableCell key={date} className="text-center text-muted-foreground">-</TableCell>;
                          }

                          const balance = previousVisit 
                            ? calculateBalance(visitData.stock_quantity, previousVisit.stock_quantity, visitData.ordered_quantity)
                            : 0;

                          return (
                            <TableCell key={date} className="text-center">
                              <div className="space-y-1">
                                <div className="text-sm">
                                  <span className="text-green-600">O: {visitData.ordered_quantity}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-blue-600">S: {visitData.stock_quantity}</span>
                                </div>
                                {previousVisit && (
                                  <div className="text-xs text-muted-foreground">
                                    B: {balance}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant="secondary">
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
            <DialogTitle>Add Product Stock Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={newProduct.product_name}
                onChange={(e) => setNewProduct(prev => ({ ...prev, product_name: e.target.value }))}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productId">Product ID (Optional)</Label>
              <Input
                id="productId"
                value={newProduct.product_id}
                onChange={(e) => setNewProduct(prev => ({ ...prev, product_id: e.target.value }))}
                placeholder="Auto-generated if not provided"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderedQty">Ordered Quantity *</Label>
                <Input
                  id="orderedQty"
                  type="number"
                  value={newProduct.ordered_quantity}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, ordered_quantity: e.target.value }))}
                  placeholder="0"
                  min="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockQty">Stock Quantity *</Label>
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
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};