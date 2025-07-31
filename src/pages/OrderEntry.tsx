import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, Gift, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

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

interface CartScheme {
  type: "value" | "quantity";
  condition: number;
  discount: number;
  description: string;
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Premium Rice 25kg",
    category: "Rice & Grains",
    rate: 1200,
    unit: "bag",
    hasScheme: true,
    schemeDetails: "Buy 5+ bags, get 10% off",
    closingStock: 15
  },
  {
    id: "2",
    name: "Wheat Flour 10kg",
    category: "Rice & Grains",
    rate: 400,
    unit: "bag",
    closingStock: 8
  },
  {
    id: "3",
    name: "Sunflower Oil 1L",
    category: "Oil & Ghee",
    rate: 120,
    unit: "bottle",
    hasScheme: true,
    schemeDetails: "Buy 12+ bottles, get 15% off",
    closingStock: 24
  },
  {
    id: "4",
    name: "Mustard Oil 1L",
    category: "Oil & Ghee",
    rate: 140,
    unit: "bottle",
    closingStock: 18
  },
  {
    id: "5",
    name: "Toor Dal 1kg",
    category: "Pulses",
    rate: 80,
    unit: "packet",
    closingStock: 12
  },
  {
    id: "6",
    name: "Moong Dal 1kg",
    category: "Pulses",
    rate: 90,
    unit: "packet",
    hasScheme: true,
    schemeDetails: "Buy 10+ packets, get 5% off",
    closingStock: 20
  }
];

const categories = ["All", "Rice & Grains", "Oil & Ghee", "Pulses", "Spices", "Beverages"];

const cartSchemes: CartScheme[] = [
  {
    type: "value",
    condition: 5000,
    discount: 5,
    description: "5% off on orders above ₹5,000"
  },
  {
    type: "value",
    condition: 10000,
    discount: 10,
    description: "10% off on orders above ₹10,000"
  }
];

export const OrderEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId");
  const retailerName = searchParams.get("retailer") || "Retailer Name";

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<{[key: string]: number}>({});
  const [closingStocks, setClosingStocks] = useState<{[key: string]: number}>({});

  const filteredProducts = selectedCategory === "All" 
    ? mockProducts 
    : mockProducts.filter(product => product.category === selectedCategory);

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

    setQuantities(prev => ({ ...prev, [product.id]: 0 }));
    
    toast({
      title: "Added to Cart",
      description: `${quantity} ${product.unit}(s) of ${product.name} added to cart`
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const getTotalValue = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const getApplicableScheme = () => {
    const totalValue = getTotalValue();
    return cartSchemes
      .filter(scheme => totalValue >= scheme.condition)
      .sort((a, b) => b.discount - a.discount)[0];
  };

  const getFinalTotal = () => {
    const total = getTotalValue();
    const scheme = getApplicableScheme();
    if (scheme) {
      return total - (total * scheme.discount / 100);
    }
    return total;
  };

  const handleSubmitOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before submitting",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Order Submitted",
      description: `Order for ${retailerName} submitted successfully!`
    });
    
    navigate(`/visits/retailers`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between">
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
                <CardTitle className="text-xl">Order Entry</CardTitle>
                <p className="text-primary-foreground/80">{retailerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <Badge variant="secondary">{cart.length} items</Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                {categories.map(category => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map(product => (
                <Card key={product.id} className="relative">
                  {product.hasScheme && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        <Gift size={12} className="mr-1" />
                        Scheme
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                        <p className="text-lg font-bold text-primary">₹{product.rate}/{product.unit}</p>
                      </div>
                      <Package size={20} className="text-muted-foreground" />
                    </div>

                    {product.hasScheme && (
                      <div className="mb-3 p-2 bg-orange-50 rounded-md border border-orange-200">
                        <p className="text-xs text-orange-700">{product.schemeDetails}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Quantity</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={quantities[product.id] || ""}
                            onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Closing Stock</label>
                          <Input
                            type="number"
                            placeholder={product.closingStock?.toString() || "0"}
                            value={closingStocks[product.id] ?? product.closingStock}
                            onChange={(e) => handleClosingStockChange(product.id, parseInt(e.target.value) || 0)}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={() => addToCart(product)}
                        className="w-full h-8"
                        size="sm"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="space-y-4">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Cart ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × ₹{item.rate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">₹{item.total}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 text-xs text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-bold">₹{getTotalValue().toLocaleString()}</span>
                      </div>

                      {getApplicableScheme() && (
                        <div className="p-2 bg-green-50 rounded border border-green-200">
                          <p className="text-xs text-green-700 mb-1">🎉 Scheme Applied!</p>
                          <p className="text-xs text-green-600">{getApplicableScheme()?.description}</p>
                          <div className="flex justify-between text-sm">
                            <span>Discount:</span>
                            <span className="text-green-600">
                              -₹{(getTotalValue() - getFinalTotal()).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>₹{getFinalTotal().toLocaleString()}</span>
                      </div>

                      <Button 
                        onClick={handleSubmitOrder}
                        className="w-full"
                      >
                        Submit Order
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};