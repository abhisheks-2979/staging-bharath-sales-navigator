import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { Loader2, Package, Camera, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';

interface Van {
  id: string;
  registration_number: string;
  is_active: boolean;
}

interface Beat {
  id: string;
  beat_name: string;
  beat_id: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  variants?: Array<{
    id: string;
    variant_name: string;
    sku: string;
  }>;
}

interface InwardItem {
  productId: string;
  variantId?: string;
  quantity: number;
  aiScanned: boolean;
  aiConfidence?: number;
  productName?: string;
  variantName?: string;
}

interface VanMorningInventoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
}

export function VanMorningInventory({ open, onOpenChange, selectedDate }: VanMorningInventoryProps) {
  const [loading, setLoading] = useState(false);
  const [vans, setVans] = useState<Van[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedVan, setSelectedVan] = useState('');
  const [selectedBeat, setSelectedBeat] = useState('');
  const [vanDistance, setVanDistance] = useState('');
  const [documentsVerified, setDocumentsVerified] = useState(false);
  const [verifierName, setVerifierName] = useState('');
  const [inwardItems, setInwardItems] = useState<InwardItem[]>([]);
  const [showAIScan, setShowAIScan] = useState(false);

  useEffect(() => {
    if (open) {
      loadVans();
      loadBeats();
      loadProducts();
    }
  }, [open]);

  const loadVans = async () => {
    const { data, error } = await supabase
      .from('vans')
      .select('id, registration_number, is_active')
      .eq('is_active', true)
      .order('registration_number');

    if (error) {
      console.error('Error loading vans:', error);
      toast.error('Failed to load vans');
      return;
    }
    setVans(data || []);
  };

  const loadBeats = async () => {
    const { data, error } = await supabase
      .from('beats')
      .select('id, beat_name, beat_id')
      .eq('is_active', true)
      .order('beat_name');

    if (error) {
      console.error('Error loading beats:', error);
      toast.error('Failed to load beats');
      return;
    }
    setBeats(data || []);
  };

  const loadProducts = async () => {
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, sku')
      .order('name');

    if (productsError) {
      console.error('Error loading products:', productsError);
      toast.error('Failed to load products');
      return;
    }

    const { data: variantsData, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, product_id, variant_name, sku')
      .order('variant_name');

    if (variantsError) {
      console.error('Error loading variants:', variantsError);
    }

    const productsWithVariants = (productsData || []).map(product => ({
      ...product,
      variants: (variantsData || []).filter(v => v.product_id === product.id)
    }));

    setProducts(productsWithVariants);
  };

  const handleAddProduct = () => {
    setInwardItems([...inwardItems, {
      productId: '',
      variantId: undefined,
      quantity: 0,
      aiScanned: false,
      aiConfidence: undefined
    }]);
  };

  const handleRemoveProduct = (index: number) => {
    setInwardItems(inwardItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InwardItem, value: any) => {
    const updated = [...inwardItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      updated[index].productName = product?.name;
      updated[index].variantId = undefined;
      updated[index].variantName = undefined;
    } else if (field === 'variantId') {
      const product = products.find(p => p.id === updated[index].productId);
      const variant = product?.variants?.find(v => v.id === value);
      updated[index].variantName = variant?.variant_name;
    }
    
    setInwardItems(updated);
  };

  const handleSaveInwardGRN = async () => {
    if (!selectedVan) {
      toast.error('Please select a van');
      return;
    }

    if (!selectedBeat) {
      toast.error('Please select a beat');
      return;
    }

    if (inwardItems.length === 0 || inwardItems.some(item => !item.productId || item.quantity <= 0)) {
      toast.error('Please add at least one valid product with quantity');
      return;
    }

    if (documentsVerified && !verifierName) {
      toast.error('Please enter verifier name');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const dateStr = selectedDate.toISOString().split('T')[0];
      const grnNumber = `GRN-${selectedVan.substring(0, 8)}-${dateStr}-${Date.now()}`;

      // Create Inward GRN
      const { data: grnData, error: grnError } = await supabase
        .from('van_inward_grn')
        .insert({
          van_id: selectedVan,
          beat_id: selectedBeat,
          user_id: user.id,
          grn_date: dateStr,
          grn_number: grnNumber,
          van_distance_km: parseFloat(vanDistance) || 0,
          documents_verified: documentsVerified,
          verified_by: documentsVerified ? user.id : null,
          verified_by_name: documentsVerified ? verifierName : null,
          verified_at: documentsVerified ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (grnError) throw grnError;

      // Insert GRN items
      const grnItems = inwardItems.map(item => ({
        grn_id: grnData.id,
        product_id: item.productId,
        variant_id: item.variantId || null,
        quantity: item.quantity,
        ai_scanned: item.aiScanned,
        ai_confidence_percent: item.aiConfidence || null
      }));

      const { error: itemsError } = await supabase
        .from('van_inward_grn_items')
        .insert(grnItems);

      if (itemsError) throw itemsError;

      // Update/Create van live inventory
      for (const item of inwardItems) {
        await supabase
          .from('van_live_inventory')
          .upsert({
            van_id: selectedVan,
            product_id: item.productId,
            variant_id: item.variantId || null,
            date: dateStr,
            morning_stock: item.quantity,
            current_stock: item.quantity,
            sold_quantity: 0,
            returned_quantity: 0,
            pending_quantity: 0,
            last_updated_at: new Date().toISOString()
          }, {
            onConflict: 'van_id,product_id,variant_id,date'
          });
      }

      toast.success(`Morning Inventory saved! GRN: ${grnNumber}`);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving inward GRN:', error);
      toast.error(error.message || 'Failed to save morning inventory');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedVan('');
    setSelectedBeat('');
    setVanDistance('');
    setDocumentsVerified(false);
    setVerifierName('');
    setInwardItems([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Morning Inventory (Inward GRN)
          </DialogTitle>
          <DialogDescription>
            Load and verify all products put into the van at the start of the day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Van & Beat Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Van *</Label>
              <Select value={selectedVan} onValueChange={setSelectedVan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose van" />
                </SelectTrigger>
                <SelectContent>
                  {vans.map(van => (
                    <SelectItem key={van.id} value={van.id}>
                      {van.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Beat *</Label>
              <Select value={selectedBeat} onValueChange={setSelectedBeat}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose beat" />
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

          {/* Van Distance */}
          <div className="space-y-2">
            <Label>Van Distance (km)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter distance"
              value={vanDistance}
              onChange={(e) => setVanDistance(e.target.value)}
            />
          </div>

          {/* Document Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Document Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={documentsVerified}
                  onCheckedChange={(checked) => setDocumentsVerified(checked as boolean)}
                />
                <Label>Van documents verified</Label>
              </div>
              {documentsVerified && (
                <div className="space-y-2">
                  <Label>Verified By *</Label>
                  <Input
                    placeholder="Enter verifier name"
                    value={verifierName}
                    onChange={(e) => setVerifierName(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Products to Load</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIScan(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    AI Scan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProduct}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {inwardItems.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.productId);
                return (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-medium">Item #{index + 1}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProduct(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => handleItemChange(index, 'productId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0 && (
                        <div className="space-y-2">
                          <Label>Variant</Label>
                          <Select
                            value={item.variantId || ''}
                            onValueChange={(value) => handleItemChange(index, 'variantId', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select variant" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProduct.variants.map(variant => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.variant_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    {item.aiScanned && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        AI Scanned ({item.aiConfidence?.toFixed(1)}% confidence)
                      </div>
                    )}
                  </div>
                );
              })}

              {inwardItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products added yet. Click "Add Product" or use "AI Scan"
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveInwardGRN} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Inward GRN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}