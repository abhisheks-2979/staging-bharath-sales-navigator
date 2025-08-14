import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Gift, ArrowLeft, Plus, Check, Grid3X3, Table, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  schemes?: Array<{ is_active: boolean; condition_quantity?: number; discount_percentage?: number }>;
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
const [loggedInUserName, setLoggedInUserName] = useState<string>("User");
const [schemes, setSchemes] = useState<any[]>([]);
const [expandedProducts, setExpandedProducts] = useState<{[key: string]: boolean}>({});
const [showOrderSummary, setShowOrderSummary] = useState(false);
const [currentProductName, setCurrentProductName] = useState<string>("Product");
const [showSchemeModal, setShowSchemeModal] = useState(false);
const [selectedProductForScheme, setSelectedProductForScheme] = useState<GridProduct | null>(null);
const [filteredSchemes, setFilteredSchemes] = useState<any[]>([]);
const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

useEffect(() => {
  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Fetch user profile to get the name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setLoggedInUserName(profile.full_name || profile.username || user.email?.split('@')[0] || "User");
      } else {
        // Fallback to email username if no profile
        setLoggedInUserName(user.email?.split('@')[0] || "User");
      }
    }
  };
  
  fetchUserData();
}, []);

const storageKey = userId && retailerId ? `order_cart:${userId}:${retailerId}` : null;
const tempStorageKey = retailerId ? `order_cart:temp:${retailerId}` : null;

// Load cart and sync quantities
useEffect(() => {
  try {
    if (storageKey) {
      const rawUser = localStorage.getItem(storageKey);
      if (rawUser) {
        const cartData = JSON.parse(rawUser) as CartItem[];
        setCart(cartData);
        // Sync quantities from cart to order entry
        syncQuantitiesFromCart(cartData);
        return;
      }
      if (tempStorageKey) {
        const rawTemp = localStorage.getItem(tempStorageKey);
        if (rawTemp) {
          const parsed = JSON.parse(rawTemp) as CartItem[];
          setCart(parsed);
          localStorage.setItem(storageKey, rawTemp);
          localStorage.removeItem(tempStorageKey);
          // Sync quantities from cart to order entry
          syncQuantitiesFromCart(parsed);
          return;
        }
      }
    } else if (tempStorageKey) {
      const rawTemp = localStorage.getItem(tempStorageKey);
      if (rawTemp) {
        const cartData = JSON.parse(rawTemp) as CartItem[];
        setCart(cartData);
        // Sync quantities from cart to order entry
        syncQuantitiesFromCart(cartData);
      }
    }
  } catch {}
}, [storageKey, tempStorageKey]);

// Function to sync quantities from cart back to order entry
const syncQuantitiesFromCart = (cartData: CartItem[]) => {
  const newQuantities: {[key: string]: number} = {};
  cartData.forEach(item => {
    newQuantities[item.id] = item.quantity;
  });
  setQuantities(prev => ({ ...prev, ...newQuantities }));
};

useEffect(() => {
  const key = storageKey || tempStorageKey;
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(cart));
  
  // Also save quantities separately for persistence
  const quantityKey = key.replace('order_cart:', 'order_quantities:');
  localStorage.setItem(quantityKey, JSON.stringify(quantities));
}, [cart, storageKey, tempStorageKey, quantities]);

