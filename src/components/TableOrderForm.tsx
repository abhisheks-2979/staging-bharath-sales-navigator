import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Gift, Package, Search, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
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
  total: number;
}

interface TableOrderFormProps {
  onCartUpdate: (items: any[]) => void;
}

export const TableOrderForm = ({ onCartUpdate }: TableOrderFormProps) => {
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  
  const [orderRows, setOrderRows] = useState<OrderRow[]>([
    { id: "1", productCode: "", quantity: 0, closingStock: 0, total: 0 }
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
    const options: Array<{ value: string; label: string; product: Product; variant?: any; sku: string }> = [];
    
    products.forEach(product => {
      // Add base product
      options.push({
        value: product.id,
        label: product.name,
        product: product,
        sku: product.sku
      });
      
      // Add variants
      if (product.variants) {
        product.variants.forEach(variant => {
          if (variant.is_active) {
            options.push({
              value: `${product.id}_variant_${variant.id}`,
              label: `${product.name} - ${variant.variant_name}`,
              product: product,
              variant: variant,
              sku: variant.sku
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
      total: 0
    };
    setOrderRows(prev => [...prev, newRow]);
  };

  const removeRow = (id: string) => {
    setOrderRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof OrderRow, value: any) => {
    const computeTotal = (prod?: Product, variant?: any, qty?: number) => {
      if (!prod || !qty) return 0;
      
      let price = variant ? variant.price : prod.rate;
      
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
              updatedRow.total = computeTotal(result.product, result.variant, updatedRow.quantity);
            } else {
              updatedRow.product = undefined;
              updatedRow.variant = undefined;
              updatedRow.closingStock = 0;
              updatedRow.total = 0;
            }
          } else if (field === "quantity") {
            updatedRow.total = computeTotal(row.product, row.variant, value);
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
      onCartUpdate(cartItems);
      
      toast({
        title: "Added to Cart",
        description: `${validRows.length} items added to cart. Data will be cleared after order submission.`
      });
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
          <p className="text-sm text-muted-foreground">
            Enter product SKUs directly for faster ordering ({products.length} products available)
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Product</TableHead>
                  <TableHead className="w-20">SKU</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-16">Stock</TableHead>
                  <TableHead className="w-20">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2">
                      <Popover 
                        open={openComboboxes[row.id]} 
                        onOpenChange={(open) => setOpenComboboxes(prev => ({ ...prev, [row.id]: open }))}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openComboboxes[row.id]}
                            className="w-full justify-between h-8 text-xs font-normal"
                          >
                            {row.product ? (
                              <span className="truncate">
                                {row.variant ? `${row.product.name} - ${row.variant.variant_name}` : row.product.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Select product...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search products..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {getProductOptions().map((option) => (
                                  <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => handleProductSelect(row.id, option.value)}
                                    className="text-xs"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        row.product?.id === option.product.id && 
                                        (!row.variant && !option.variant || row.variant?.id === option.variant?.id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">{option.label}</div>
                                      <div className="text-[10px] text-muted-foreground">
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
                    </TableCell>
                    <TableCell className="p-2">
                      {row.product ? (
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-blue-600 font-mono">
                            {row.variant ? row.variant.sku : row.product.sku}
                          </div>
                          {hasActiveSchemes(row.product) && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] px-1 py-0">
                              <Gift size={7} className="mr-0.5" />
                              Scheme
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.quantity || ""}
                        onChange={(e) => updateRow(row.id, "quantity", parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                        disabled={!row.product}
                      />
                    </TableCell>
                     <TableCell className="p-2">
                       <Input
                         type="number"
                         placeholder="0"
                         value={row.closingStock === 0 ? "" : row.closingStock}
                         onChange={(e) => {
                           const value = e.target.value;
                           // If input is empty, set to 0, otherwise parse the integer
                           updateRow(row.id, "closingStock", value === "" ? 0 : parseInt(value) || 0);
                         }}
                         className={`h-8 text-xs ${row.closingStock === 0 ? "text-muted-foreground" : ""}`}
                         disabled={!row.product}
                       />
                     </TableCell>
                    <TableCell className="p-2">
                      <span className="text-xs font-medium">
                        {row.total > 0 ? `₹${row.total}` : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="p-2">
                      {orderRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          className="h-6 w-6"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
