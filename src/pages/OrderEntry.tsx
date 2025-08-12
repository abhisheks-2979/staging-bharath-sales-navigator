import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Package, Gift, ArrowLeft, Plus, Check, Grid3X3, Table, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { TableOrderForm } from "@/components/TableOrderForm";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  hasScheme?: boolean;
  schemeDetails?: string;
  closingStock?: number;
}

interface CartItem extends Product {
  quantity: number;
  total: number;
}

interface GridProduct {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  hasScheme?: boolean;
  schemeDetails?: string;
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  closingStock?: number;
  variants?: ProductVariant[];
  selectedVariantId?: string;
  sku?: string;
}

interface ProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  discount_amount: number;
  discount_percentage: number;
  is_active: boolean;
}


export const OrderEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  const retailerName = searchParams.get("retailer") || "Retailer Name";

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [closingStocks, setClosingStocks] = useState<{[key: string]: number}>({});
  const [selectedVariants, setSelectedVariants] = useState<{[key: string]: string}>({});
  const [orderMode, setOrderMode] = useState<"grid" | "table">("grid");
  const [openVariantSheet, setOpenVariantSheet] = useState<string | null>(null);
const [categories, setCategories] = useState<string[]>(["All"]);
  const [products, setProducts] = useState<GridProduct[]>([]);
const [loading, setLoading] = useState(true);
const [userId, setUserId] = useState<string | null>(null);
const [schemes, setSchemes] = useState<any[]>([]);

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUserId(data.user?.id || null);
  });
}, []);

const storageKey = userId && retailerId ? `order_cart:${userId}:${retailerId}` : null;
const tempStorageKey = retailerId ? `order_cart:temp:${retailerId}` : null;

useEffect(() => {
  try {
    if (storageKey) {
      const rawUser = localStorage.getItem(storageKey);
      if (rawUser) {
        setCart(JSON.parse(rawUser) as CartItem[]);
        return;
      }
      if (tempStorageKey) {
        const rawTemp = localStorage.getItem(tempStorageKey);
        if (rawTemp) {
          const parsed = JSON.parse(rawTemp) as CartItem[];
          setCart(parsed);
          localStorage.setItem(storageKey, rawTemp);
          localStorage.removeItem(tempStorageKey);
          return;
        }
      }
    } else if (tempStorageKey) {
      const rawTemp = localStorage.getItem(tempStorageKey);
      if (rawTemp) {
        setCart(JSON.parse(rawTemp) as CartItem[]);
      }
    }
  } catch {}
}, [storageKey, tempStorageKey]);

useEffect(() => {
  const key = storageKey || tempStorageKey;
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(cart));
}, [cart, storageKey, tempStorageKey]);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        supabase.from('product_categories').select('name').order('name'),
        supabase.from('products').select(`
          *,
          category:product_categories(name),
          schemes:product_schemes(id, name, description, is_active, scheme_type, condition_quantity, quantity_condition_type, discount_percentage, discount_amount, free_quantity, variant_id, start_date, end_date),
          variants:product_variants(id, variant_name, sku, price, stock_quantity, discount_amount, discount_percentage, is_active)
        `).eq('is_active', true).order('name')
      ]);

      setCategories(["All", ...((catRes.data || []).map((c: any) => c.name))]);

      const mapped: GridProduct[] = [];
      const allSchemes: any[] = [];
      
      (prodRes.data || []).forEach((p: any) => {
        const activeSchemes = (p.schemes || []).filter((s: any) => s.is_active && 
          (!s.start_date || new Date(s.start_date) <= new Date()) &&
          (!s.end_date || new Date(s.end_date) >= new Date())
        );
        
        allSchemes.push(...activeSchemes);
        
        const activeVariants = (p.variants || []).filter((v: any) => v.is_active);
        
        const baseProduct: GridProduct = {
          id: p.id,
          name: p.name,
          category: p.category?.name || 'Uncategorized',
          rate: p.rate,
          unit: p.unit,
          hasScheme: activeSchemes.length > 0,
          schemeDetails: activeSchemes.length > 0 ? activeSchemes.map(s => 
            `${s.name}: ${getSchemeDescription(s)}`
          ).join('; ') : undefined,
          closingStock: p.closing_stock,
          variants: activeVariants,
          sku: p.sku
        };

        mapped.push(baseProduct);
      });
      setProducts(mapped);
      setSchemes(allSchemes);
    } catch (error) {
      console.error('Error loading products', error);
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);

