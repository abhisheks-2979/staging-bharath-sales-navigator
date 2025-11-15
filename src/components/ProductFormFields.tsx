import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, ChevronsUpDown, X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ProductCategory {
  id: string;
  name: string;
}

interface Territory {
  id: string;
  name: string;
  region: string;
}

interface ProductFormData {
  is_active: boolean;
  sku: string;
  product_number: string;
  name: string;
  description: string;
  category_id: string;
  base_unit: string;
  unit: string;
  conversion_factor: number;
  rate: number;
  closing_stock: number;
  barcode: string;
  barcode_image_url?: string;
  qr_code?: string;
  is_focused_product: boolean;
  focused_type?: 'fixed_date' | 'recurring' | 'keep_open';
  focused_due_date: string;
  focused_target_quantity: number;
  focused_territories: string[];
  focused_recurring_config?: {
    days_of_week?: number[];
    weeks_of_month?: number[];
    months_of_year?: number[];
  };
}

interface ProductFormFieldsProps {
  form: ProductFormData;
  categories: ProductCategory[];
  territories: Territory[];
  onFormChange: (updates: Partial<ProductFormData>) => void;
}

export const ProductFormFields: React.FC<ProductFormFieldsProps> = ({
  form,
  categories,
  territories,
  onFormChange
}) => {
  const [territoryComboOpen, setTerritoryComboOpen] = React.useState(false);
  const [uploadingBarcode, setUploadingBarcode] = React.useState(false);

  const handleBarcodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBarcode(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `barcode_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      onFormChange({ barcode_image_url: publicUrl });
    } catch (error) {
      console.error('Error uploading barcode:', error);
    } finally {
      setUploadingBarcode(false);
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const weeksOfMonth = [
    { value: 1, label: 'Week 1' },
    { value: 2, label: 'Week 2' },
    { value: 3, label: 'Week 3' },
    { value: 4, label: 'Week 4' }
  ];

  const monthsOfYear = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  return (
    <>
      {/* Active Status - AT TOP */}
      <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <Checkbox 
          id="is_active" 
          checked={form.is_active}
          onCheckedChange={(checked) => onFormChange({ is_active: checked as boolean })}
        />
        <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
          Active Product
        </Label>
      </div>

      <div>
        <Label htmlFor="sku">SKU *</Label>
        <Input
          id="sku"
          value={form.sku}
          onChange={(e) => onFormChange({ sku: e.target.value })}
          placeholder="Enter SKU"
          required
        />
      </div>

      <div>
        <Label htmlFor="productNumber">Product Number</Label>
        <Input
          id="productNumber"
          value={form.product_number}
          onChange={(e) => onFormChange({ product_number: e.target.value })}
          placeholder="Enter product number"
        />
      </div>

      <div>
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => onFormChange({ name: e.target.value })}
          placeholder="Enter product name"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => onFormChange({ description: e.target.value })}
          placeholder="Enter product description"
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={form.category_id}
          onValueChange={(value) => onFormChange({ category_id: value })}
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
          <Label htmlFor="base_unit">Base Unit</Label>
          <Select
            value={form.base_unit}
            onValueChange={(value) => onFormChange({ base_unit: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">KG</SelectItem>
              <SelectItem value="piece">Piece</SelectItem>
              <SelectItem value="liter">Liter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="unit">Selling Unit</Label>
          <Select
            value={form.unit}
            onValueChange={(value) => {
              let conversionFactor = 1;
              if (form.base_unit === 'kg') {
                if (value === 'grams') conversionFactor = 0.001;
                else if (value === 'kg') conversionFactor = 1;
              }
              onFormChange({ unit: value, conversion_factor: conversionFactor });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="piece">Piece</SelectItem>
              <SelectItem value="kg">KG</SelectItem>
              <SelectItem value="grams">Grams</SelectItem>
              <SelectItem value="liter">Liter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="conversion_factor">Conversion Factor</Label>
        <Input
          id="conversion_factor"
          type="number"
          step="0.001"
          value={form.conversion_factor}
          onChange={(e) => onFormChange({ conversion_factor: parseFloat(e.target.value) || 1 })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          How many base units = 1 selling unit
        </p>
      </div>

      <div>
        <Label htmlFor="rate">Rate per Base Unit (₹)</Label>
        <Input
          id="rate"
          type="number"
          step="0.01"
          value={form.rate}
          onChange={(e) => onFormChange({ rate: parseFloat(e.target.value) || 0 })}
          placeholder="Enter rate"
          required
        />
      </div>

      <div>
        <Label htmlFor="closing_stock">Closing Stock</Label>
        <Input
          id="closing_stock"
          type="number"
          value={form.closing_stock}
          onChange={(e) => onFormChange({ closing_stock: parseInt(e.target.value) || 0 })}
          placeholder="Enter closing stock"
        />
      </div>

      {/* Barcode Upload */}
      <div>
        <Label htmlFor="barcode">Barcode</Label>
        <div className="space-y-2">
          <Input
            id="barcode"
            value={form.barcode}
            onChange={(e) => onFormChange({ barcode: e.target.value })}
            placeholder="Enter barcode text"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingBarcode}
              onClick={() => document.getElementById('barcode-upload')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadingBarcode ? 'Uploading...' : 'Upload Barcode Image'}
            </Button>
            <input
              id="barcode-upload"
              type="file"
              accept="image/*"
              onChange={handleBarcodeUpload}
              className="hidden"
            />
          </div>
          {form.barcode_image_url && (
            <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
              <img 
                src={form.barcode_image_url} 
                alt="Barcode" 
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      {form.qr_code && (
        <div>
          <Label>QR Code (Auto-generated)</Label>
          <div className="w-32 h-32 border rounded-lg p-2">
            <img src={form.qr_code} alt="QR Code" className="w-full h-full" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Scan to view product details
          </p>
        </div>
      )}

      {/* Focused Product Section - AT BOTTOM */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="is_focused" 
            checked={form.is_focused_product}
            onCheckedChange={(checked) => {
              onFormChange({ 
                is_focused_product: checked as boolean,
                focused_type: checked ? 'fixed_date' : undefined 
              });
            }}
          />
          <Label htmlFor="is_focused" className="text-sm font-medium cursor-pointer">
            Focused Product
          </Label>
        </div>
        
        {form.is_focused_product && (
          <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
            {/* Focused Type Selection */}
            <div className="space-y-3">
              <Label className="font-semibold">Focused Product Type *</Label>
              <RadioGroup
                value={form.focused_type || 'fixed_date'}
                onValueChange={(value: 'fixed_date' | 'recurring' | 'keep_open') => 
                  onFormChange({ focused_type: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed_date" id="fixed_date" />
                  <Label htmlFor="fixed_date" className="cursor-pointer font-normal">
                    Fixed Date (One-time with specific end date)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <Label htmlFor="recurring" className="cursor-pointer font-normal">
                    Recurring (Auto-enables on specific days/weeks/months)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep_open" id="keep_open" />
                  <Label htmlFor="keep_open" className="cursor-pointer font-normal">
                    Keep it Open (No end date, target-based only)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Fixed Date Configuration */}
            {form.focused_type === 'fixed_date' && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div>
                  <Label htmlFor="focused_due_date">
                    Due Date * <span className="text-xs text-muted-foreground">(Product will unfocus after this date)</span>
                  </Label>
                  <Input
                    id="focused_due_date"
                    type="date"
                    value={form.focused_due_date}
                    onChange={(e) => onFormChange({ focused_due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}

            {/* Recurring Configuration */}
            {form.focused_type === 'recurring' && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <div>
                  <Label>Days of Week (Select one or more)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {daysOfWeek.map(day => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={form.focused_recurring_config?.days_of_week?.includes(day.value)}
                          onCheckedChange={(checked) => {
                            const current = form.focused_recurring_config?.days_of_week || [];
                            const updated = checked
                              ? [...current, day.value]
                              : current.filter(d => d !== day.value);
                            onFormChange({
                              focused_recurring_config: {
                                ...form.focused_recurring_config,
                                days_of_week: updated
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`day-${day.value}`} className="cursor-pointer text-sm">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Weeks of Month (Select one or more)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {weeksOfMonth.map(week => (
                      <div key={week.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`week-${week.value}`}
                          checked={form.focused_recurring_config?.weeks_of_month?.includes(week.value)}
                          onCheckedChange={(checked) => {
                            const current = form.focused_recurring_config?.weeks_of_month || [];
                            const updated = checked
                              ? [...current, week.value]
                              : current.filter(w => w !== week.value);
                            onFormChange({
                              focused_recurring_config: {
                                ...form.focused_recurring_config,
                                weeks_of_month: updated
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`week-${week.value}`} className="cursor-pointer text-sm">
                          {week.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Months of Year (Select one or more)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {monthsOfYear.map(month => (
                      <div key={month.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`month-${month.value}`}
                          checked={form.focused_recurring_config?.months_of_year?.includes(month.value)}
                          onCheckedChange={(checked) => {
                            const current = form.focused_recurring_config?.months_of_year || [];
                            const updated = checked
                              ? [...current, month.value]
                              : current.filter(m => m !== month.value);
                            onFormChange({
                              focused_recurring_config: {
                                ...form.focused_recurring_config,
                                months_of_year: updated
                              }
                            });
                          }}
                        />
                        <Label htmlFor={`month-${month.value}`} className="cursor-pointer text-sm">
                          {month.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Fields for All Types */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label htmlFor="focused_target_quantity">
                  Target Quantity * <span className="text-xs text-muted-foreground">(Will unfocus when reached)</span>
                </Label>
                <Input
                  id="focused_target_quantity"
                  type="number"
                  value={form.focused_target_quantity}
                  onChange={(e) => onFormChange({ focused_target_quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Enter target quantity"
                  required
                />
              </div>

              {/* Territory Multi-select */}
              <div>
                <Label>Target Territories *</Label>
                <Popover open={territoryComboOpen} onOpenChange={setTerritoryComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={territoryComboOpen}
                      className="w-full justify-between"
                    >
                      {form.focused_territories?.length > 0
                        ? `${form.focused_territories.length} territories selected`
                        : "Select territories..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search territories..." />
                      <CommandList>
                        <CommandEmpty>No territory found.</CommandEmpty>
                        <CommandGroup>
                          {territories.map((territory) => (
                            <CommandItem
                              key={territory.id}
                              onSelect={() => {
                                const currentTerritories = form.focused_territories || [];
                                const isSelected = currentTerritories.includes(territory.id);
                                const updatedTerritories = isSelected
                                  ? currentTerritories.filter(id => id !== territory.id)
                                  : [...currentTerritories, territory.id];
                                onFormChange({ focused_territories: updatedTerritories });
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.focused_territories?.includes(territory.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{territory.name}</span>
                                <span className="text-xs text-muted-foreground">{territory.region}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Selected Territories Display */}
                {form.focused_territories?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.focused_territories.map(territoryId => {
                      const territory = territories.find(t => t.id === territoryId);
                      return territory ? (
                        <Badge key={territoryId} variant="secondary" className="flex items-center gap-1">
                          {territory.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => {
                              const updatedTerritories = form.focused_territories.filter(id => id !== territoryId);
                              onFormChange({ focused_territories: updatedTerritories });
                            }}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
