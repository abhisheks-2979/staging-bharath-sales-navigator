import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Check, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

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
  const [returnItems, setReturnItems] = useState<{[key: string]: ReturnItem}>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVan, setSelectedVan] = useState<string>('');
  const [vans, setVans] = useState<any[]>([]);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

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

  const handleReturnQuantityChange = (productId: string, variantId: string | undefined, quantity: number) => {
    const key = variantId ? `${productId}_variant_${variantId}` : productId;
    const product = products.find(p => p.id === productId);
    
    if (!product) return;

    const variant = variantId ? product.variants?.find(v => v.id === variantId) : undefined;

    setReturnItems(prev => ({
      ...prev,
      [key]: {
        productId,
        variantId,
        productName: product.name,
        variantName: variant?.variant_name,
        unit: product.unit,
        returnQuantity: quantity,
        returnReason: prev[key]?.returnReason || ''
      }
    }));
  };

  const handleReasonChange = (productId: string, variantId: string | undefined, reason: string) => {
    const key = variantId ? `${productId}_variant_${variantId}` : productId;
    
    setReturnItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        returnReason: reason
      }
    }));
  };

  const handleAddReturn = (productId: string, variantId?: string) => {
    const key = variantId ? `${productId}_variant_${variantId}` : productId;
    const item = returnItems[key];

    if (!item || item.returnQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!item.returnReason) {
      toast.error('Please select a return reason');
      return;
    }

    setAddedItems(prev => new Set(prev).add(key));
    toast.success(`Added ${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`);
  };

  const handleSaveReturns = async () => {
    if (!selectedVan) {
      toast.error('Please select a van');
      return;
    }

    const itemsToSave = Array.from(addedItems)
      .map(key => returnItems[key])
      .filter(item => item && item.returnQuantity > 0 && item.returnReason);

    if (itemsToSave.length === 0) {
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
      const returnGRNItems = itemsToSave.map(item => ({
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
      for (const item of itemsToSave) {
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
      setReturnItems({});
      setAddedItems(new Set());
      
      onComplete();
    } catch (error: any) {
      console.error('Error saving returns:', error);
      toast.error('Failed to save returns: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.variants?.some(v => 
      v.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getTotalReturns = () => {
    return Array.from(addedItems)
      .reduce((sum, key) => sum + (returnItems[key]?.returnQuantity || 0), 0);
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

      {/* Summary */}
      {addedItems.size > 0 && (
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Items: {addedItems.size}</p>
                <p className="text-sm text-muted-foreground">Total Quantity: {getTotalReturns()}</p>
              </div>
              <Button onClick={handleSaveReturns} disabled={saving}>
                {saving ? 'Saving...' : 'Save Return GRN'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Input
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Products List */}
      <div className="space-y-3">
        {filteredProducts.map(product => (
          <Card key={product.id}>
            <CardContent className="p-4 space-y-3">
              <div>
                <h4 className="font-medium">{product.name}</h4>
                <p className="text-sm text-muted-foreground">Rate: ₹{product.rate} / {product.unit}</p>
              </div>

              {/* Base Product Return */}
              {(!product.variants || product.variants.length === 0) && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Return Quantity</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={returnItems[product.id]?.returnQuantity || ''}
                        onChange={(e) => handleReturnQuantityChange(product.id, undefined, parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Reason</Label>
                      <Select
                        value={returnItems[product.id]?.returnReason || ''}
                        onValueChange={(value) => handleReasonChange(product.id, undefined, value)}
                      >
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
                  </div>
                  <Button
                    size="sm"
                    variant={addedItems.has(product.id) ? "secondary" : "default"}
                    onClick={() => handleAddReturn(product.id)}
                    disabled={addedItems.has(product.id)}
                    className="w-full"
                  >
                    {addedItems.has(product.id) ? (
                      <><Check className="h-4 w-4 mr-1" />Added</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-1" />Add Return</>
                    )}
                  </Button>
                </div>
              )}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  {product.variants.map(variant => {
                    const variantKey = `${product.id}_variant_${variant.id}`;
                    return (
                      <div key={variant.id} className="border-t pt-2 space-y-2">
                        <p className="text-sm font-medium">{variant.variant_name}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Return Quantity</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={returnItems[variantKey]?.returnQuantity || ''}
                              onChange={(e) => handleReturnQuantityChange(product.id, variant.id, parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reason</Label>
                            <Select
                              value={returnItems[variantKey]?.returnReason || ''}
                              onValueChange={(value) => handleReasonChange(product.id, variant.id, value)}
                            >
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
                        </div>
                        <Button
                          size="sm"
                          variant={addedItems.has(variantKey) ? "secondary" : "default"}
                          onClick={() => handleAddReturn(product.id, variant.id)}
                          disabled={addedItems.has(variantKey)}
                          className="w-full"
                        >
                          {addedItems.has(variantKey) ? (
                            <><Check className="h-4 w-4 mr-1" />Added</>
                          ) : (
                            <><Plus className="h-4 w-4 mr-1" />Add Return</>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
