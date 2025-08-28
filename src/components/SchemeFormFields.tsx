import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Calendar, Package, Percent, DollarSign, Gift, Users, Clock, Star, Tag } from 'lucide-react';

interface SchemeFormFieldsProps {
  schemeForm: any;
  setSchemeForm: (form: any) => void;
  products: any[];
  categories: any[];
}

export const SchemeFormFields = ({ schemeForm, setSchemeForm, products, categories }: SchemeFormFieldsProps) => {
  
  const getSchemeTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage_discount': return <Percent size={16} />;
      case 'flat_discount': return <DollarSign size={16} />;
      case 'buy_x_get_y_free': return <Gift size={16} />;
      case 'bundle_combo': return <Package size={16} />;
      case 'tiered_discount': return <Users size={16} />;
      case 'time_based_offer': return <Clock size={16} />;
      case 'first_order_discount': return <Star size={16} />;
      case 'category_wide_discount': return <Tag size={16} />;
      default: return <Percent size={16} />;
    }
  };

  const addTier = () => {
    setSchemeForm({
      ...schemeForm,
      tier_data: [...schemeForm.tier_data, { min_qty: 0, max_qty: 0, discount_percentage: 0 }]
    });
  };

  const removeTier = (index: number) => {
    setSchemeForm({
      ...schemeForm,
      tier_data: schemeForm.tier_data.filter((_: any, i: number) => i !== index)
    });
  };

  const updateTier = (index: number, field: string, value: number) => {
    const updatedTiers = [...schemeForm.tier_data];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    setSchemeForm({ ...schemeForm, tier_data: updatedTiers });
  };

  const toggleBundleProduct = (productId: string) => {
    const currentIds = schemeForm.bundle_product_ids || [];
    const isSelected = currentIds.includes(productId);
    
    setSchemeForm({
      ...schemeForm,
      bundle_product_ids: isSelected 
        ? currentIds.filter((id: string) => id !== productId)
        : [...currentIds, productId]
    });
  };

  const renderSchemeTypeFields = () => {
    switch (schemeForm.scheme_type) {
      case 'percentage_discount':
        return (
          <>
            <div>
              <Label htmlFor="conditionQty">Quantity Threshold</Label>
              <Input
                id="conditionQty"
                type="number"
                value={schemeForm.condition_quantity}
                onChange={(e) => setSchemeForm({ ...schemeForm, condition_quantity: parseInt(e.target.value) || 0 })}
                placeholder="Minimum quantity required"
              />
            </div>
            <div>
              <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
              <Input
                id="discountPercentage"
                type="number"
                value={schemeForm.discount_percentage}
                onChange={(e) => setSchemeForm({ ...schemeForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                placeholder="Discount percentage"
                max="100"
              />
            </div>
          </>
        );

      case 'flat_discount':
        return (
          <>
            <div>
              <Label htmlFor="conditionQty">Quantity Threshold</Label>
              <Input
                id="conditionQty"
                type="number"
                value={schemeForm.condition_quantity}
                onChange={(e) => setSchemeForm({ ...schemeForm, condition_quantity: parseInt(e.target.value) || 0 })}
                placeholder="Minimum quantity required"
              />
            </div>
            <div>
              <Label htmlFor="discountAmount">Discount Amount (₹)</Label>
              <Input
                id="discountAmount"
                type="number"
                value={schemeForm.discount_amount}
                onChange={(e) => setSchemeForm({ ...schemeForm, discount_amount: parseFloat(e.target.value) || 0 })}
                placeholder="Fixed discount amount"
              />
            </div>
          </>
        );

      case 'buy_x_get_y_free':
        return (
          <>
            <div>
              <Label htmlFor="buyQuantity">Buy Quantity (X)</Label>
              <Input
                id="buyQuantity"
                type="number"
                value={schemeForm.buy_quantity}
                onChange={(e) => setSchemeForm({ ...schemeForm, buy_quantity: parseInt(e.target.value) || 0 })}
                placeholder="Quantity to purchase"
              />
            </div>
            <div>
              <Label htmlFor="freeProduct">Free Product (Y)</Label>
              <Select
                value={schemeForm.free_product_id}
                onValueChange={(value) => setSchemeForm({ ...schemeForm, free_product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select free product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">Same Product (Free)</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="freeQuantity">Free Quantity</Label>
              <Input
                id="freeQuantity"
                type="number"
                value={schemeForm.free_quantity}
                onChange={(e) => setSchemeForm({ ...schemeForm, free_quantity: parseInt(e.target.value) || 0 })}
                placeholder="Free quantity"
              />
            </div>
          </>
        );

      case 'bundle_combo':
        return (
          <>
            <div>
              <Label>Bundle Products (Select multiple)</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={(schemeForm.bundle_product_ids || []).includes(product.id)}
                      onCheckedChange={() => toggleBundleProduct(product.id)}
                    />
                    <span className="text-sm">{product.name} ({product.sku})</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bundleDiscountPercentage">Bundle Discount (%)</Label>
                <Input
                  id="bundleDiscountPercentage"
                  type="number"
                  value={schemeForm.bundle_discount_percentage}
                  onChange={(e) => setSchemeForm({ ...schemeForm, bundle_discount_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="Bundle discount %"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="bundleDiscountAmount">Or Fixed Amount (₹)</Label>
                <Input
                  id="bundleDiscountAmount"
                  type="number"
                  value={schemeForm.bundle_discount_amount}
                  onChange={(e) => setSchemeForm({ ...schemeForm, bundle_discount_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Fixed discount amount"
                />
              </div>
            </div>
          </>
        );

      case 'tiered_discount':
        return (
          <>
            <div>
              <Label>Discount Tiers</Label>
              <div className="space-y-2">
                {schemeForm.tier_data.map((tier: any, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Input
                      type="number"
                      placeholder="Min Qty"
                      value={tier.min_qty}
                      onChange={(e) => updateTier(index, 'min_qty', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm">to</span>
                    <Input
                      type="number"
                      placeholder="Max Qty"
                      value={tier.max_qty}
                      onChange={(e) => updateTier(index, 'max_qty', parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <Input
                      type="number"
                      placeholder="Discount %"
                      value={tier.discount_percentage}
                      onChange={(e) => updateTier(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                      className="w-28"
                      max="100"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeTier(index)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTier}>
                  <Plus size={14} className="mr-1" />
                  Add Tier
                </Button>
              </div>
            </div>
          </>
        );

      case 'time_based_offer':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  value={schemeForm.discount_percentage}
                  onChange={(e) => setSchemeForm({ ...schemeForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="Discount percentage"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="validityDays">Validity (Days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  value={schemeForm.validity_days || ''}
                  onChange={(e) => setSchemeForm({ ...schemeForm, validity_days: parseInt(e.target.value) || null })}
                  placeholder="Valid for days"
                />
              </div>
            </div>
          </>
        );

      case 'first_order_discount':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  value={schemeForm.discount_percentage}
                  onChange={(e) => setSchemeForm({ ...schemeForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="First order discount"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="validityDays">Validity (Days)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  value={schemeForm.validity_days || ''}
                  onChange={(e) => setSchemeForm({ ...schemeForm, validity_days: parseInt(e.target.value) || null })}
                  placeholder="Valid for days"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="firstOrderOnly"
                checked={schemeForm.is_first_order_only}
                onCheckedChange={(checked) => setSchemeForm({ ...schemeForm, is_first_order_only: checked })}
              />
              <Label htmlFor="firstOrderOnly">Apply only for first orders</Label>
            </div>
          </>
        );

      case 'category_wide_discount':
        return (
          <>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={schemeForm.category_id}
                onValueChange={(value) => setSchemeForm({ ...schemeForm, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  value={schemeForm.discount_percentage}
                  onChange={(e) => setSchemeForm({ ...schemeForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="Category discount %"
                  max="100"
                />
              </div>
              <div>
                <Label htmlFor="minOrderValue">Minimum Order Value (₹)</Label>
                <Input
                  id="minOrderValue"
                  type="number"
                  value={schemeForm.min_order_value}
                  onChange={(e) => setSchemeForm({ ...schemeForm, min_order_value: parseFloat(e.target.value) || 0 })}
                  placeholder="Minimum order amount"
                />
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <div>
        <Label htmlFor="schemeName">Scheme Name</Label>
        <Input
          id="schemeName"
          value={schemeForm.name}
          onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
          placeholder="Enter scheme name"
        />
      </div>

      <div>
        <Label htmlFor="schemeDescription">Description</Label>
        <Textarea
          id="schemeDescription"
          value={schemeForm.description}
          onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
          placeholder="Enter scheme description"
        />
      </div>

      {/* Scheme Type Selection */}
      <div>
        <Label htmlFor="schemeType">Scheme Type</Label>
        <Select
          value={schemeForm.scheme_type}
          onValueChange={(value) => 
            setSchemeForm({ 
              ...schemeForm, 
              scheme_type: value,
              // Reset relevant fields when changing type
              condition_quantity: 0,
              discount_percentage: 0,
              discount_amount: 0,
              free_quantity: 0,
              buy_quantity: 0,
              free_product_id: '',
              bundle_product_ids: [],
              tier_data: [],
              category_id: '',
              is_first_order_only: false
            })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage_discount">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('percentage_discount')}
                Percentage Discount
              </div>
            </SelectItem>
            <SelectItem value="flat_discount">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('flat_discount')}
                Flat Discount (Amount Off)
              </div>
            </SelectItem>
            <SelectItem value="buy_x_get_y_free">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('buy_x_get_y_free')}
                Buy X Get Y Free (BOGO)
              </div>
            </SelectItem>
            <SelectItem value="bundle_combo">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('bundle_combo')}
                Bundle / Combo Discount
              </div>
            </SelectItem>
            <SelectItem value="tiered_discount">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('tiered_discount')}
                Tiered Discount
              </div>
            </SelectItem>
            <SelectItem value="time_based_offer">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('time_based_offer')}
                Time-Based Offer
              </div>
            </SelectItem>
            <SelectItem value="first_order_discount">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('first_order_discount')}
                First Order Discount
              </div>
            </SelectItem>
            <SelectItem value="category_wide_discount">
              <div className="flex items-center gap-2">
                {getSchemeTypeIcon('category_wide_discount')}
                Category-Wide Discount
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Target Selection - Only for product-specific schemes */}
      {!['category_wide_discount', 'bundle_combo'].includes(schemeForm.scheme_type) && (
        <div>
          <Label htmlFor="product">Target Product</Label>
          <Select
            value={schemeForm.product_id}
            onValueChange={(value) => setSchemeForm({ ...schemeForm, product_id: value, variant_id: 'all' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dynamic Fields Based on Scheme Type */}
      {renderSchemeTypeFields()}

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={schemeForm.start_date}
            onChange={(e) => setSchemeForm({ ...schemeForm, start_date: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={schemeForm.end_date}
            onChange={(e) => setSchemeForm({ ...schemeForm, end_date: e.target.value })}
          />
        </div>
      </div>

      {/* Active Status */}
      <div className="flex items-center space-x-2">
        <Switch
          id="schemeActive"
          checked={schemeForm.is_active}
          onCheckedChange={(checked) => setSchemeForm({ ...schemeForm, is_active: checked })}
        />
        <Label htmlFor="schemeActive">Active</Label>
      </div>
    </div>
  );
};