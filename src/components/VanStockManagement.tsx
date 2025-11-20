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
  returned_qty: number;
  left_qty: number;
}

interface Beat {
  id: string;
  beat_name: string;
}

interface VanStockManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

export function VanStockManagement({ open, onOpenChange, selectedDate }: VanStockManagementProps) {
  const [vans, setVans] = useState<Van[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [selectedVan, setSelectedVan] = useState<string>('');
  const [selectedBeat, setSelectedBeat] = useState<string>('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [todayStock, setTodayStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<'start' | 'ordered' | 'returned' | 'left' | 'inventory' | null>(null);
  const [isMorning, setIsMorning] = useState(true);
  const [startKm, setStartKm] = useState(0);
  const [endKm, setEndKm] = useState(0);

  useEffect(() => {
    if (open) {
      loadVans();
      loadProducts();
      loadBeatForDate();
      checkTime();
    }
  }, [open, selectedDate]);

  useEffect(() => {
    if (selectedVan && selectedDate && selectedBeat) {
      loadTodayStock();
    }
  }, [selectedVan, selectedDate, selectedBeat]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!selectedBeat || !selectedDate) return;

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Reload stock when orders change
          if (selectedVan && selectedBeat) {
            loadTodayStock();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedVan, selectedBeat, selectedDate]);

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
    try {
      // Try loading from IndexedDB first (offline-first)
      const { offlineStorage, STORES } = await import('@/lib/offlineStorage');
      let cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
      
      if (cachedProducts && cachedProducts.length > 0) {
        console.log('Loaded products from cache:', cachedProducts.length);
        setProducts(cachedProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          unit: p.unit
        })));
      }
      
      // Try online fetch to update cache
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, unit')
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          console.error('Error fetching products:', error);
        } else if (data) {
          console.log('Loaded products from database:', data.length);
          setProducts(data);
          // Update cache
          for (const product of data) {
            await offlineStorage.save(STORES.PRODUCTS, product);
          }
        }
      } catch (onlineError) {
        console.log('Online fetch failed, using cached products:', onlineError);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadBeatForDate = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    // selectedDate is a string, use it directly
    const { data, error } = await supabase
      .from('beat_plans')
      .select('beat_id, beat_name')
      .eq('user_id', session.session.user.id)
      .eq('plan_date', selectedDate)
      .single();

    if (error) {
      console.error('Error loading beat plan:', error);
      toast.error('No beat plan found for this date');
      return;
    }
    
    if (data) {
      setBeats([{ id: data.beat_id, beat_name: data.beat_name }]);
      setSelectedBeat(data.beat_id);
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
      
      // Calculate ordered quantities from actual orders for the selected beat
      const orderedQtys = await calculateOrderedQuantities();
      
      if (data?.van_stock_items) {
        setStockItems(data.van_stock_items.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          unit: item.unit,
          start_qty: item.start_qty,
          ordered_qty: orderedQtys[item.product_id] || 0, // Auto-calculate from orders
          returned_qty: item.returned_qty || 0,
          left_qty: item.start_qty - (orderedQtys[item.product_id] || 0) + (item.returned_qty || 0),
        })));
      } else {
        setStockItems([]);
      }
      setStartKm(data?.start_km || 0);
      setEndKm(data?.end_km || 0);
    }
  };

  const calculateOrderedQuantities = async () => {
    if (!selectedBeat) return {};

    try {
      // Get all retailers in the selected beat
      const { data: retailers, error: retailerError } = await supabase
        .from('retailers')
        .select('id')
        .eq('beat_id', selectedBeat);

      if (retailerError) throw retailerError;
      
      const retailerIds = retailers?.map(r => r.id) || [];
      if (retailerIds.length === 0) return {};

      // Get all orders for today from retailers in this beat
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .in('retailer_id', retailerIds)
        .gte('created_at', `${selectedDate}T00:00:00`)
        .lte('created_at', `${selectedDate}T23:59:59`);

      if (ordersError) throw ordersError;

      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length === 0) return {};

      // Get all order items for these orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Sum quantities by product
      const quantities: { [key: string]: number } = {};
      orderItems?.forEach(item => {
        quantities[item.product_id] = (quantities[item.product_id] || 0) + item.quantity;
      });

      return quantities;
    } catch (error) {
      console.error('Error calculating ordered quantities:', error);
      return {};
    }
  };

  const handleAddProduct = () => {
    setStockItems([...stockItems, {
      product_id: '',
      product_name: '',
      unit: '',
      start_qty: 0,
      ordered_qty: 0,
      returned_qty: 0,
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

    // Only auto-calculate left_qty when start_qty or returned_qty changes
    // ordered_qty is now auto-calculated from orders
    if (field === 'start_qty' || field === 'returned_qty') {
      updated[index].left_qty = updated[index].start_qty - updated[index].ordered_qty + updated[index].returned_qty;
    }
    
    setStockItems(updated);
  };

  const handleSaveStock = async () => {
    if (!selectedVan) {
      toast.error('Please select a van');
      return;
    }

    if (!startKm || startKm === 0) {
      toast.error('Please enter the Start KM.');
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
          start_km: startKm,
          end_km: endKm,
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
        returned_qty: item.returned_qty,
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
      totalReturned: acc.totalReturned + item.returned_qty,
      totalLeft: acc.totalLeft + item.left_qty,
    }), { totalStart: 0, totalOrdered: 0, totalReturned: 0, totalLeft: 0 });
  };

  const totals = calculateTotals();
  const totalKm = endKm - startKm;

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <Label>Beat (Auto-selected from plan)</Label>
                <Select value={selectedBeat} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Beat will be auto-selected based on date" />
                  </SelectTrigger>
                  <SelectContent>
                    {beats.map(beat => (
                      <SelectItem key={beat.id} value={beat.id}>
                        {beat.beat_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedVan && selectedBeat && (
              <>
                {/* Summary Cards */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Retailer Ordered Qty is automatically calculated from orders placed by retailers in the selected beat for today.
                  </p>
                </div>

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
                    onClick={() => setShowDetailModal('ordered')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShoppingCart className="h-5 w-5 text-amber-500" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Retailer Ordered Qty</p>
                    <p className="text-2xl font-bold">{totals.totalOrdered}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px] px-1 py-0">Auto-calculated</Badge>
                  </Card>

                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('returned')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Returned Qty</p>
                    <p className="text-2xl font-bold">{totals.totalReturned}</p>
                  </Card>

                  <Card 
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('left')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <TrendingDown className="h-5 w-5 text-green-600" />
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">Left in the Van</p>
                    <p className="text-2xl font-bold">{totals.totalLeft}</p>
                  </Card>
                </div>

                {/* KM Tracking */}
                <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Start KM</Label>
                      <Input
                        type="number"
                        value={startKm}
                        onChange={(e) => setStartKm(parseFloat(e.target.value) || 0)}
                        placeholder="Enter start km"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">End KM</Label>
                      <Input
                        type="number"
                        value={endKm}
                        onChange={(e) => setEndKm(parseFloat(e.target.value) || 0)}
                        placeholder="Enter end km"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Total KM (Day)</Label>
                      <div className="mt-1 h-10 px-3 py-2 bg-primary/10 rounded-md border border-primary/20 flex items-center">
                        <span className="text-lg font-bold text-primary">{totalKm.toFixed(2)} km</span>
                      </div>
                    </div>
                  </div>
                </Card>

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
                    <div className="space-y-4">
                      {stockItems.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <Label className="text-xs">Product</Label>
                            <Select
                              value={item.product_id}
                              onValueChange={(value) => handleProductChange(index, 'product_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent 
                                position="popper" 
                                className="z-50 bg-background border shadow-md max-h-[250px] overflow-y-auto"
                                sideOffset={4}
                              >
                                {products.map(product => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            </div>
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Select
                              value={item.unit}
                              onValueChange={(value) => handleProductChange(index, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="grams">grams</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                value={item.start_qty}
                                onChange={(e) => handleProductChange(index, 'start_qty', parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleRemoveProduct(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                      ))}
                    </div>
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
              {showDetailModal === 'ordered' && (
                <div className="flex items-center gap-2 w-full">
                  <ShoppingCart className="h-5 w-5 text-amber-500" />
                  <span>Retailer Ordered Qty (Beat: {beats.find(b => b.id === selectedBeat)?.beat_name})</span>
                  <Badge variant="secondary" className="ml-auto">Auto-calculated</Badge>
                </div>
              )}
              {showDetailModal === 'returned' && <><Package className="h-5 w-5 text-blue-600" /> Returned Qty</>}
              {showDetailModal === 'left' && <><TrendingDown className="h-5 w-5 text-green-600" /> Left in the Van</>}
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
                        {showDetailModal === 'ordered' && item.ordered_qty}
                        {showDetailModal === 'returned' && item.returned_qty}
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
                    {showDetailModal === 'ordered' && totals.totalOrdered}
                    {showDetailModal === 'returned' && totals.totalReturned}
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
