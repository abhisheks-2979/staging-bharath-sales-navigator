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
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  is_focused_product: boolean;
  focused_due_date: string;
  focused_target_quantity: number;
  focused_territories: string[];
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

      <div>
        <Label htmlFor="barcode">Barcode</Label>
        <Input
          id="barcode"
          value={form.barcode}
          onChange={(e) => onFormChange({ barcode: e.target.value })}
          placeholder="Enter barcode (optional)"
        />
      </div>

      {/* Focused Product Section - AT BOTTOM */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox 
            id="is_focused" 
            checked={form.is_focused_product}
            onCheckedChange={(checked) => onFormChange({ is_focused_product: checked as boolean })}
          />
          <Label htmlFor="is_focused" className="text-sm font-medium cursor-pointer">
            Focused Product
          </Label>
        </div>
        
        {form.is_focused_product && (
          <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
            <div>
              <Label htmlFor="focused_due_date">
                Due Date <span className="text-xs text-muted-foreground">(Focused product until this date)</span>
              </Label>
              <Input
                id="focused_due_date"
                type="date"
                value={form.focused_due_date}
                onChange={(e) => onFormChange({ focused_due_date: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="focused_target_quantity">Target Quantity</Label>
              <Input
                id="focused_target_quantity"
                type="number"
                value={form.focused_target_quantity}
                onChange={(e) => onFormChange({ focused_target_quantity: parseInt(e.target.value) || 0 })}
                placeholder="Target quantity to achieve"
              />
            </div>

            <div>
              <Label>Territories</Label>
              <Popover open={territoryComboOpen} onOpenChange={setTerritoryComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={territoryComboOpen}
                    className="w-full justify-between"
                  >
                    {form.focused_territories.length > 0
                      ? `${form.focused_territories.length} selected`
                      : "Select territories"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search territories..." />
                    <CommandEmpty>No territory found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {territories.map((territory) => (
                          <CommandItem
                            key={territory.id}
                            onSelect={() => {
                              const isSelected = form.focused_territories.includes(territory.id);
                              onFormChange({
                                focused_territories: isSelected
                                  ? form.focused_territories.filter((id) => id !== territory.id)
                                  : [...form.focused_territories, territory.id]
                              });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                form.focused_territories.includes(territory.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {territory.name} ({territory.region})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {form.focused_territories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.focused_territories.map((territoryId) => {
                    const territory = territories.find((t) => t.id === territoryId);
                    if (!territory) return null;
                    return (
                      <Badge key={territoryId} variant="secondary" className="gap-1">
                        {territory.name}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            onFormChange({
                              focused_territories: form.focused_territories.filter((id) => id !== territoryId)
                            });
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
