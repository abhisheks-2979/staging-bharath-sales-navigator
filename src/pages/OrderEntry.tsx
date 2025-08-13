import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Gift, ArrowLeft, Plus, Check, Grid3X3, Table, Minus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { TableOrderForm } from "@/components/TableOrderForm";
import { OrderSummaryModal } from "@/components/OrderSummaryModal";
import { SchemeDetailsModal } from "@/components/SchemeDetailsModal";
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
const [categories, setCategories] = useState<string[]>(["All"]);
  const [products, setProducts] = useState<GridProduct[]>([]);
const [loading, setLoading] = useState(true);
const [userId, setUserId] = useState<string | null>(null);
const [schemes, setSchemes] = useState<any[]>([]);
const [expandedProducts, setExpandedProducts] = useState<{[key: string]: boolean}>({});
const [showOrderSummary, setShowOrderSummary] = useState(false);
const [currentProductName, setCurrentProductName] = useState<string>("Product");
const [showSchemeModal, setShowSchemeModal] = useState(false);
const [selectedProductForScheme, setSelectedProductForScheme] = useState<GridProduct | null>(null);
const [filteredSchemes, setFilteredSchemes] = useState<any[]>([]);
const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

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
          schemes:product_schemes(id, name, description, is_active, scheme_type, condition_quantity, quantity_condition_type, discount_percentage, discount_amount, free_quantity, variant_id, start_date, end_date, product_id),
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
    // Don't reset quantities for base product to fix auto-update issue
    // Only reset when switching between different non-base variants
    const currentVariant = selectedVariants[productId];
    if (currentVariant && currentVariant !== variantId && currentVariant !== "base" && variantId !== "base") {
      setQuantities(prev => ({ ...prev, [productId]: 0 }));
    }
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
    
    if (scheme.scheme_type === 'discount' || scheme.scheme_type === 'volume_discount') {
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
        ? quantity > scheme.condition_quantity
        : quantity === scheme.condition_quantity;

      if (meetsCondition) {
        if (scheme.scheme_type === 'discount' || scheme.scheme_type === 'volume_discount') {
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

  // Calculate total value from selected quantities and variants with auto-calculation
  const getSelectionValue = () => {
    let total = 0;
    
    // Only include products from current category
    const categoryProducts = selectedCategory === "All" 
      ? products 
      : products.filter(product => product.category === selectedCategory);
    
    categoryProducts.forEach(product => {
      // Check base product quantity
      const baseQty = quantities[product.id] || 0;
      
      if (baseQty > 0) {
        const { totalDiscount } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
        total += (baseQty * product.rate) - totalDiscount;
      }
      
      // Check all variant quantities
      if (product.variants) {
        product.variants.forEach(variant => {
          const variantQty = quantities[variant.id] || 0;
          
          if (variantQty > 0) {
            const variantPrice = variant.discount_percentage > 0 
              ? variant.price - (variant.price * variant.discount_percentage / 100)
              : variant.discount_amount > 0 
                ? variant.price - variant.discount_amount
                : variant.price;
            
            const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
            total += (variantQty * variantPrice) - totalDiscount;
          }
        });
      }
    });
    
    return total;
  };

  // Get current selection details for order summary
  const getSelectionDetails = () => {
    const items: any[] = [];
    let totalSavings = 0;
    
    // Only include products from current category
    const categoryProducts = selectedCategory === "All" 
      ? products 
      : products.filter(product => product.category === selectedCategory);
    
    categoryProducts.forEach(product => {
      // Check base product quantity
      const baseQty = quantities[product.id] || 0;
      
      if (baseQty > 0) {
        const total = baseQty * product.rate;
        const { totalDiscount } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
        totalSavings += totalDiscount;
        
        items.push({
          id: product.id,
          variantName: "Base Product",
          selectedItem: product.name,
          quantity: baseQty,
          rate: product.rate,
          totalPrice: total - totalDiscount,
          savings: totalDiscount,
          appliedOffers: totalDiscount > 0 ? [`Scheme discount: ₹${totalDiscount.toFixed(2)}`] : []
        });
      }
      
      // Check all variant quantities - only for variants of this specific product
      if (product.variants) {
        product.variants.forEach(variant => {
          const variantQty = quantities[variant.id] || 0;
          
          if (variantQty > 0) {
            const variantPrice = variant.discount_percentage > 0 
              ? variant.price - (variant.price * variant.discount_percentage / 100)
              : variant.discount_amount > 0 
                ? variant.price - variant.discount_amount
                : variant.price;
            
            const variantSavings = variant.discount_percentage > 0 
              ? variant.price * variant.discount_percentage / 100
              : variant.discount_amount;
            
            const baseTotal = variantQty * variantPrice;
            const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
            totalSavings += (variantSavings * variantQty) + totalDiscount;
            
            const appliedOffers = [];
            if (variantSavings > 0) {
              appliedOffers.push(`Variant discount: ₹${(variantSavings * variantQty).toFixed(2)}`);
            }
            if (totalDiscount > 0) {
              appliedOffers.push(`Scheme discount: ₹${totalDiscount.toFixed(2)}`);
            }
            
            items.push({
              id: `${product.id}_variant_${variant.id}`,
              variantName: variant.variant_name,
              selectedItem: `${product.name} - ${variant.variant_name}`,
              quantity: variantQty,
              rate: variantPrice,
              totalPrice: baseTotal - totalDiscount,
              savings: (variantSavings * variantQty) + totalDiscount,
              appliedOffers
            });
          }
        });
      }
    });
    
    return { items, totalSavings };
  };

  // Handle adding all selected items to cart
  const handleAddAllToCart = () => {
    const { items } = getSelectionDetails();
    
    if (items.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items and enter quantities",
        variant: "destructive"
      });
      return;
    }
    
    // Add all items to cart
    items.forEach(item => {
      const cartItem = {
        id: item.id,
        name: item.selectedItem,
        category: products.find(p => p.id === item.id.split('_')[0])?.category || "Unknown",
        rate: item.rate,
        unit: products.find(p => p.id === item.id.split('_')[0])?.unit || "piece",
        quantity: item.quantity,
        total: item.totalPrice
      };
      
      const existingItem = cart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        setCart(prev => prev.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity, total: cartItem.total + item.totalPrice }
            : cartItem
        ));
      } else {
        setCart(prev => [...prev, cartItem]);
      }
    });
    
    // Reset quantities and selections
    setQuantities({});
    setSelectedVariants({});
    setShowOrderSummary(false);
    
    toast({
      title: "Added to Cart",
      description: `${items.length} item(s) added to cart`
    });
  };

  // Function to toggle variant table visibility
  const toggleVariantTable = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Function to handle product selection and auto-expand
  const handleProductSelect = (productId: string, productName: string) => {
    // Close all other variant tables
    const newExpandedProducts: {[key: string]: boolean} = {};
    
    // Auto-expand for specific products or when clicking on a product
    newExpandedProducts[productId] = true;
    
    setExpandedProducts(newExpandedProducts);
  };

  // Auto-expand logic for filtered products when category changes
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const newExpandedProducts: {[key: string]: boolean} = {};
      
      // Auto-expand first product in the category
      if (filteredProducts.length > 0) {
        newExpandedProducts[filteredProducts[0].id] = true;
      }
      
      setExpandedProducts(newExpandedProducts);
    }
  }, [selectedCategory, filteredProducts]);

  // Function to handle scheme click
  const handleSchemeClick = (product: GridProduct) => {
    const productSchemes = schemes.filter(scheme => 
      scheme.product_id === product.id && 
      scheme.is_active && 
      (!scheme.start_date || new Date(scheme.start_date) <= new Date()) &&
      (!scheme.end_date || new Date(scheme.end_date) >= new Date())
    );
    
    setSelectedProductForScheme(product);
    setFilteredSchemes(productSchemes);
    setShowSchemeModal(true);
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
            <Button
              variant="ghost"
              onClick={() => {
                const { items } = getSelectionDetails();
                if (items.length > 0) {
                  setShowOrderSummary(true);
                }
              }}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-2"
              disabled={getSelectionValue() === 0}
            >
              <div className="text-right">
                <p className="text-xs text-primary-foreground/80">Current value (Click)</p>
                <p className="text-xl font-bold">₹{getSelectionValue().toLocaleString()}</p>
              </div>
            </Button>
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

        {/* Single Column Layout */}
        <div className="space-y-3">
          {/* Products Grid */}
          <div className="space-y-3">
          {filteredProducts.map(product => {
            const displayProduct = getDisplayProduct(product);
            const savingsAmount = getSavingsAmount(product);
            
            return (
              <Card key={product.id} className="relative">
                {/* Only show scheme button for products with active schemes */}
                {product.hasScheme && (
                  <div className="absolute -top-2 -right-2 z-20">
                    <Badge 
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:scale-105 text-white text-xs px-2 py-1 cursor-pointer transition-all duration-200 shadow-lg border-2 border-white"
                      onClick={() => handleSchemeClick(product)}
                    >
                      <Gift size={10} className="mr-1" />
                      Scheme
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 
                        className="font-semibold text-sm cursor-pointer text-primary hover:underline"
                        onClick={() => {
                          // Close all other products and open this one
                          setExpandedProducts({ [product.id]: true });
                        }}
                      >
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      {displayProduct.sku && (
                        <p className="text-xs text-blue-600 font-mono">SKU: {displayProduct.sku}</p>
                      )}
                      <p className="text-base font-bold text-primary">
                        Total: ₹{(() => {
                          let total = 0;
                          
                          // Calculate base product total
                          const baseQty = quantities[product.id] || 0;
                          if (baseQty > 0) {
                            const { totalDiscount } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
                            total += (baseQty * product.rate) - totalDiscount;
                          }
                          
                          // Calculate all variant totals
                          if (product.variants) {
                            product.variants.forEach(variant => {
                              const variantQty = quantities[variant.id] || 0;
                              if (variantQty > 0) {
                                const variantPrice = variant.discount_percentage > 0 
                                  ? variant.price - (variant.price * variant.discount_percentage / 100)
                                  : variant.discount_amount > 0 
                                    ? variant.price - variant.discount_amount
                                    : variant.price;
                                const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
                                total += (variantQty * variantPrice) - totalDiscount;
                              }
                            });
                          }
                          
                          return total > 0 ? total.toLocaleString() : "0";
                        })()}
                      </p>
                      
                       {/* View Order Button */}
                       <Button
                         variant="ghost"
                         size="sm"
                         onClick={() => {
                           setCurrentProductName(product.name);
                           setShowOrderSummary(true);
                         }}
                         className="text-xs h-6 p-1 mt-1 text-primary hover:bg-primary/10"
                       >
                         View Order
                       </Button>
                      
                      {savingsAmount > 0 && (
                        <p className="text-xs text-green-600 font-semibold">
                          You save ₹{savingsAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Package size={16} className="text-muted-foreground" />
                  </div>

                  {/* Variant Grid */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-muted-foreground">Available Variants</label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleVariantTable(product.id)}
                          className="h-6 w-6 p-0 hover:bg-muted"
                        >
                          {expandedProducts[product.id] ? (
                            <Minus size={12} className="text-muted-foreground" />
                          ) : (
                            <Plus size={12} className="text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {expandedProducts[product.id] && (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 grid grid-cols-4 gap-1 p-2 text-xs font-medium">
                            <div>Variant</div>
                            <div>Rate</div>
                            <div>Qty</div>
                            <div>Stock</div>
                          </div>
                          
                          {/* Base Product Row */}
                          <div className="grid grid-cols-4 gap-1 p-2 text-xs border-t">
                            <div className="text-xs">Base Product</div>
                            <div className="font-medium">₹{product.rate % 1 === 0 ? product.rate.toString() : product.rate.toFixed(2)}</div>
                            <div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={quantities[product.id] || ""}
                                onChange={(e) => {
                                  console.log('Base product quantity change:', product.id, e.target.value);
                                  const qty = parseInt(e.target.value) || 0;
                                  handleQuantityChange(product.id, qty);
                                  if (qty > 0) {
                                    handleVariantChange(product.id, "base");
                                  }
                                }}
                                className="h-6 text-xs p-1"
                                min="0"
                                disabled={false}
                              />
                            </div>
                             <div>
                               <Input
                                  type="number"
                                  placeholder="0"
                                  value={(() => {
                                    const stock = closingStocks[product.id] ?? product.closingStock;
                                    return stock === 0 ? "" : stock;
                                  })()}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    handleClosingStockChange(product.id, value === "" ? "0" : value);
                                  }}
                                  onFocus={(e) => {
                                    if (e.target.value === "0" || e.target.value === "") {
                                      e.target.select();
                                    }
                                  }}
                                  className={`h-6 text-xs p-1 ${(() => {
                                    const stock = closingStocks[product.id] ?? product.closingStock;
                                    return stock === 0 ? "text-muted-foreground" : "";
                                  })()}`}
                                  min="0"
                               />
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
                             
                             // Check if this variant has a scheme applied specifically to it
                             const hasVariantScheme = schemes.some(scheme => 
                               scheme.product_id === product.id && 
                               scheme.variant_id === variant.id && 
                               scheme.is_active &&
                               (!scheme.start_date || new Date(scheme.start_date) <= new Date()) &&
                               (!scheme.end_date || new Date(scheme.end_date) >= new Date())
                             );
                             
                             return (
                               <div key={variant.id} className={`grid grid-cols-4 gap-1 p-2 text-xs border-t ${hasVariantScheme ? 'bg-green-50 border-green-200' : ''}`}>
                                <div className="text-xs">{variant.variant_name}</div>
                                <div className="font-medium">₹{variantPrice % 1 === 0 ? variantPrice.toString() : variantPrice.toFixed(2)}</div>
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
                                    className="h-6 text-xs p-1"
                                    min="0"
                                  />
                                </div>
                                 <div>
                                   <Input
                                     type="number"
                                     placeholder="0"
                                     value={(() => {
                                       const stock = closingStocks[variant.id] ?? variant.stock_quantity;
                                       return stock === 0 ? "" : stock;
                                     })()}
                                     onChange={(e) => {
                                       const value = e.target.value;
                                       handleClosingStockChange(variant.id, value === "" ? "0" : value);
                                     }}
                                     onFocus={(e) => {
                                       if (e.target.value === "0" || e.target.value === "") {
                                         e.target.select();
                                       }
                                     }}
                                     className={`h-6 text-xs p-1 ${(() => {
                                       const stock = closingStocks[variant.id] ?? variant.stock_quantity;
                                       return stock === 0 ? "text-muted-foreground" : "";
                                     })()}`}
                                     min="0"
                                   />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}


                   {/* Add to Cart Button */}
                   {(product.variants && product.variants.length > 0) ? (
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
                          
                          // Mark item as added
                          setAddedItems(prev => new Set([...prev, product.id]));
                          
                          // Reset after 3 seconds
                          setTimeout(() => {
                            setAddedItems(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(product.id);
                              return newSet;
                            });
                          }, 3000);
                          
                          toast({
                            title: "Added to Cart",
                            description: `${selectedItems.length} item(s) added to cart`
                          });
                       }}
                        className={`w-full h-8 transition-all duration-300 ${
                          addedItems.has(product.id) 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                        size="sm"
                        disabled={(() => {
                          // Check if base product has quantity
                          const baseQty = quantities[product.id] || 0;
                          
                          // Check if any variant has quantity
                          const hasVariantQty = product.variants?.some(v => (quantities[v.id] || 0) > 0) || false;
                          
                          // Button is disabled if no quantity is entered anywhere
                          return baseQty <= 0 && !hasVariantQty;
                        })()}
                      >
                        {addedItems.has(product.id) ? (
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
                            placeholder="0"
                            value={(() => {
                              const stock = closingStocks[displayProduct.id] ?? displayProduct.closingStock;
                              return stock === 0 ? "" : stock;
                            })()}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleClosingStockChange(displayProduct.id, value === "" ? "0" : value);
                            }}
                            onFocus={(e) => {
                              if (e.target.value === "0" || e.target.value === "") {
                                e.target.select();
                              }
                            }}
                            className={`h-8 text-sm ${(() => {
                              const stock = closingStocks[displayProduct.id] ?? displayProduct.closingStock;
                              return stock === 0 ? "text-muted-foreground" : "";
                            })()}`}
                            min="0"
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
                          onClick={() => {
                            addToCart(displayProduct);
                            // Mark item as added
                            setAddedItems(prev => new Set([...prev, displayProduct.id]));
                            
                            // Reset after 3 seconds
                            setTimeout(() => {
                              setAddedItems(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(displayProduct.id);
                                return newSet;
                              });
                            }, 3000);
                          }}
                          className={`w-full h-8 transition-all duration-300 ${
                            addedItems.has(displayProduct.id) 
                              ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          }`}
                          size="sm"
                          disabled={(quantities[displayProduct.id] || 0) <= 0}
                        >
                          {addedItems.has(displayProduct.id) ? (
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
        
        {/* Order Summary Modal */}
        <OrderSummaryModal
          isOpen={showOrderSummary}
          onClose={() => setShowOrderSummary(false)}
          items={getSelectionDetails().items}
          totalAmount={getSelectionValue()}
          totalSavings={getSelectionDetails().totalSavings}
          onAddToCart={handleAddAllToCart}
          productName={currentProductName}
        />
        
        {/* Scheme Details Modal */}
        <SchemeDetailsModal
          isOpen={showSchemeModal}
          onClose={() => setShowSchemeModal(false)}
          productName={selectedProductForScheme?.name || "Product"}
          schemes={filteredSchemes}
        />
      </div>
    </div>
  );
};