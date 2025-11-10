import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Gift, Package, Search, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
}

export const TableOrderForm = ({ onCartUpdate }: TableOrderFormProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  
  const [orderRows, setOrderRows] = useState<OrderRow[]>([
    { id: "1", productCode: "", quantity: 0, closingStock: 0, unit: "KG", total: 0 }
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<string>('');
  const [openComboboxes, setOpenComboboxes] = useState<{ [key: string]: boolean }>({});

  // Create storage key for table form persistence
  const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
  const validVisitId = visitId && visitId.length > 1 ? visitId : null;
  
  const tableFormStorageKey = validVisitId && validRetailerId 
    ? `table_form:${validVisitId}:${validRetailerId}`
    : validRetailerId 
      ? `table_form:temp:${validRetailerId}`
      : 'table_form:fallback';

  // Load saved table form data when component mounts
  useEffect(() => {
    const savedData = localStorage.getItem(tableFormStorageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        console.log('Loading saved table form data:', parsedData);
        setOrderRows(parsedData);
      } catch (error) {
        console.error('Error loading saved table form data:', error);
      }
    }
  }, [tableFormStorageKey]);

  // Save table form data whenever orderRows change
  useEffect(() => {
    if (orderRows.length > 0) {
      console.log('Saving table form data:', orderRows);
      localStorage.setItem(tableFormStorageKey, JSON.stringify(orderRows));
    }
  }, [orderRows, tableFormStorageKey]);

  useEffect(() => {
    fetchProducts();
    
    // Set up real-time subscription for product changes
    const channel = supabase
      .channel('product-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.log('Product change detected, refreshing...');
          fetchProducts();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_schemes' },
        () => {
          console.log('Product scheme change detected, refreshing...');
          fetchProducts();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_variants' },
        () => {
          console.log('Product variant change detected, refreshing...');
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      console.log('Fetching products for order entry...');
      
      // Fetch products with better error handling
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          name,
          description,
          rate,
          unit,
          base_unit,
          conversion_factor,
          closing_stock,
          is_active,
          category_id,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .order('name');
      
      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }

      // Fetch schemes separately
      const { data: schemesData, error: schemesError } = await supabase
        .from('product_schemes')
        .select('*')
        .eq('is_active', true);
      
      if (schemesError) {
        console.error('Error fetching schemes:', schemesError);
        // Don't throw, just log the error and continue without schemes
      }

      // Fetch variants separately
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('is_active', true);
      
      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        // Don't throw, just log the error and continue without variants
      }

      // Combine the data
      const enrichedProducts = (productsData || []).map(product => ({
        ...product,
        schemes: (schemesData || []).filter(scheme => scheme.product_id === product.id),
        variants: (variantsData || []).filter(variant => variant.product_id === product.id)
      }));

      console.log('Fetched products:', enrichedProducts.length);
      setProducts(enrichedProducts);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive"
      });
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

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
  const getProductOptions = () => {
    const options: Array<{ value: string; label: string; product: Product; variant?: any; sku: string; type: 'product' | 'variant' }> = [];
    
    products.forEach(product => {
      // Add base product
      options.push({
        value: product.id,
        label: product.name,
        product: product,
        sku: product.sku,
        type: 'product'
      });
      
      // Add variants as separate entries (without base product name)
      if (product.variants) {
        product.variants.forEach(variant => {
          if (variant.is_active) {
            // Extract just the variant part by removing the base product name if it's included
            let variantDisplayName = variant.variant_name;
            // If variant name starts with product name, remove it
            if (variantDisplayName.toLowerCase().startsWith(product.name.toLowerCase())) {
              variantDisplayName = variantDisplayName.substring(product.name.length).trim();
              // Remove leading dash or hyphen if present
              variantDisplayName = variantDisplayName.replace(/^[-\s]+/, '');
            }
            
            options.push({
              value: `${product.id}_variant_${variant.id}`,
              label: variantDisplayName || variant.variant_name, // Show only variant name
              product: product,
              variant: variant,
              sku: variant.sku,
              type: 'variant'
            });
          }
        });
      }
    });
    
    return options;
  };

  const handleProductSelect = (rowId: string, value: string) => {
    const option = getProductOptions().find(opt => opt.value === value);
    if (option) {
      setOrderRows(prev => prev.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            productCode: option.sku,
            product: option.product,
            variant: option.variant,
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
    setOrderRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof OrderRow, value: any) => {
    const computeTotal = (prod?: Product, variant?: any, qty?: number, selectedUnit?: string) => {
      if (!prod || !qty) return 0;
      
      let price = variant ? variant.price : prod.rate;
      
      // Dynamically calculate conversion factor based on selected unit
      if (!variant && prod.base_unit) {
        const baseUnit = prod.base_unit.toLowerCase();
        const targetUnit = (selectedUnit || prod.unit || 'kg').toLowerCase();
        
        // Calculate dynamic conversion factor
        let dynamicConversionFactor = 1;
        
        if (baseUnit === 'kg') {
          if (targetUnit === 'grams' || targetUnit === 'gram') {
            dynamicConversionFactor = 0.001; // 1 gram = 0.001 kg
          } else if (targetUnit === 'kg') {
            dynamicConversionFactor = 1;
          }
        } else if (baseUnit === 'piece' || baseUnit === 'pcs') {
          dynamicConversionFactor = prod.conversion_factor || 1;
        }
        
        // Apply conversion: price per selected unit = rate per base unit × conversion factor
        price = prod.rate * dynamicConversionFactor;
      }
      
      // Apply variant discount if applicable
      if (variant) {
        if (variant.discount_percentage > 0) {
          price = price - (price * variant.discount_percentage / 100);
        } else if (variant.discount_amount > 0) {
          price = price - variant.discount_amount;
        }
      }
      
      const base = Number(price) * Number(qty);
      const active = prod.schemes?.find(s => s.is_active);
      if (active && active.condition_quantity && active.discount_percentage && qty >= active.condition_quantity) {
        return base - (base * (Number(active.discount_percentage) / 100));
      }
      return base;
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
              updatedRow.closingStock = result.variant ? result.variant.stock_quantity : result.product.closing_stock;
              updatedRow.total = computeTotal(result.product, result.variant, updatedRow.quantity, updatedRow.unit);
            } else {
              updatedRow.product = undefined;
              updatedRow.variant = undefined;
              updatedRow.closingStock = 0;
              updatedRow.total = 0;
            }
          } else if (field === "quantity") {
            updatedRow.total = computeTotal(row.product, row.variant, value, row.unit);
          } else if (field === "unit") {
            // Recalculate total when unit changes
            updatedRow.total = computeTotal(row.product, row.variant, row.quantity, value);
          }
          return updatedRow;
        }
        return row;
      });
      // Auto-update cart whenever rows change
      setTimeout(() => {
        const productRows = updatedRows.filter(row => row.product);
        const cartItems = productRows.map(row => {
          const baseProduct = {
            ...row.product!,
            rate: row.variant ? row.variant.price : row.product!.rate,
            name: row.variant ? `${row.product!.name} - ${row.variant.variant_name}` : row.product!.name,
            sku: row.variant ? row.variant.sku : row.product!.sku,
            closing_stock: row.variant ? row.variant.stock_quantity : row.product!.closing_stock
          };
          const itemId = row.variant ? `${row.product!.id}_variant_${row.variant.id}` : (baseProduct.id || 'unknown');
          return {
            id: itemId,
            name: baseProduct.name || 'Unknown Product',
            category: baseProduct.category?.name || 'Uncategorized',
            rate: Number(baseProduct.rate) || 0,
            unit: baseProduct.unit || 'piece',
            quantity: Number(row.quantity) || 0,
            total: Number(row.total) || 0,
            closingStock: Number(row.closingStock) || 0,
            schemes: baseProduct.schemes || []
          };
        });
        onCartUpdate(cartItems);
      }, 0);

      return updatedRows;
    });
  };

  const addToCart = () => {
    const validRows = orderRows.filter(row => row.product && row.quantity > 0);
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Items",
        description: "Please add valid products with quantities",
        variant: "destructive"
      });
      return;
    }

    try {
      const cartItems = validRows.map(row => {
        const baseProduct = {
          ...row.product!,
          rate: row.variant ? row.variant.price : row.product!.rate,
          name: row.variant ? `${row.product!.name} - ${row.variant.variant_name}` : row.product!.name,
          sku: row.variant ? row.variant.sku : row.product!.sku,
          closing_stock: row.variant ? row.variant.stock_quantity : row.product!.closing_stock
        };
        
        const itemId = row.variant ? `${row.product!.id}_variant_${row.variant.id}` : (baseProduct.id || 'unknown');
        
        // Ensure all required fields are present and valid
        return {
          id: itemId,
          name: baseProduct.name || 'Unknown Product',
          category: baseProduct.category?.name || 'Uncategorized',
          rate: Number(baseProduct.rate) || 0,
          unit: baseProduct.unit || 'piece',
          quantity: Number(row.quantity) || 0,
          total: Number(row.total) || 0,
          closingStock: Number(row.closingStock) || 0,
          schemes: baseProduct.schemes || []
        };
      });

      console.log('Adding items to cart:', cartItems);
      
      // Update cart through parent component
      onCartUpdate(cartItems);
      
      // Calculate storage key matching OrderEntry logic
      const validRetailerIdForStorage = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
      const validVisitIdForStorage = visitId && visitId.length > 1 ? visitId : null;
      
      const storageKey = validVisitIdForStorage && validRetailerIdForStorage 
        ? `order_cart:${validVisitIdForStorage}:${validRetailerIdForStorage}`
        : validRetailerIdForStorage 
          ? `order_cart:temp:${validRetailerIdForStorage}`
          : 'order_cart:fallback';
      
      console.log('Saving to localStorage with key:', storageKey, 'Items:', cartItems);
      
      // Save directly to localStorage before navigating to ensure data is persisted
      localStorage.setItem(storageKey, JSON.stringify(cartItems));
      
      toast({
        title: "Added to Cart",
        description: `${validRows.length} items added to cart.`
      });
      
      // Small delay to ensure localStorage write completes
      setTimeout(() => {
        // Navigate to cart with current parameters
        const params = new URLSearchParams(searchParams);
        navigate(`/cart?${params.toString()}`);
      }, 100);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add items to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getTotalValue = () => {
    return orderRows.reduce((sum, row) => sum + row.total, 0);
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
        <Button onClick={fetchProducts} variant="outline">
          Retry Loading Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bulk Order Entry</CardTitle>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Enter product SKUs directly for faster ordering ({products.length} products available)
            </p>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border">
              <strong>Note:</strong> All base prices are stored per KG. Rates auto-adjust when selling in grams or other units.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full">
            {/* Table Header - Responsive */}
            <div className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 bg-muted/50 border-b border-border">
              <div className="font-semibold text-xs md:text-sm">Product</div>
              <div className="font-semibold text-xs md:text-sm">Unit</div>
              <div className="font-semibold text-xs md:text-sm text-center">Qty</div>
              <div className="font-semibold text-xs md:text-sm text-center">Stock</div>
            </div>
              
              {/* Table Rows - Responsive */}
              <div className="divide-y divide-border">
                {orderRows.map((row, index) => (
                  <div 
                  key={row.id} 
                  className={cn(
                    "grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr] md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 md:gap-4 px-2 md:px-4 py-2 md:py-3 items-center",
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
                            className="w-full justify-start h-auto min-h-[44px] md:min-h-[52px] text-xs md:text-sm font-normal bg-background px-2 py-1.5"
                          >
                            {row.product ? (
                              <div className="flex flex-col items-start w-full">
                                <span className="truncate text-left w-full">
                                  {row.variant ? (() => {
                                    let variantDisplayName = row.variant.variant_name;
                                    if (variantDisplayName.toLowerCase().startsWith(row.product.name.toLowerCase())) {
                                      variantDisplayName = variantDisplayName.substring(row.product.name.length).trim();
                                      variantDisplayName = variantDisplayName.replace(/^[-\s]+/, '');
                                    }
                                    return variantDisplayName || row.variant.variant_name;
                                  })() : row.product.name}
                                 </span>
                                 {row.product.base_unit ? (() => {
                                  const baseUnit = row.product.base_unit.toLowerCase();
                                  const selectedUnit = (row.unit || row.product.unit || 'kg').toLowerCase();
                                  let conversionFactor = 1;
                                  
                                  if (baseUnit === 'kg') {
                                    if (selectedUnit === 'grams' || selectedUnit === 'gram') {
                                      conversionFactor = 0.001;
                                    }
                                  }
                                  
                                  const pricePerUnit = row.product.rate * conversionFactor;
                                  
                                  return conversionFactor !== 1 ? (
                                    <div className="flex flex-col mt-0.5 w-full">
                                      <span className="text-[10px] md:text-xs text-muted-foreground">
                                        ₹{pricePerUnit.toFixed(2)} per {row.unit}
                                      </span>
                                      <span className="text-[9px] md:text-[10px] text-muted-foreground/70">
                                        (₹{row.product.rate.toFixed(2)} per {row.product.base_unit})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                                      ₹{row.variant?.price || row.product.rate || 0}
                                    </span>
                                  );
                                })() : (
                                  <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                                    ₹{row.variant?.price || row.product.rate || 0}
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
                                    <div className="flex-1">
                                      <div className="font-medium">{option.label}</div>
                                      <div className="text-[10px] md:text-xs text-muted-foreground">
                                        SKU: {option.sku} | ₹{option.variant ? option.variant.price : option.product.rate}
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
                        className="h-9 md:h-11 text-xs md:text-sm text-center bg-background px-1"
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
          <p className="text-lg font-bold">₹{getTotalValue().toLocaleString()}</p>
        </div>
      </div>

      <Button 
        onClick={addToCart}
        className="w-full"
        disabled={getTotalValue() === 0}
      >
        Add All to Cart
      </Button>
    </div>
  );
};