const filteredProducts = selectedCategory === "All" 
  ? products 
  : products.filter(product => product.category === selectedCategory);

  const handleQuantityChange = (productId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleClosingStockChange = (productId: string, value: string) => {
    // Remove leading zeros and convert to number
    const cleanValue = value.replace(/^0+/, '') || '0';
    const stock = parseInt(cleanValue) || 0;
    setClosingStocks(prev => ({ ...prev, [productId]: stock }));
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: variantId }));
    // Reset quantity when variant changes
    setQuantities(prev => ({ ...prev, [productId]: 0 }));
  };

  const getDisplayProduct = (product: GridProduct) => {
    const selectedVariantId = selectedVariants[product.id];
    if (selectedVariantId && selectedVariantId !== "base" && product.variants) {
      const variant = product.variants.find(v => v.id === selectedVariantId);
      if (variant) {
        const variantPrice = variant.discount_percentage > 0 
          ? variant.price - (variant.price * variant.discount_percentage / 100)
          : variant.discount_amount > 0 
            ? variant.price - variant.discount_amount
            : variant.price;
        
        return {
          ...product,
          id: `${product.id}_variant_${variant.id}`,
          name: `${product.name} - ${variant.variant_name}`,
          rate: variantPrice,
          closingStock: variant.stock_quantity,
          sku: variant.sku
        };
      }
    }
    return product;
  };

  const getSavingsAmount = (product: GridProduct) => {
    const selectedVariantId = selectedVariants[product.id];
    if (selectedVariantId && selectedVariantId !== "base" && product.variants) {
      const variant = product.variants.find(v => v.id === selectedVariantId);
      if (variant) {
        if (variant.discount_percentage > 0) {
          return variant.price * variant.discount_percentage / 100;
        }
        if (variant.discount_amount > 0) {
          return variant.discount_amount;
        }
      }
    }
    return 0;
  };

  // Helper function to get scheme description
  const getSchemeDescription = (scheme: any) => {
    const conditionText = scheme.quantity_condition_type === 'more_than' 
      ? `Buy ${scheme.condition_quantity}+ ${scheme.scheme_type === 'buy_get' ? 'items' : 'units'}`
      : `Buy exactly ${scheme.condition_quantity} ${scheme.scheme_type === 'buy_get' ? 'items' : 'units'}`;
    
    if (scheme.scheme_type === 'discount') {
      if (scheme.discount_percentage) {
        return `${conditionText}, get ${scheme.discount_percentage}% off`;
      } else if (scheme.discount_amount) {
        return `${conditionText}, get ₹${scheme.discount_amount} off`;
      }
    } else if (scheme.scheme_type === 'buy_get') {
      return `${conditionText}, get ${scheme.free_quantity} free`;
    }
    return scheme.description || 'Special offer';
  };

  // Helper function to calculate scheme discount
  const calculateSchemeDiscount = (productId: string, variantId: string | null, quantity: number, basePrice: number) => {
    const applicableSchemes = schemes.filter(scheme => 
      scheme.product_id === productId && 
      (scheme.variant_id === variantId || scheme.variant_id === null)
    );

    let totalDiscount = 0;
    let freeQuantity = 0;

    applicableSchemes.forEach(scheme => {
      const meetsCondition = scheme.quantity_condition_type === 'more_than' 
        ? quantity >= scheme.condition_quantity
        : quantity === scheme.condition_quantity;

      if (meetsCondition) {
        if (scheme.scheme_type === 'discount') {
          if (scheme.discount_percentage) {
            totalDiscount += (basePrice * quantity * scheme.discount_percentage) / 100;
          } else if (scheme.discount_amount) {
            totalDiscount += scheme.discount_amount;
          }
        } else if (scheme.scheme_type === 'buy_get') {
          freeQuantity += scheme.free_quantity || 0;
        }
      }
    });

    return { totalDiscount, freeQuantity };
  };

  const addToCart = (product: Product) => {
    const quantity = quantities[product.id] || 0;
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    const baseTotal = Number(product.rate) * Number(quantity);
    const { totalDiscount, freeQuantity } = calculateSchemeDiscount(product.id, null, quantity, Number(product.rate));
    const finalTotal = baseTotal - totalDiscount;

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      setCart(prev => prev.map(item => 
        item.id === product.id 
          ? { ...item, quantity, total: finalTotal }
          : item
      ));
    } else {
      setCart(prev => [...prev, { ...product, quantity, total: finalTotal }]);
    }

    const schemeMessage = totalDiscount > 0 ? ` (Saved ₹${totalDiscount.toFixed(2)})` : '';
    const freeMessage = freeQuantity > 0 ? ` + ${freeQuantity} free` : '';

    toast({
      title: "Added to Cart",
      description: `${quantity} ${product.unit}(s) of ${product.name} added to cart${schemeMessage}${freeMessage}`
    });
  };

  const handleBulkCartUpdate = (items: CartItem[]) => {
    setCart(prev => {
      const newCart = [...prev];
      items.forEach(item => {
        const existingIndex = newCart.findIndex(cartItem => cartItem.id === item.id);
        if (existingIndex >= 0) {
          newCart[existingIndex].quantity += item.quantity;
          newCart[existingIndex].total += item.total;
        } else {
          newCart.push(item);
        }
      });
      return newCart;
    });
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalValue = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  // New: live selection value from current quantities (before adding to cart)
  const getSelectionValue = () => {
    return products.reduce((sum, p) => {
      const qty = quantities[p.id] || 0;
      return sum + Number(p.rate || 0) * Number(qty || 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/visits/retailers")}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <CardTitle className="text-lg">Order Entry</CardTitle>
                <p className="text-primary-foreground/80">{retailerName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary-foreground/80">Current value</p>
              <p className="text-xl font-bold">₹{getSelectionValue().toLocaleString()}</p>
            </div>
          </CardHeader>
        </Card>

        {/* Order Mode Toggle */}
        <Card>
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Button
                variant={orderMode === "grid" ? "default" : "outline"}
                onClick={() => setOrderMode("grid")}
                className="flex-1 h-8"
                size="sm"
              >
                <Grid3X3 size={14} className="mr-1" />
                Grid
              </Button>
              <Button
                variant={orderMode === "table" ? "default" : "outline"}
                onClick={() => setOrderMode("table")}
                className="flex-1 h-8"
                size="sm"
              >
                <Table size={14} className="mr-1" />
                Table
              </Button>
            </div>
          </CardContent>
        </Card>

        {orderMode === "grid" ? (
          <>
            {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-3 w-full">
            {categories.slice(0, 3).map(category => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsList className="grid grid-cols-3 w-full mt-2">
            {categories.slice(3).map(category => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Products Grid */}
        <div className="grid grid-cols-1 gap-3">
          {filteredProducts.map(product => {
            const displayProduct = getDisplayProduct(product);
            const savingsAmount = getSavingsAmount(product);
            
            return (
              <Card key={product.id} className="relative">
                {product.hasScheme && (
                  <div className="absolute -top-1 -right-1 z-10">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-0">
                      <Gift size={10} className="mr-1" />
                      Scheme
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      {displayProduct.sku && (
                        <p className="text-xs text-blue-600 font-mono">SKU: {displayProduct.sku}</p>
                      )}
                      <p className="text-base font-bold text-primary">₹{displayProduct.rate}/{product.unit}</p>
                      {savingsAmount > 0 && (
                        <p className="text-xs text-green-600 font-semibold">
                          You save ₹{savingsAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Package size={16} className="text-muted-foreground" />
                  </div>

                  {/* Available Variants Button */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mb-3">
                      <Sheet open={openVariantSheet === product.id} onOpenChange={(open) => setOpenVariantSheet(open ? product.id : null)}>
                        <SheetTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full h-10 text-sm font-medium"
                            onClick={() => setOpenVariantSheet(product.id)}
                          >
                            <Package size={16} className="mr-2" />
                            Available Variants ({product.variants.length})
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[90vh] p-0">
                          <ScrollArea className="h-full">
                            <div className="p-4 pb-24">
                              <SheetHeader className="mb-4">
                                <SheetTitle className="text-left">
                                  {product.name} - Variants
                                </SheetTitle>
                              </SheetHeader>

                              {/* Scheme Banner */}
                              {product.hasScheme && (
                                <div className="mb-4 p-3 bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 rounded-lg">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Gift size={14} className="text-orange-600" />
                                    <span className="text-sm font-semibold text-orange-700">Active Offers</span>
                                  </div>
                                  <p className="text-xs text-orange-700">{product.schemeDetails}</p>
                                </div>
                              )}

                              {/* Variants Grid */}
                              <div className="border rounded-lg overflow-hidden bg-background">
                                {/* Grid Header */}
                                <div className="bg-muted/80 grid grid-cols-5 gap-2 p-3 text-sm font-semibold border-b">
                                  <div>Variant</div>
                                  <div>Rate</div>
                                  <div>Qty</div>
                                  <div>Amount</div>
                                  <div>Stock</div>
                                </div>

                                {/* Base Product Row */}
                                <div className="grid grid-cols-5 gap-2 p-3 border-b bg-primary/5">
                                  <div className="text-sm font-medium">Base Product</div>
                                  <div className="text-sm font-bold text-primary">₹{product.rate}</div>
                                  <div>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      value={quantities[product.id] || ""}
                                      onChange={(e) => {
                                        const qty = parseInt(e.target.value) || 0;
                                        handleQuantityChange(product.id, qty);
                                        if (qty > 0) {
                                          handleVariantChange(product.id, "base");
                                        }
                                      }}
                                      className="h-10 text-sm"
                                      min="0"
                                    />
                                  </div>
                                  <div className="text-sm font-bold">
                                    ₹{((quantities[product.id] || 0) * product.rate).toFixed(2)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {product.closingStock || 0}
                                  </div>
                                </div>

                                {/* Variant Rows */}
                                {product.variants.map(variant => {
                                  const variantPrice = variant.discount_percentage > 0 
                                    ? variant.price - (variant.price * variant.discount_percentage / 100)
                                    : variant.discount_amount > 0 
                                      ? variant.price - variant.discount_amount
                                      : variant.price;
                                  const savings = variant.discount_percentage > 0 
                                    ? variant.price * variant.discount_percentage / 100
                                    : variant.discount_amount;
                                  const variantQuantity = quantities[variant.id] || 0;
                                  const variantAmount = variantQuantity * variantPrice;
                                  
                                  return (
                                    <div 
                                      key={variant.id} 
                                      className={`grid grid-cols-5 gap-2 p-3 border-b ${variantQuantity > 0 ? 'bg-green-50' : ''}`}
                                    >
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium">{variant.variant_name}</div>
                                        {savings > 0 && (
                                          <Badge className="bg-green-100 text-green-700 text-xs px-1 py-0">
                                            Save ₹{savings.toFixed(2)}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm font-bold text-primary">
                                        ₹{variantPrice.toFixed(2)}
                                      </div>
                                      <div>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={variantQuantity || ""}
                                          onChange={(e) => {
                                            const qty = parseInt(e.target.value) || 0;
                                            handleQuantityChange(variant.id, qty);
                                            if (qty > 0) {
                                              handleVariantChange(product.id, variant.id);
                                            }
                                          }}
                                          className="h-10 text-sm"
                                          min="0"
                                        />
                                      </div>
                                      <div className="text-sm font-bold">
                                        ₹{variantAmount.toFixed(2)}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {variant.stock_quantity || 0}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Fixed Add to Cart Button */}
                            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
                              <Button 
                                onClick={() => {
                                  // Add all selected variants to cart
                                  const selectedItems = [];
                                  
                                  if (selectedVariants[product.id] === "base" && quantities[product.id] > 0) {
                                    selectedItems.push({
                                      ...product,
                                      quantity: quantities[product.id],
                                      total: quantities[product.id] * product.rate
                                    });
                                  }
                                  
                                  product.variants?.forEach(variant => {
                                    if (selectedVariants[product.id] === variant.id && quantities[variant.id] > 0) {
                                      const variantPrice = variant.discount_percentage > 0 
                                        ? variant.price - (variant.price * variant.discount_percentage / 100)
                                        : variant.discount_amount > 0 
                                          ? variant.price - variant.discount_amount
                                          : variant.price;
                                      
                                      const baseTotal = quantities[variant.id] * variantPrice;
                                      const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, quantities[variant.id], variantPrice);
                                      const finalTotal = baseTotal - totalDiscount;
                                      
                                      selectedItems.push({
                                        id: `${product.id}_variant_${variant.id}`,
                                        name: `${product.name} - ${variant.variant_name}`,
                                        category: product.category,
                                        rate: variantPrice,
                                        unit: product.unit,
                                        quantity: quantities[variant.id],
                                        total: finalTotal,
                                        closingStock: variant.stock_quantity
                                      });
                                    }
                                  });
                                  
                                  if (selectedItems.length === 0) {
                                    toast({
                                      title: "No Items Selected",
                                      description: "Please select variants and enter quantities",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  
                                  // Add all items to cart
                                  selectedItems.forEach(item => {
                                    const existingItem = cart.find(cartItem => cartItem.id === item.id);
                                    if (existingItem) {
                                      setCart(prev => prev.map(cartItem => 
                                        cartItem.id === item.id 
                                          ? { ...cartItem, quantity: cartItem.quantity + item.quantity, total: cartItem.total + item.total }
                                          : cartItem
                                      ));
                                    } else {
                                      setCart(prev => [...prev, item]);
                                    }
                                  });
                                  
                                  setOpenVariantSheet(null);
                                  toast({
                                    title: "Added to Cart",
                                    description: `${selectedItems.length} item(s) added to cart`
                                  });
                                }}
                                className="w-full h-12 text-base font-semibold"
                                size="lg"
                                disabled={(() => {
                                  const hasSelection = selectedVariants[product.id] === "base" && quantities[product.id] > 0 ||
                                    product.variants?.some(v => selectedVariants[product.id] === v.id && quantities[v.id] > 0);
                                  return !hasSelection;
                                })()}
                              >
                                <ShoppingCart size={18} className="mr-2" />
                                Add to Cart
                              </Button>
                            </div>
                          </ScrollArea>
                        </SheetContent>
                      </Sheet>
                    </div>
                  )}

                  {product.hasScheme && (
                    <div className="mb-2 p-2 bg-orange-50 rounded border border-orange-200">
                      <p className="text-xs text-orange-700 font-medium">🎁 Active Schemes:</p>
                      <p className="text-xs text-orange-700">{product.schemeDetails}</p>
                      {(() => {
                        const currentQty = quantities[product.id] || 0;
                        if (currentQty > 0) {
                          const { totalDiscount, freeQuantity } = calculateSchemeDiscount(product.id, null, currentQty, product.rate);
                          if (totalDiscount > 0 || freeQuantity > 0) {
                            return (
                              <div className="mt-1 text-xs text-green-700 font-medium">
                                {totalDiscount > 0 && `💰 You'll save ₹${totalDiscount.toFixed(2)}`}
                                {freeQuantity > 0 && ` 🎁 ${freeQuantity} free item(s)`}
                              </div>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  {/* Selected Items Summary & Stock */}
                  {(product.variants && product.variants.length > 0) ? (
                    <div className="space-y-2">
                      {/* Selected Items Summary */}
                      {(() => {
                        const selectedItems = [];
                        
                        // Add base product if selected and has quantity
                        if (selectedVariants[product.id] === "base" && quantities[product.id] > 0) {
                          selectedItems.push({
                            id: product.id,
                            name: "Base Product",
                            quantity: quantities[product.id],
                            rate: product.rate,
                            amount: quantities[product.id] * product.rate
                          });
                        }
                        
                        // Add variants if selected and have quantity
                        product.variants.forEach(variant => {
                          if (selectedVariants[product.id] === variant.id && quantities[variant.id] > 0) {
                            const variantPrice = variant.discount_percentage > 0 
                              ? variant.price - (variant.price * variant.discount_percentage / 100)
                              : variant.discount_amount > 0 
                                ? variant.price - variant.discount_amount
                                : variant.price;
                            selectedItems.push({
                              id: variant.id,
                              name: variant.variant_name,
                              quantity: quantities[variant.id],
                              rate: variantPrice,
                              amount: quantities[variant.id] * variantPrice
                            });
                          }
                        });
                        
                        const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0);
                        
                        return selectedItems.length > 0 ? (
                          <div className="border rounded-lg p-2 bg-muted/20">
                            <label className="text-xs text-muted-foreground mb-2 block">Selected Items</label>
                            <div className="space-y-1">
                              {selectedItems.map(item => (
                                <div key={item.id} className="flex justify-between text-xs">
                                  <span>{item.name} x {item.quantity}</span>
                                  <span className="font-medium">₹{item.amount.toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="border-t pt-1 mt-1 flex justify-between text-sm font-bold">
                                <span>Total</span>
                                <span>₹{totalAmount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      
                      {/* Stock Input */}
                      <div>
                        <label className="text-xs text-muted-foreground">Stock</label>
                        <Input
                          type="number"
                          placeholder={displayProduct.closingStock?.toString() || "0"}
                          value={closingStocks[displayProduct.id] ?? displayProduct.closingStock}
                          onChange={(e) => handleClosingStockChange(displayProduct.id, e.target.value)}
                          onFocus={(e) => {
                            if (e.target.value === "0") {
                              e.target.select();
                            }
                          }}
                          className="h-8 text-sm"
                        />
                      </div>

                      {/* Add to Cart Button */}
                      <Button 
                        onClick={() => {
                          // Add all selected variants to cart
                          const selectedItems = [];
                          
                          if (selectedVariants[product.id] === "base" && quantities[product.id] > 0) {
                            selectedItems.push({
                              ...product,
                              quantity: quantities[product.id],
                              total: quantities[product.id] * product.rate
                            });
                          }
                          
                           product.variants?.forEach(variant => {
                             if (selectedVariants[product.id] === variant.id && quantities[variant.id] > 0) {
                               const variantPrice = variant.discount_percentage > 0 
                                 ? variant.price - (variant.price * variant.discount_percentage / 100)
                                 : variant.discount_amount > 0 
                                   ? variant.price - variant.discount_amount
                                   : variant.price;
                               
                               const baseTotal = quantities[variant.id] * variantPrice;
                               const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, quantities[variant.id], variantPrice);
                               const finalTotal = baseTotal - totalDiscount;
                               
                               selectedItems.push({
                                 id: `${product.id}_variant_${variant.id}`,
                                 name: `${product.name} - ${variant.variant_name}`,
                                 category: product.category,
                                 rate: variantPrice,
                                 unit: product.unit,
                                 quantity: quantities[variant.id],
                                 total: finalTotal,
                                 closingStock: variant.stock_quantity
                               });
                             }
                           });
                          
                          if (selectedItems.length === 0) {
                            toast({
                              title: "No Items Selected",
                              description: "Please select variants and enter quantities",
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Add all items to cart
                          selectedItems.forEach(item => {
                            const existingItem = cart.find(cartItem => cartItem.id === item.id);
                            if (existingItem) {
                              setCart(prev => prev.map(cartItem => 
                                cartItem.id === item.id 
                                  ? { ...cartItem, quantity: cartItem.quantity + item.quantity, total: cartItem.total + item.total }
                                  : cartItem
                              ));
                            } else {
                              setCart(prev => [...prev, item]);
                            }
                          });
                          
                          toast({
                            title: "Added to Cart",
                            description: `${selectedItems.length} item(s) added to cart`
                          });
                        }}
                        className="w-full h-8"
                        size="sm"
                        disabled={(() => {
                          const hasSelection = selectedVariants[product.id] === "base" && quantities[product.id] > 0 ||
                            product.variants?.some(v => selectedVariants[product.id] === v.id && quantities[v.id] > 0);
                          return !hasSelection;
                        })()}
                      >
                        <Plus size={14} className="mr-1" />
                        Add Selected to Cart
                      </Button>
                    </div>
                  ) : (
                    // Original layout for products without variants
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Qty</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={quantities[displayProduct.id] || ""}
                            onChange={(e) => handleQuantityChange(displayProduct.id, parseInt(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Stock</label>
                          <Input
                            type="number"
                            placeholder={displayProduct.closingStock?.toString() || "0"}
                            value={closingStocks[displayProduct.id] ?? displayProduct.closingStock}
                            onChange={(e) => handleClosingStockChange(displayProduct.id, e.target.value)}
                            onFocus={(e) => {
                              if (e.target.value === "0") {
                                e.target.select();
                              }
                            }}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                       {/* Show scheme discount preview */}
                       {(() => {
                         const currentQty = quantities[displayProduct.id] || 0;
                         if (currentQty > 0 && product.hasScheme) {
                           const { totalDiscount, freeQuantity } = calculateSchemeDiscount(product.id, null, currentQty, displayProduct.rate);
                           if (totalDiscount > 0 || freeQuantity > 0) {
                             return (
                               <div className="text-xs text-green-600 font-medium mb-2">
                                 {totalDiscount > 0 && `💰 Save ₹${totalDiscount.toFixed(2)}`}
                                 {freeQuantity > 0 && ` 🎁 ${freeQuantity} free`}
                               </div>
                             );
                           }
                         }
                         return null;
                       })()}

                       <Button 
                         onClick={() => addToCart(displayProduct)}
                         className={`w-full h-8 ${cart.some((i) => i.id === displayProduct.id) ? 'bg-success text-success-foreground hover:bg-success/90' : ''}`}
                         size="sm"
                         variant={cart.some((i) => i.id === displayProduct.id) ? "default" : "default"}
                       >
                         {cart.some((i) => i.id === displayProduct.id) ? (
                           <>
                             <Check size={14} className="mr-1" />
                             Added
                           </>
                         ) : (
                           <>
                             <Plus size={14} className="mr-1" />
                             Add
                           </>
                         )}
                       </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        </>
        ) : (
          /* Table Order Form */
          <TableOrderForm onCartUpdate={handleBulkCartUpdate} />
        )}

        {/* Fixed Bottom Cart Summary */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">{getTotalItems()} items</p>
                  <p className="font-bold">₹{getTotalValue().toLocaleString()}</p>
                </div>
                <Button 
                  onClick={() => navigate(`/cart?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}`)}
                  className="flex items-center gap-2"
                >
                  <ShoppingCart size={16} />
                  View Cart
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};