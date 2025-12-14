import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Gift, Package, Search, Check, ChevronsUpDown, Star, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isFocusedProductActive } from "@/utils/focusedProductChecker";

interface Product {
  id: string;
  sku: string;
  name: string;
  category: { name: string } | null;
  rate: number;
  unit: string;
  base_unit?: string;
  conversion_factor?: number;
  closing_stock: number;
  is_active?: boolean;
  is_focused_product?: boolean;
  focused_type?: string | null;
  focused_due_date?: string | null;
  focused_recurring_config?: any;
  focused_territories?: string[] | null;
  schemes?: { 
    name: string; 
    description: string; 
    is_active: boolean;
    scheme_type: string;
    condition_quantity: number;
    discount_percentage: number;
  }[];
  variants?: {
    id: string;
    variant_name: string;
    sku: string;
    price: number;
    stock_quantity: number;
    discount_amount: number;
    discount_percentage: number;
    is_active: boolean;
    is_focused_product?: boolean;
    focused_type?: string | null;
    focused_due_date?: string | null;
    focused_recurring_config?: any;
    focused_territories?: string[] | null;
  }[];
}

interface OrderRow {
  id: string;
  productCode: string;
  product?: Product;
  variant?: any;
  quantity: number;
  closingStock: number;
  unit: string;
  total: number;
}

interface TableOrderFormProps {
  onCartUpdate: (items: any[]) => void;
  products: Product[];
  loading: boolean;
  onReloadProducts?: () => void;
}

