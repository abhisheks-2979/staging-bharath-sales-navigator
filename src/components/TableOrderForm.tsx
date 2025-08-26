import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name),
          schemes:product_schemes(name, description, is_active, scheme_type, condition_quantity, discount_percentage),
          variants:product_variants(id, variant_name, sku, price, stock_quantity, discount_amount, discount_percentage, is_active)
        `)
        .eq('is_active', true);
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
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

    setOrderRows(prev => prev.map(row => {
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
    }));
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
        
        // Ensure all required fields are present and valid
        return {
          id: baseProduct.id || 'unknown',
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
        description: `${validRows.length} items added to cart`
      });

      // Reset form and clear saved data
      const resetRows = [{ id: Date.now().toString(), productCode: "", quantity: 0, closingStock: 0, total: 0 }];
      setOrderRows(resetRows);
      localStorage.setItem(tableFormStorageKey, JSON.stringify(resetRows));
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bulk Order Entry</CardTitle>
          <p className="text-sm text-muted-foreground">Enter product SKUs directly for faster ordering</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">SKU</TableHead>
                  <TableHead className="min-w-32">Product</TableHead>
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
                      <Input
                        placeholder="RICE001"
                        value={row.productCode}
                        onChange={(e) => updateRow(row.id, "productCode", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      {row.product ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">
                              {row.variant ? `${row.product.name} - ${row.variant.variant_name}` : row.product.name}
                            </span>
                            {hasActiveSchemes(row.product) && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-1 py-0">
                                <Gift size={8} className="mr-0.5" />
                                Scheme
                              </Badge>
                            )}
                          </div>
                           <div className="text-[10px] text-muted-foreground">
                            ₹{row.variant ? (row.variant.price % 1 === 0 ? row.variant.price.toString() : row.variant.price.toFixed(2)) : (row.product.rate % 1 === 0 ? row.product.rate.toString() : row.product.rate.toFixed(2))}/{row.product.unit}
                            {row.variant && (row.variant.discount_percentage > 0 || row.variant.discount_amount > 0) && (
                              <span className="text-green-600 ml-1">
                                (Discounted: ₹{(() => {
                                  const discountedPrice = row.variant.discount_percentage > 0 
                                    ? (row.variant.price - (row.variant.price * row.variant.discount_percentage / 100))
                                    : (row.variant.price - row.variant.discount_amount);
                                  return discountedPrice % 1 === 0 ? discountedPrice.toString() : discountedPrice.toFixed(2);
                                })()})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-blue-600 font-mono">
                            SKU: {row.variant ? row.variant.sku : row.product.sku}
                          </div>
                          {hasActiveSchemes(row.product) && (
                            <div className="text-[10px] text-orange-600 bg-orange-50 p-1 rounded">
                              {getActiveSchemeDetails(row.product)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Enter SKU</span>
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