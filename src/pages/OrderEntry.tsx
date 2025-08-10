import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, Gift, ArrowLeft, Plus, Check, Grid3X3, Table } from "lucide-react";
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
  closingStock?: number;
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
  const [orderMode, setOrderMode] = useState<"grid" | "table">("grid");
const [categories, setCategories] = useState<string[]>(["All"]);
const [products, setProducts] = useState<GridProduct[]>([]);
const [loading, setLoading] = useState(true);
const [userId, setUserId] = useState<string | null>(null);

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
          schemes:product_schemes(name, description, is_active, scheme_type, condition_quantity, discount_percentage)
        `).eq('is_active', true).order('name')
      ]);

      setCategories(["All", ...((catRes.data || []).map((c: any) => c.name))]);

      const mapped: GridProduct[] = (prodRes.data || []).map((p: any) => {
        const active = (p.schemes || []).find((s: any) => s.is_active);
        return {
          id: p.id,
          name: p.name,
          category: p.category?.name || 'Uncategorized',
          rate: p.rate,
          unit: p.unit,
          hasScheme: !!active,
          schemeDetails: active ? `Buy ${active.condition_quantity}+ ${p.unit}s, get ${active.discount_percentage}% off` : undefined,
          closingStock: p.closing_stock
        };
      });
      setProducts(mapped);
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

  const handleClosingStockChange = (productId: string, stock: number) => {
    setClosingStocks(prev => ({ ...prev, [productId]: stock }));
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

    const existingItem = cart.find(item => item.id === product.id);
    const total = product.rate * quantity;

    if (existingItem) {
      setCart(prev => prev.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + quantity, total: item.total + total }
          : item
      ));
    } else {
      setCart(prev => [...prev, { ...product, quantity, total }]);
    }

    // Update closing stock
    const newStock = closingStocks[product.id] ?? product.closingStock;
    if (newStock !== undefined) {
      setClosingStocks(prev => ({ ...prev, [product.id]: Math.max(0, newStock - quantity) }));
    }

    // Keep quantity after add; do not reset
    
    toast({
      title: "Added to Cart",
      description: `${quantity} ${product.unit}(s) of ${product.name} added to cart`
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
          {filteredProducts.map(product => (
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
                    <p className="text-base font-bold text-primary">₹{product.rate}/{product.unit}</p>
                  </div>
                  <Package size={16} className="text-muted-foreground" />
                </div>

                {product.hasScheme && (
                  <div className="mb-2 p-2 bg-orange-50 rounded border border-orange-200">
                    <p className="text-xs text-orange-700">{product.schemeDetails}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Qty</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={quantities[product.id] || ""}
                        onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Stock</label>
                      <Input
                        type="number"
                        placeholder={product.closingStock?.toString() || "0"}
                        value={closingStocks[product.id] ?? product.closingStock}
                        onChange={(e) => handleClosingStockChange(product.id, parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={() => addToCart(product)}
                    className="w-full h-8"
                    size="sm"
                    variant={cart.some((i) => i.id === product.id) ? "secondary" : "default"}
                  >
                    {cart.some((i) => i.id === product.id) ? (
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
              </CardContent>
            </Card>
          ))}
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