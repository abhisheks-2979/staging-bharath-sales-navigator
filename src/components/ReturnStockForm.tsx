import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Check, Plus, ChevronsUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  unit: string;
  rate: number;
  sku?: string;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  price: number;
}

interface ReturnItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  unit: string;
  returnQuantity: number;
  returnReason: string;
}

interface ReturnStockFormProps {
  visitId: string;
  retailerId: string;
  retailerName: string;
  onComplete: () => void;
}

const returnReasons = [
  'Damaged',
  'Expired',
  'Wrong Product',
  'Quality Issue',
  'Excess Stock',
  'Customer Return',
  'Other'
];

export function ReturnStockForm({ visitId, retailerId, retailerName, onComplete }: ReturnStockFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVan, setSelectedVan] = useState<string>('');
  const [vans, setVans] = useState<any[]>([]);
  
  // Form state for adding new return
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [returnQuantity, setReturnQuantity] = useState<number>(0);
  const [returnReason, setReturnReason] = useState<string>('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  useEffect(() => {
    loadVans();
    loadProducts();
  }, []);

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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          unit,
          rate,
          sku,
          product_variants (
            id,
            variant_name,
            sku,
            price
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const productsWithVariants: Product[] = (data || []).map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        rate: p.rate,
        sku: p.sku || undefined,
        variants: (p.product_variants || []) as ProductVariant[]
      }));

      setProducts(productsWithVariants);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReturn = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (returnQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!returnReason) {
      toast.error('Please select a return reason');
      return;
    }

    const [productId, variantId] = selectedProduct.split('_variant_');
    const product = products.find(p => p.id === productId);
    
    if (!product) return;

    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined;

    const newItem: ReturnItem = {
      productId,
      variantId: variantId || undefined,
      productName: product.name,
      variantName: variant?.variant_name,
      unit: product.unit,
      returnQuantity,
      returnReason
    };

    setReturnItems(prev => [...prev, newItem]);
    
    // Reset form
    setSelectedProduct('');
    setReturnQuantity(0);
    setReturnReason('');
    
    toast.success(`Added ${newItem.productName}${newItem.variantName ? ` - ${newItem.variantName}` : ''}`);
  };

  const handleRemoveItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveReturns = async () => {
    if (!selectedVan) {
      toast.error('Please select a van');
      return;
    }

    if (returnItems.length === 0) {
      toast.error('No items added for return');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dateStr = new Date().toISOString().split('T')[0];
      const grnNumber = `RET-${Date.now()}`;

      // Create Return GRN
      const { data: returnGRN, error: grnError } = await supabase
        .from('van_return_grn')
        .insert({
          van_id: selectedVan,
          user_id: user.id,
          retailer_id: retailerId,
          visit_id: visitId,
          return_date: dateStr,
          return_grn_number: grnNumber,
          notes: `Returns from ${retailerName}`
        })
        .select()
        .single();

      if (grnError) throw grnError;

      // Create Return GRN Items
      const returnGRNItems = returnItems.map(item => ({
        return_grn_id: returnGRN.id,
        product_id: item.productId,
        variant_id: item.variantId || null,
        return_quantity: item.returnQuantity,
        return_reason: item.returnReason
      }));

      const { error: itemsError } = await supabase
        .from('van_return_grn_items')
        .insert(returnGRNItems);

      if (itemsError) throw itemsError;

      // Update van_live_inventory for each returned item
      for (const item of returnItems) {
        // Build query
        let query = supabase
          .from('van_live_inventory')
          .select('*')
          .eq('van_id', selectedVan)
          .eq('product_id', item.productId)
          .eq('date', dateStr);

        // Add variant condition
        if (item.variantId) {
          query = query.eq('variant_id', item.variantId);
        } else {
          query = query.is('variant_id', null);
        }

        const { data: inventoryData, error: inventoryError } = await query.maybeSingle();

        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
          continue;
        }

        if (inventoryData) {
          // Update existing inventory
          const newReturnedQty = inventoryData.returned_quantity + item.returnQuantity;
          const newCurrentStock = inventoryData.morning_stock - inventoryData.sold_quantity + newReturnedQty;

          const { error: updateError } = await supabase
            .from('van_live_inventory')
            .update({
              returned_quantity: newReturnedQty,
              current_stock: newCurrentStock,
              last_updated_at: new Date().toISOString()
            })
            .eq('id', inventoryData.id);

          if (updateError) {
            console.error('Error updating inventory:', updateError);
          }
        } else {
          // Create new inventory record with return
          const { error: insertError } = await supabase
            .from('van_live_inventory')
            .insert({
              van_id: selectedVan,
              product_id: item.productId,
              variant_id: item.variantId || null,
              date: dateStr,
              morning_stock: 0,
              sold_quantity: 0,
              returned_quantity: item.returnQuantity,
              current_stock: item.returnQuantity,
              pending_quantity: 0
            });

          if (insertError) {
            console.error('Error inserting inventory:', insertError);
          }
        }
      }

      toast.success(`Return GRN ${grnNumber} created successfully`);
      
      // Reset form
      setReturnItems([]);
      setSelectedProduct('');
      setReturnQuantity(0);
      setReturnReason('');
      
      onComplete();
    } catch (error: any) {
      console.error('Error saving returns:', error);
      toast.error('Failed to save returns: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getProductOptions = () => {
    const options: Array<{ value: string; label: string; sku?: string; price: number }> = [];
    
    products.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          options.push({
            value: `${product.id}_variant_${variant.id}`,
            label: `${product.name} - ${variant.variant_name}`,
            sku: variant.sku,
            price: variant.price
          });
        });
      } else {
        options.push({
          value: product.id,
          label: product.name,
          sku: product.sku,
          price: product.rate
        });
      }
    });
    
    return options;
  };

  const getSelectedProductLabel = () => {
    if (!selectedProduct) return 'Select...';
    const option = getProductOptions().find(opt => opt.value === selectedProduct);
    return option ? option.label : 'Select...';
  };

  const getTotalReturns = () => {
    return returnItems.reduce((sum, item) => sum + item.returnQuantity, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading products...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Van Selection */}
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Add Return Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
              <Label>Product</Label>
              <Popover open={productDropdownOpen} onOpenChange={setProductDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productDropdownOpen}
                    className="w-full justify-between"
                  >
                    {getSelectedProductLabel()}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search products..." />
                    <CommandList>
                      <CommandEmpty>No product found.</CommandEmpty>
                      <CommandGroup>
                        {getProductOptions().map(option => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setSelectedProduct(currentValue === selectedProduct ? '' : currentValue);
                              setProductDropdownOpen(false);
                            }}
                            className="flex flex-col items-start py-3"
                          >
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.sku && `SKU: ${option.sku} | `}₹{option.price}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:col-span-1">
              <Label>Return Quantity</Label>
              <Input
                type="number"
                placeholder="0"
                value={returnQuantity || ''}
                onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>

            <div className="md:col-span-1">
              <Label>Reason</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {returnReasons.map(reason => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1 flex items-end">
              <Button onClick={handleAddReturn} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Return
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Added Items List */}
      {returnItems.length > 0 && (
        <>
          <Card className="bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Items: {returnItems.length}</p>
                  <p className="text-sm text-muted-foreground">Total Quantity: {getTotalReturns()}</p>
                </div>
                <Button onClick={handleSaveReturns} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Return GRN'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.variantName && (
                            <p className="text-sm text-muted-foreground">{item.variantName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.returnQuantity} {item.unit}</TableCell>
                      <TableCell>{item.returnReason}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveItem(index)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