export const TableOrderForm = ({ onCartUpdate, products, loading, onReloadProducts }: TableOrderFormProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  
  const [orderRows, setOrderRows] = useState<OrderRow[]>([
    { id: "1", productCode: "", quantity: 0, closingStock: 0, unit: "KG", total: 0 }
  ]);
  
  // Use ref to always have access to the latest orderRows for addToCart
  const orderRowsRef = useRef<OrderRow[]>(orderRows);
  useEffect(() => {
    orderRowsRef.current = orderRows;
  }, [orderRows]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<string>('');
  const [openComboboxes, setOpenComboboxes] = useState<{ [key: string]: boolean }>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Create storage key for table form persistence
  const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
  const validVisitId = visitId && visitId.length > 1 ? visitId : null;
  
  const tableFormStorageKey = validVisitId && validRetailerId 
    ? `table_form:${validVisitId}:${validRetailerId}`
    : validRetailerId 
      ? `table_form:temp:${validRetailerId}`
      : 'table_form:fallback';

  // Helper to get cart storage key
  const getCartStorageKey = () => {
    const validRetailerIdForStorage = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
    const validVisitIdForStorage = visitId && visitId.length > 1 ? visitId : null;
    return validVisitIdForStorage && validRetailerIdForStorage 
      ? `order_cart:${validVisitIdForStorage}:${validRetailerIdForStorage}`
      : validRetailerIdForStorage 
        ? `order_cart:temp:${validRetailerIdForStorage}`
        : 'order_cart:fallback';
  };

  // Helper to sync current rows to cart storage
  const syncRowsToCart = (rows: OrderRow[]) => {
    const productRows = rows.filter(row => row.product && row.quantity > 0);
    const cartItems = productRows.map(row => {
      const displayName = row.variant ? row.variant.variant_name : row.product!.name;
      const stock = row.variant ? row.variant.stock_quantity : row.product!.closing_stock;
      const itemId = row.variant ? `${row.product!.id}_variant_${row.variant.id}` : row.product!.id;
      const selectedUnit = row.unit || 'KG';
      const ratePerSelectedUnit = getPricePerUnit(row.product!, row.variant, selectedUnit);
      
      return {
        id: itemId,
        name: displayName || 'Unknown Product',
        category: row.product!.category?.name || 'Uncategorized',
        rate: ratePerSelectedUnit,
        unit: selectedUnit,
        base_unit: selectedUnit,
        quantity: Number(row.quantity) || 0,
        total: Number(row.total) || 0,
        closingStock: Number(stock) || 0,
        schemes: row.product!.schemes || []
      };
    });
    
    onCartUpdate(cartItems);
    localStorage.setItem(getCartStorageKey(), JSON.stringify(cartItems));
    console.log('[syncRowsToCart] Synced to cart:', cartItems.length, 'items');
  };

  // Load saved table form data when component mounts AND re-link products from live array
  useEffect(() => {
    if (products.length === 0) return; // Wait for products to load
    
    const savedData = localStorage.getItem(tableFormStorageKey);
    if (savedData) {
      try {
        const parsedData: OrderRow[] = JSON.parse(savedData);
        console.log('Loading saved table form data:', parsedData);
        
        // Re-link products from live products array to avoid stale data
        const relinkedRows = parsedData.map(row => {
          if (row.product && row.product.id) {
            const liveProduct = products.find(p => p.id === row.product!.id);
            if (liveProduct) {
              let liveVariant = undefined;
              if (row.variant && row.variant.id) {
                liveVariant = liveProduct.variants?.find(v => v.id === row.variant.id);
              }
              return {
                ...row,
                product: liveProduct,
                variant: liveVariant
              };
            }
          }
          return row;
        });
        
        setOrderRows(relinkedRows);
        // Immediately sync to cart storage after loading
        syncRowsToCart(relinkedRows);
      } catch (error) {
        console.error('Error loading saved table form data:', error);
      }
    }
  }, [tableFormStorageKey, products.length]); // Re-run when products load

  // Save table form data whenever orderRows change
  useEffect(() => {
    if (orderRows.length > 0) {
      console.log('Saving table form data:', orderRows);
      localStorage.setItem(tableFormStorageKey, JSON.stringify(orderRows));
    }
  }, [orderRows, tableFormStorageKey]);

  const findProductByCode = (code: string): { product: Product; variant?: any } | undefined => {
    // First check base products
    const baseProduct = products.find(p => p.sku.toLowerCase() === code.toLowerCase());
    if (baseProduct) {
      return { product: baseProduct };
    }
    
    // Then check variants
    for (const product of products) {
      if (product.variants) {
        const variant = product.variants.find(v => v.sku.toLowerCase() === code.toLowerCase() && v.is_active);
        if (variant) {
          return { product, variant };
        }
      }
    }
    
    return undefined;
  };

  // Create flattened list of products and variants for combobox
  // FOLLOWS ESTABLISHED PRODUCT DISPLAY STANDARD:
  // - Base products: Always included (even if they have variants)
  // - Variants: Display ONLY variant_name (not "base_product - variant_name")
  // - Active filtering: is_active !== false (treats null/undefined as active)
  const getProductOptions = () => {
    const options: Array<{ value: string; label: string; product: Product; variant?: any; sku: string; price: number; type: 'product' | 'variant' }> = [];
    
    // Filter only active products (driven directly by Product Master)
    const activeProducts = products.filter(p => p.is_active !== false);
    
    activeProducts.forEach(product => {
      // Always add base product as a selectable option (even if it has variants)
      options.push({
        value: product.id,
        label: `${product.name} | ₹${product.rate}`,
        product: product,
        sku: product.sku,
        price: product.rate,
        type: 'product'
      });
      
      // Add active variants; display only variant name (no base name prefix)
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach(variant => {
          if (variant.is_active) {
            const displayLabel = `${variant.variant_name} | ₹${variant.price}`;
            
            options.push({
              value: `${product.id}_variant_${variant.id}`,
              label: displayLabel,
              product: product,
              variant: variant,
              sku: variant.sku,
              price: variant.price,
              type: 'variant'
            });
          }
        });
      }
    });
    
    return options;
  };

  // Unit conversion helpers - unified across UI and totals
  const normalizeUnit = (u?: string) => (u || "").toLowerCase().replace(/\./g, "").trim();
  const getPricePerUnit = (prod: Product, variant?: any, unit?: string) => {
    const baseRate = Number(variant ? variant.price : prod.rate) || 0;
    const baseUnit = normalizeUnit(prod.base_unit || prod.unit);
    const targetUnit = normalizeUnit(unit || prod.unit);

    if (!baseUnit) return baseRate;

    // KG ↔ Gram conversions
    if (baseUnit === "kg" || baseUnit === "kilogram" || baseUnit === "kilograms") {
      if (["gram", "grams", "g", "gm"].includes(targetUnit)) return baseRate / 1000;
      if (targetUnit === "kg") return baseRate;
    } else if (["g", "gm", "gram", "grams"].includes(baseUnit)) {
      if (targetUnit === "kg") return baseRate * 1000;
      if (["g", "gm", "gram", "grams"].includes(targetUnit)) return baseRate;
    }

    // Piece-based or other units: keep as-is (optional conversion_factor can be added later)
    return baseRate;
  };

  const handleProductSelect = (rowId: string, value: string) => {
    const option = getProductOptions().find(opt => opt.value === value);
    if (option) {
      setOrderRows(prev => prev.map(row => {
        if (row.id === rowId) {
          // Always default to KG when product is selected
          return {
            ...row,
            productCode: option.sku,
            product: option.product,
            variant: option.variant,
            unit: 'KG',
            total: 0
          };
        }
        return row;
      }));
      
      // Close the combobox
      setOpenComboboxes(prev => ({ ...prev, [rowId]: false }));
    }
  };

  const addNewRow = () => {
    const newRow: OrderRow = {
      id: Date.now().toString(),
      productCode: "",
      quantity: 0,
      closingStock: 0,
      unit: "KG",
      total: 0,
    };
    setOrderRows([...orderRows, newRow]);
  };

  const removeRow = (id: string) => {
    setOrderRows(prev => {
      const updatedRows = prev.filter(row => row.id !== id);
      // Use helper to sync cart immediately
      syncRowsToCart(updatedRows);
      console.log('[removeRow] Cart synced after deletion');
      return updatedRows;
    });
  };

  const updateRow = (id: string, field: keyof OrderRow, value: any) => {
    const computeTotal = (prod?: Product, variant?: any, qty?: number, selectedUnit?: string) => {
      if (!prod || !qty) return 0;

      // Price per selected unit using shared helper
      let price = getPricePerUnit(prod, variant, selectedUnit);

      // Apply variant discount if applicable
      if (variant) {
        if (Number(variant.discount_percentage) > 0) {
          price = price - (price * Number(variant.discount_percentage) / 100);
        } else if (Number(variant.discount_amount) > 0) {
          price = price - Number(variant.discount_amount);
        }
      }

      const base = Number(price) * Number(qty);
      const active = prod.schemes?.find(s => s.is_active);
      if (active && active.condition_quantity && active.discount_percentage && qty >= active.condition_quantity) {
        const discountedTotal = base - (base * (Number(active.discount_percentage) / 100));
        return parseFloat(discountedTotal.toFixed(2));
      }
      return parseFloat(base.toFixed(2));
    };

    setOrderRows(prev => {
      const updatedRows = prev.map(row => {
        if (row.id === id) {
          const updatedRow: OrderRow = { ...row, [field]: value } as OrderRow;
          if (field === "productCode") {
            const result = findProductByCode(value);
            if (result) {
              updatedRow.product = result.product;
              updatedRow.variant = result.variant;
              updatedRow.unit = 'KG'; // Always default to KG when product selected
              updatedRow.closingStock = result.variant ? result.variant.stock_quantity : result.product.closing_stock;
              updatedRow.total = computeTotal(result.product, result.variant, updatedRow.quantity, updatedRow.unit);
            } else {
              updatedRow.product = undefined;
              updatedRow.variant = undefined;
              updatedRow.closingStock = 0;
              updatedRow.total = 0;
            }
          } else if (field === "quantity") {
            // Use row.unit (current unit) since quantity is being updated
            updatedRow.total = computeTotal(row.product, row.variant, value, row.unit);
          } else if (field === "unit") {
            // When unit changes, use the NEW unit value and CURRENT quantity from row
            updatedRow.total = computeTotal(row.product, row.variant, row.quantity, value);
          }
          return updatedRow;
        }
        return row;
      });
      
      // Use helper to sync cart immediately
      syncRowsToCart(updatedRows);
      return updatedRows;
    });
  };

  const addToCart = () => {
    if (isAddingToCart) return;
    
    // ALWAYS use the React state directly (orderRowsRef) as single source of truth
    const currentRows = orderRowsRef.current;
    
    console.log('[addToCart] Using state rows:', currentRows.map(r => ({ 
      unit: r.unit, 
      qty: r.quantity, 
      product: r.product?.name,
      rate: r.product?.rate,
      variantPrice: r.variant?.price
    })));
    
    const validRows = currentRows.filter(row => row.product && row.quantity > 0);
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Items",
        description: "Please add valid products with quantities",
        variant: "destructive"
      });
      return;
    }

    setIsAddingToCart(true);

    try {
      // Use syncRowsToCart to ensure consistency
      syncRowsToCart(currentRows);
      
      console.log('[addToCart] Cart synced, navigating to cart page');
      
      // Navigate to cart with current parameters
      const params = new URLSearchParams(searchParams);
      navigate(`/cart?${params.toString()}`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add items to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const getTotalValue = () => {
    return parseFloat(orderRows.reduce((sum, row) => sum + row.total, 0).toFixed(2));
  };

  const hasActiveSchemes = (product: Product) => {
    return product.schemes && product.schemes.some(scheme => scheme.is_active);
  };

  const getActiveSchemeDetails = (product: Product) => {
    const activeSchemes = product.schemes?.filter(scheme => scheme.is_active);
    if (!activeSchemes || activeSchemes.length === 0) return null;
    
    const scheme = activeSchemes[0];
    return `Buy ${scheme.condition_quantity}+ ${product.unit}s, get ${scheme.discount_percentage}% off`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2">Loading products...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="text-muted-foreground mb-4">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No products available</p>
          <p className="text-sm">Please contact admin to add products to the system</p>
        </div>
        <Button onClick={() => onReloadProducts?.()} variant="outline">
          Retry Loading Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="w-full">
            {/* Table Header - Responsive */}
            <div className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 bg-muted/50 border-b border-border">
              <div className="font-semibold text-xs md:text-sm">Product</div>
              <div className="font-semibold text-xs md:text-sm">Unit</div>
              <div className="font-semibold text-xs md:text-sm text-center">Qty</div>
              <div className="font-semibold text-xs md:text-sm text-center">Stock</div>
              <div className="w-8"></div>
            </div>
              
              {/* Table Rows - Responsive */}
              <div className="divide-y divide-border">
                {orderRows.map((row, index) => (
                  <div 
                  key={row.id} 
                  className={cn(
                    "grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_auto] md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 items-center",
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                >
                    {/* Product Column */}
                    <div>
                      <Popover 
                        open={openComboboxes[row.id]} 
                        onOpenChange={(open) => setOpenComboboxes(prev => ({ ...prev, [row.id]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openComboboxes[row.id]}
                            className="w-full justify-start h-auto min-h-[44px] md:min-h-[52px] text-xs md:text-sm font-normal bg-background px-3 py-2"
                          >
                            {row.product ? (
                              <div className="flex flex-col items-start w-full gap-2">
                                <div className="flex items-center gap-1.5 w-full">
                                  {(row.variant ? isFocusedProductActive(row.variant) : isFocusedProductActive(row.product)) && (
                                    <Star size={14} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                  )}
                                  {hasActiveSchemes(row.product) && (
                                    <Sparkles size={14} className="fill-orange-500 text-orange-500 flex-shrink-0" />
                                  )}
                                  <span className="truncate text-left flex-1 font-medium text-foreground">
                                    {row.variant ? (() => {
                                      let variantDisplayName = row.variant.variant_name;
                                      if (variantDisplayName.toLowerCase().startsWith(row.product.name.toLowerCase())) {
                                        variantDisplayName = variantDisplayName.substring(row.product.name.length).trim();
                                        variantDisplayName = variantDisplayName.replace(/^[-\s]+/, '');
                                      }
                                      return variantDisplayName || row.variant.variant_name;
                                    })() : row.product.name}
                                  </span>
                                </div>
                                {row.product.base_unit ? (() => {
                                  const pricePerUnit = getPricePerUnit(row.product!, row.variant, row.unit);
                                  const baseUnit = (row.product!.base_unit || row.product!.unit || '').toLowerCase();
                                  const selectedUnit = (row.unit || row.product!.unit || '').toLowerCase();
                                  const showBase = baseUnit && selectedUnit && baseUnit !== selectedUnit;
                                  return (
                                    <div className="flex flex-col gap-0.5 w-full">
                                      <span className="text-[10px] md:text-xs text-muted-foreground">
                                        ₹{pricePerUnit.toFixed(2)} per {row.unit}
                                      </span>
                                      {showBase && (
                                        <span className="text-[9px] md:text-[10px] text-muted-foreground/70">
                                          (₹{Number(row.variant?.price || row.product!.rate).toFixed(2)} per {row.product!.base_unit})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })() : (
                                  <span className="text-[10px] md:text-xs text-muted-foreground">
                                    ₹{Number(row.variant?.price || row.product.rate || 0).toFixed(2)} per {row.unit || row.product?.unit}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs md:text-sm">Select...</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] md:w-[320px] p-0 bg-background z-50" align="start">
                          <Command className="bg-background">
                            <CommandInput placeholder="Search products..." className="h-9 md:h-10 text-xs md:text-sm" />
                            <CommandList className="bg-background max-h-[250px] md:max-h-[300px]">
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup className="bg-background">
                                {getProductOptions().map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => handleProductSelect(row.id, option.value)}
                                    className="text-xs md:text-sm bg-background hover:bg-accent py-2"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3 w-3 md:h-4 md:w-4",
                                        row.product?.id === option.product.id && 
                                        (!row.variant && !option.variant || row.variant?.id === option.variant?.id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1 flex items-center gap-1.5">
                                      {(option.variant ? isFocusedProductActive(option.variant) : isFocusedProductActive(option.product)) && (
                                        <Star size={12} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                      )}
                                      {hasActiveSchemes(option.product) && (
                                        <Sparkles size={12} className="fill-orange-500 text-orange-500 flex-shrink-0" />
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-[10px] md:text-xs text-muted-foreground">
                                          SKU: {option.sku} | ₹{option.variant ? option.variant.price : option.product.rate}
                                        </div>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Unit Column */}
                    <div>
                      <Select
                        value={row.unit}
                        onValueChange={(value) => updateRow(row.id, "unit", value)}
                      >
                        <SelectTrigger className="h-9 md:h-11 text-xs md:text-sm w-full bg-background px-2 [&>svg]:hidden">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="KG" className="text-xs md:text-sm">KG</SelectItem>
                          <SelectItem value="Grams" className="text-xs md:text-sm">Grams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Qty Column */}
                    <div>
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.quantity || ""}
                        onChange={(e) => updateRow(row.id, "quantity", parseInt(e.target.value) || 0)}
                        className="h-9 md:h-11 text-xs md:text-sm text-center bg-background px-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                        disabled={!row.product}
                      />
                    </div>
                    
                    {/* Stock Column */}
                    <div>
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.closingStock === 0 ? "" : row.closingStock}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateRow(row.id, "closingStock", value === "" ? 0 : parseInt(value) || 0);
                        }}
                        className={cn(
                          "h-9 md:h-11 text-xs md:text-sm text-center bg-background px-1",
                          row.closingStock === 0 && "text-muted-foreground"
                        )}
                        disabled={!row.product}
                      />
                    </div>
                    
                    {/* Delete Button */}
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={orderRows.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
              ))}
              </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={addNewRow}
          className="flex items-center gap-2"
        >
          <Plus size={14} />
          Add Row
        </Button>
        
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-lg font-bold">₹{getTotalValue().toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            (incl. GST: ₹{(getTotalValue() * 1.05).toLocaleString('en-IN', { maximumFractionDigits: 2 })})
          </p>
        </div>
      </div>

      <Button
        onClick={addToCart}
        className="w-full"
        disabled={getTotalValue() === 0 || isAddingToCart}
      >
        {isAddingToCart ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          "Preview Order"
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border">
        <strong>Note:</strong> All base prices are stored per KG. Rates auto-adjust when selling in grams or other units.
      </p>
    </div>
  );
};
