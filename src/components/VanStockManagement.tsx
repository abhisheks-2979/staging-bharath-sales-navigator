import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, ShoppingCart, TrendingDown, Plus, Eye, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Van {
  id: string;
  registration_number: string;
  make_model: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface StockItem {
  id?: string;
  product_id: string;
  product_name: string;
  unit: string;
  start_qty: number;
  ordered_qty: number;
  left_qty: number;
}

interface VanStockManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

export function VanStockManagement({ open, onOpenChange, selectedDate }: VanStockManagementProps) {
  const [vans, setVans] = useState<Van[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedVan, setSelectedVan] = useState<string>('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [todayStock, setTodayStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<'start' | 'ordered' | 'left' | 'inventory' | null>(null);
  const [isMorning, setIsMorning] = useState(true);

  useEffect(() => {
    if (open) {
      loadVans();
      loadProducts();
      checkTime();
    }
  }, [open]);

  useEffect(() => {
    if (selectedVan && selectedDate) {
      loadTodayStock();
    }
  }, [selectedVan, selectedDate]);

  const checkTime = () => {
    const hour = new Date().getHours();
    setIsMorning(hour < 12);
  };

  const loadVans = async () => {
    const { data, error } = await supabase
      .from('vans')
      .select('id, registration_number, make_model')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error loading vans:', error);
    } else {
      setVans(data || []);
      if (data && data.length > 0) {
        setSelectedVan(data[0].id);
      }
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, unit')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts(data || []);
    }
  };

  const loadTodayStock = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    const { data, error } = await supabase
      .from('van_stock')
      .select('*, van_stock_items(*)')
      .eq('van_id', selectedVan)
      .eq('stock_date', selectedDate)
      .eq('user_id', session.session.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading stock:', error);
      setTodayStock(null);
      setStockItems([]);
    } else {
      setTodayStock(data);
      if (data?.van_stock_items) {
        setStockItems(data.van_stock_items.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          unit: item.unit,
          start_qty: item.start_qty,
          ordered_qty: item.ordered_qty,
          left_qty: item.left_qty,
        })));
      } else {
        setStockItems([]);
      }
    }
  };

  const handleAddProduct = () => {
    setStockItems([...stockItems, {
      product_id: '',
      product_name: '',
      unit: '',
      start_qty: 0,
      ordered_qty: 0,
      left_qty: 0,
    }]);
  };

  const handleRemoveProduct = (index: number) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof StockItem, value: any) => {
    const updated = [...stockItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].product_name = product.name;
        updated[index].unit = product.unit;
      }
    }

    if (field === 'start_qty' || field === 'ordered_qty') {
      updated[index].left_qty = updated[index].start_qty - updated[index].ordered_qty;
    }
    
    setStockItems(updated);
  };

  const handleSaveStock = async () => {
    if (!selectedVan) {
      toast.error('Please select a van');
      return;
    }

    if (stockItems.length === 0 || stockItems.some(item => !item.product_id)) {
      toast.error('Please add at least one product with valid details');
      return;
    }

    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    try {
      // Upsert van_stock
      const { data: vanStock, error: stockError } = await supabase
        .from('van_stock')
        .upsert({
          id: todayStock?.id,
          van_id: selectedVan,
          user_id: session.session.user.id,
          stock_date: selectedDate,
          status: 'open',
        }, {
          onConflict: 'van_id,stock_date,user_id',
        })
        .select()
        .single();

      if (stockError) throw stockError;

      // Delete existing items and insert new ones
      if (todayStock?.id) {
        await supabase
          .from('van_stock_items')
          .delete()
          .eq('van_stock_id', vanStock.id);
      }

      const items = stockItems.map(item => ({
        van_stock_id: vanStock.id,
        product_id: item.product_id,
        product_name: item.product_name,
        start_qty: item.start_qty,
        ordered_qty: item.ordered_qty,
        left_qty: item.left_qty,
        unit: item.unit,
      }));

      const { error: itemsError } = await supabase
        .from('van_stock_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success('Van stock saved successfully');
      await loadTodayStock();
    } catch (error) {
      console.error('Error saving stock:', error);
      toast.error('Failed to save van stock');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return stockItems.reduce((acc, item) => ({
      totalStart: acc.totalStart + item.start_qty,
      totalOrdered: acc.totalOrdered + item.ordered_qty,
      totalLeft: acc.totalLeft + item.left_qty,
    }), { totalStart: 0, totalOrdered: 0, totalLeft: 0 });
  };

  const totals = calculateTotals();
  const availableInventory = totals.totalStart; // Available = Start qty

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Van Stock Management - {new Date(selectedDate).toLocaleDateString('en-IN', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'short',
                year: 'numeric' 
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Van</Label>
              <Select value={selectedVan} onValueChange={setSelectedVan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a van" />
                </SelectTrigger>
                <SelectContent>
                  {vans.map(van => (
                    <SelectItem key={van.id} value={van.id}>
                      {van.registration_number} - {van.make_model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVan && (
              <>
                {/* Summary Cards - All Clickable */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('start')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Package className="h-5 w-5 text-primary" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Product Stock in Van</p>
                    <p className="text-2xl font-bold">{totals.totalStart}</p>
                  </Card>

                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('inventory')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Available Inventory</p>
                    <p className="text-2xl font-bold">{availableInventory}</p>
                  </Card>

                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('ordered')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShoppingCart className="h-5 w-5 text-success" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Retailer Ordered Qty</p>
                    <p className="text-2xl font-bold">{totals.totalOrdered}</p>
                  </Card>

                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('left')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <TrendingDown className="h-5 w-5 text-orange-500" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Left in the Van</p>
                    <p className="text-2xl font-bold">{totals.totalLeft}</p>
                  </Card>
                </div>

                {/* Morning/Evening Status */}
                <div className="flex items-center gap-2">
                  <Badge variant={isMorning ? "default" : "secondary"}>
                    {isMorning ? "Morning - Add Start Stock" : "Evening - Update Orders & Left Stock"}
                  </Badge>
                </div>

                {/* Stock Items Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold">Stock Items</Label>
                    <Button size="sm" onClick={handleAddProduct}>
                      <Plus className="h-4 w-4 mr-1" /> Add Product
                    </Button>
                  </div>

                  {stockItems.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No products added yet</p>
                      <Button size="sm" onClick={handleAddProduct} className="mt-3">
                        <Plus className="h-4 w-4 mr-1" /> Add Your First Product
                      </Button>
                    </Card>
                  ) : (
                    stockItems.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                          <div className="md:col-span-2">
                            <Label className="text-xs">Product</Label>
                            <Select
                              value={item.product_id}
                              onValueChange={(value) => handleProductChange(index, 'product_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Start Qty (Morning)</Label>
                            <Input
                              type="number"
                              value={item.start_qty}
                              onChange={(e) => handleProductChange(index, 'start_qty', parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Ordered Qty</Label>
                            <Input
                              type="number"
                              value={item.ordered_qty}
                              onChange={(e) => handleProductChange(index, 'ordered_qty', parseInt(e.target.value) || 0)}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Left Qty (Auto)</Label>
                            <Input
                              type="number"
                              value={item.left_qty}
                              readOnly
                              className="bg-muted"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => handleRemoveProduct(index)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleSaveStock} disabled={loading} className="flex-1">
                    {loading ? 'Saving...' : 'Save Van Stock'}
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!showDetailModal} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showDetailModal === 'start' && <><Package className="h-5 w-5 text-primary" /> Product Stock in Van</>}
              {showDetailModal === 'inventory' && <><Package className="h-5 w-5 text-blue-500" /> Available Inventory</>}
              {showDetailModal === 'ordered' && <><ShoppingCart className="h-5 w-5 text-success" /> Retailer Ordered Qty</>}
              {showDetailModal === 'left' && <><TrendingDown className="h-5 w-5 text-orange-500" /> Left in the Van</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {stockItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No stock items added yet</p>
              </div>
            ) : (
              stockItems.map((item, index) => (
                <Card key={index} className="p-3 hover:bg-accent transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {showDetailModal === 'start' && item.start_qty}
                        {showDetailModal === 'inventory' && item.start_qty}
                        {showDetailModal === 'ordered' && item.ordered_qty}
                        {showDetailModal === 'left' && item.left_qty}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
            
            {stockItems.length > 0 && (
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-lg">Total</p>
                  <p className="text-3xl font-bold text-primary">
                    {showDetailModal === 'start' && totals.totalStart}
                    {showDetailModal === 'inventory' && availableInventory}
                    {showDetailModal === 'ordered' && totals.totalOrdered}
                    {showDetailModal === 'left' && totals.totalLeft}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