// Load saved quantities on component mount
useEffect(() => {
  const key = storageKey || tempStorageKey;
  if (!key) return;
  
  const quantityKey = key.replace('order_cart:', 'order_quantities:');
  const savedQuantities = localStorage.getItem(quantityKey);
  if (savedQuantities) {
    try {
      setQuantities(JSON.parse(savedQuantities));
    } catch (error) {
      console.error('Error loading saved quantities:', error);
    }
  }
}, [storageKey, tempStorageKey]);

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
    
    // Update cart if item exists there
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem && quantity > 0) {
        return prevCart.map(item => 
          item.id === productId 
            ? { ...item, quantity, total: item.rate * quantity }
            : item
        );
      } else if (existingItem && quantity <= 0) {
        // Remove from cart if quantity is 0 or negative
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart;
    });
  };

  const handleClosingStockChange = (productId: string, value: string) => {
    // Remove leading zeros and convert to number
    const cleanValue = value.replace(/^0+/, '') || '0';
    const stock = parseInt(cleanValue) || 0;
    setClosingStocks(prev => ({ ...prev, [productId]: stock }));
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants(prev => ({ ...prev, [productId]: variantId }));
    // Don't reset any quantities - each variant and base product should maintain their own quantities independently
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
    // Validate inputs
    const safeQuantity = Number(quantity) || 0;
    const safeBasePrice = Number(basePrice) || 0;
    
    const applicableSchemes = schemes.filter(scheme => 
      scheme.product_id === productId && 
      (scheme.variant_id === variantId || scheme.variant_id === null)
    );

    let totalDiscount = 0;
    let freeQuantity = 0;

    applicableSchemes.forEach(scheme => {
      const conditionQty = Number(scheme.condition_quantity) || 0;
      const meetsCondition = scheme.quantity_condition_type === 'more_than' 
        ? safeQuantity > conditionQty
        : safeQuantity === conditionQty;

      if (meetsCondition) {
        if (scheme.scheme_type === 'discount' || scheme.scheme_type === 'volume_discount') {
          const discountPct = Number(scheme.discount_percentage) || 0;
          const discountAmt = Number(scheme.discount_amount) || 0;
          
          if (discountPct > 0) {
            totalDiscount += (safeBasePrice * safeQuantity * discountPct) / 100;
          } else if (discountAmt > 0) {
            totalDiscount += discountAmt;
          }
        } else if (scheme.scheme_type === 'buy_get') {
          freeQuantity += Number(scheme.free_quantity) || 0;
        }
      }
    });

    return { 
      totalDiscount: Number(totalDiscount) || 0, 
      freeQuantity: Number(freeQuantity) || 0 
    };
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
    return cart.reduce((sum, item) => {
      const itemTotal = Number(item.total) || 0;
      return sum + itemTotal;
    }, 0);
  };

  // Calculate total value from selected quantities and variants with auto-calculation
  const getSelectionValue = () => {
    let total = 0;
    
    // Include all products regardless of category to match cart behavior
    products.forEach(product => {
      // Check base product quantity
      const baseQty = Number(quantities[product.id]) || 0;
      
      if (baseQty > 0) {
        const productRate = Number(product.rate) || 0;
        const { totalDiscount } = calculateSchemeDiscount(product.id, null, baseQty, productRate);
        const discountValue = Number(totalDiscount) || 0;
        const subtotal = (baseQty * productRate) - discountValue;
        total += Number(subtotal) || 0;
      }
      
      // Check all variant quantities
      if (product.variants) {
        product.variants.forEach(variant => {
          const variantQty = Number(quantities[variant.id]) || 0;
          
          if (variantQty > 0) {
            const basePrice = Number(variant.price) || 0;
            const discountPct = Number(variant.discount_percentage) || 0;
            const discountAmt = Number(variant.discount_amount) || 0;
            
            const variantPrice = discountPct > 0 
              ? basePrice - (basePrice * discountPct / 100)
              : discountAmt > 0 
                ? basePrice - discountAmt
                : basePrice;
            
            const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
            const discountValue = Number(totalDiscount) || 0;
            const subtotal = (variantQty * variantPrice) - discountValue;
            total += Number(subtotal) || 0;
          }
        });
      }
    });
    
    return Number(total) || 0;
  };

  // Get total selected items count
  const getSelectionItemCount = () => {
    let count = 0;
    
    products.forEach(product => {
      // Count base product quantity
      const baseQty = quantities[product.id] || 0;
      count += baseQty;
      
      // Count all variant quantities
      if (product.variants) {
        product.variants.forEach(variant => {
          const variantQty = quantities[variant.id] || 0;
          count += variantQty;
        });
      }
    });
    
    return count;
  };

  // Get current selection details for order summary
  const getSelectionDetails = () => {
    const items: any[] = [];
    let totalSavings = 0;
    
    // Include all products regardless of category
    products.forEach(product => {
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
    
    // Clear existing cart and replace with current selections
    const newCartItems: CartItem[] = [];
    
    // Add all items to cart
    items.forEach(item => {
      const baseProductId = item.id.split('_')[0];
      const product = products.find(p => p.id === baseProductId);
      
      // Check if this is a variant or base product
      const isVariant = item.id.includes('_variant_');
      const variantId = isVariant ? item.id.split('_variant_')[1] : null;
      
      // Find applicable schemes for discount calculation
      const applicableSchemes = schemes.filter(scheme => 
        scheme.product_id === baseProductId && 
        (scheme.variant_id === variantId || scheme.variant_id === null)
      );
      
      // Get the active scheme (if any)
      const activeScheme = applicableSchemes.find(scheme => {
        const meetsCondition = scheme.quantity_condition_type === 'more_than' 
          ? item.quantity > scheme.condition_quantity
          : item.quantity === scheme.condition_quantity;
        return meetsCondition;
      });
      
      const cartItem: CartItem = {
        id: item.id,
        name: item.selectedItem,
        category: product?.category || "Unknown",
        rate: item.rate,
        unit: product?.unit || "piece",
        quantity: item.quantity,
        total: item.totalPrice,
        // Add scheme information for discount calculations
        ...(activeScheme && {
          schemeConditionQuantity: activeScheme.condition_quantity,
          schemeDiscountPercentage: activeScheme.discount_percentage || 0,
          schemes: [{
            is_active: true,
            condition_quantity: activeScheme.condition_quantity,
            discount_percentage: activeScheme.discount_percentage || 0
          }]
        })
      };
      
      newCartItems.push(cartItem);
    });
    
    // Replace cart completely with new selections
    setCart(newCartItems);
    
    // Don't clear quantities - keep them until order is submitted
    // setQuantities({});
    // setSelectedVariants({});
    setShowOrderSummary(false);
    
    toast({
      title: "Cart Updated",
      description: `Cart updated with ${items.length} item(s)`
    });
  };

  // Auto-sync function to update cart with current selections
  const autoSyncCart = () => {
    const { items } = getSelectionDetails();
    
    // Create new cart items from current selections
    const newCartItems: CartItem[] = [];
    
    items.forEach(item => {
      const baseProductId = item.id.split('_')[0];
      const product = products.find(p => p.id === baseProductId);
      
      // Check if this is a variant or base product
      const isVariant = item.id.includes('_variant_');
      const variantId = isVariant ? item.id.split('_variant_')[1] : null;
      
      // Find applicable schemes for discount calculation
      const applicableSchemes = schemes.filter(scheme => 
        scheme.product_id === baseProductId && 
        (scheme.variant_id === variantId || scheme.variant_id === null)
      );
      
      // Get the active scheme (if any)
      const activeScheme = applicableSchemes.find(scheme => {
        const meetsCondition = scheme.quantity_condition_type === 'more_than' 
          ? item.quantity > scheme.condition_quantity
          : item.quantity === scheme.condition_quantity;
        return meetsCondition;
      });
      
      const cartItem: CartItem = {
        id: item.id,
        name: item.selectedItem,
        category: product?.category || "Unknown",
        rate: item.rate,
        unit: product?.unit || "piece",
        quantity: item.quantity,
        total: item.totalPrice,
        // Add scheme information for discount calculations
        ...(activeScheme && {
          schemeConditionQuantity: activeScheme.condition_quantity,
          schemeDiscountPercentage: activeScheme.discount_percentage || 0,
          schemes: [{
            is_active: true,
            condition_quantity: activeScheme.condition_quantity,
            discount_percentage: activeScheme.discount_percentage || 0
          }]
        })
      };
      
      newCartItems.push(cartItem);
    });
    
    // Update both state and localStorage
    setCart(newCartItems);
    
    // Also update localStorage directly for cart page
    const storageKey = userId && retailerId ? `order_cart:${userId}:${retailerId}` : 
                     retailerId ? `order_cart:temp:${retailerId}` : null;
    
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newCartItems));
    }
  };

  // Function to toggle variant table visibility
  const toggleVariantTable = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Function to handle product selection - keep variants collapsed
  const handleProductSelect = (productId: string, productName: string) => {
    // Do not auto-expand variants when selecting a product
    // User can manually expand by clicking "Available Variants"
    setCurrentProductName(productName);
  };

  // Auto-expand logic for filtered products when category changes - DISABLED to keep variants collapsed by default
  useEffect(() => {
    // Keep all variant tables collapsed by default
    // User can manually expand them by clicking on "Available Variants"
    if (filteredProducts.length > 0) {
      const newExpandedProducts: {[key: string]: boolean} = {};
      // Initialize all products as collapsed (false)
      filteredProducts.forEach(product => {
        newExpandedProducts[product.id] = false;
      });
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
                <p className="text-primary-foreground/80">{loggedInUserName}</p>
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
                      <Collapsible
                        open={expandedProducts[product.id]}
                        onOpenChange={(open) => {
                          setExpandedProducts(prev => ({ ...prev, [product.id]: open }));
                        }}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between mb-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                            <label className="text-xs text-muted-foreground">Available Variants</label>
                            <div className="flex items-center">
                              {expandedProducts[product.id] ? (
                                <ChevronDown size={14} className="text-muted-foreground" />
                              ) : (
                                <ChevronRight size={14} className="text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
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
                             
                              // Get variant-specific schemes
                              const variantSchemes = schemes.filter(scheme => 
                                scheme.product_id === product.id && 
                                scheme.variant_id === variant.id && 
                                scheme.is_active &&
                                (!scheme.start_date || new Date(scheme.start_date) <= new Date()) &&
                                (!scheme.end_date || new Date(scheme.end_date) >= new Date())
                              );
                              
                              return (
                                <div key={variant.id} className={`grid grid-cols-4 gap-1 p-2 text-xs border-t ${hasVariantScheme ? 'bg-green-50 border-green-200' : ''}`}>
                                 <div className="text-xs">
                                   <div>{variant.variant_name}</div>
                                   {variantSchemes.length > 0 && (
                                     <div className="text-orange-500 font-medium mt-1">
                                       {variantSchemes.map(scheme => scheme.description).join(', ')}
                                     </div>
                                   )}
                                 </div>
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
                        </CollapsibleContent>
                      </Collapsible>
                      </div>
                   )}

                   {/* Simple table for products without variants */}
                   {(!product.variants || product.variants.length === 0) && (
                     <div className="mb-3">
                       <div className="border rounded-lg overflow-hidden">
                         <div className="bg-muted/50 grid grid-cols-4 gap-1 p-2 text-xs font-medium">
                           <div>Product</div>
                           <div>Rate</div>
                           <div>Qty</div>
                           <div>Stock</div>
                         </div>
                         
                         <div className="grid grid-cols-4 gap-1 p-2 text-xs border-t">
                           <div className="text-xs">{product.name}</div>
                           <div className="font-medium">₹{product.rate % 1 === 0 ? product.rate.toString() : product.rate.toFixed(2)}</div>
                           <div>
                             <Input
                               type="number"
                               placeholder="0"
                               value={quantities[product.id] || ""}
                               onChange={(e) => {
                                 const qty = parseInt(e.target.value) || 0;
                                 handleQuantityChange(product.id, qty);
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
                       </div>
                     </div>
                   )}


                   {/* Add to Cart Button */}
                   {(product.variants && product.variants.length > 0) ? (
                     <Button 
                        onClick={() => {
                          // Check all quantities for this specific product (base + variants)
                          const selectedItems = [];
                          let totalQtyForProduct = 0;
                          
                          // Check base product quantity
                          const baseQty = quantities[product.id] || 0;
                          if (baseQty > 0) {
                            const baseTotal = baseQty * product.rate;
                            const { totalDiscount } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
                            const finalTotal = baseTotal - totalDiscount;
                            
                            selectedItems.push({
                              ...product,
                              quantity: baseQty,
                              total: finalTotal
                            });
                            totalQtyForProduct += baseQty;
                          }
                          
                          // Check all variant quantities for this product
                          if (product.variants) {
                            product.variants.forEach(variant => {
                              const variantQty = quantities[variant.id] || 0;
                              if (variantQty > 0) {
                                const variantPrice = variant.discount_percentage > 0 
                                  ? variant.price - (variant.price * variant.discount_percentage / 100)
                                  : variant.discount_amount > 0 
                                    ? variant.price - variant.discount_amount
                                    : variant.price;
                                
                                const baseTotal = variantQty * variantPrice;
                                const { totalDiscount } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
                                const finalTotal = baseTotal - totalDiscount;
                                
                                selectedItems.push({
                                  id: `${product.id}_variant_${variant.id}`,
                                  name: `${product.name} - ${variant.variant_name}`,
                                  category: product.category,
                                  rate: variantPrice,
                                  unit: product.unit,
                                  quantity: variantQty,
                                  total: finalTotal,
                                  closingStock: variant.stock_quantity
                                });
                                totalQtyForProduct += variantQty;
                              }
                            });
                          }
                          
                          // Only proceed if there are items with quantities
                          if (selectedItems.length === 0 || totalQtyForProduct === 0) {
                            toast({
                              title: "No Quantity Entered",
                              description: `Please enter quantities for ${product.name}`,
                              variant: "destructive"
                            });
                            return;
                          }
                          
                          // Add all items with quantities to cart (replace existing)
                          selectedItems.forEach(item => {
                            const existingItem = cart.find(cartItem => cartItem.id === item.id);
                            if (existingItem) {
                              // Replace existing item with new quantity
                              setCart(prev => prev.map(cartItem => 
                                cartItem.id === item.id 
                                  ? { ...cartItem, quantity: item.quantity, total: item.total }
                                  : cartItem
                              ));
                            } else {
                              // Add new item
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
                            description: `${product.name}: ${totalQtyForProduct} item(s) added to cart`
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
                     // Simplified layout for products without variants - just the add button
                     <div className="space-y-2">
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
                              const quantity = quantities[displayProduct.id] || 0;
                              if (quantity <= 0) {
                                toast({
                                  title: "No Quantity Entered",
                                  description: `Please enter quantity for ${displayProduct.name}`,
                                  variant: "destructive"
                                });
                                return;
                              }
                              
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

        {/* Fixed Bottom Cart Summary - Shows actual cart items only */}
        {getTotalItems() > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-50">
            <div className="container mx-auto">
              <div className="flex items-center justify-end">
                <Button 
                  onClick={() => {
                    navigate(`/cart?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}`);
                  }}
                  className="flex items-center gap-2"
                  disabled={getTotalItems() === 0}
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