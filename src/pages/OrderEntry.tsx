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

// Fix retailerId validation - don't use "." as a valid retailerId  
const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
const validVisitId = visitId && visitId.length > 1 ? visitId : null;

// Use visitId and retailerId from URL params consistently
const activeStorageKey = validVisitId && validRetailerId 
  ? `order_cart:${validVisitId}:${validRetailerId}`
  : validRetailerId 
    ? `order_cart:temp:${validRetailerId}`
    : 'order_cart:fallback';

// Debug storage keys
console.log('Storage Debug:', { visitId, retailerId, validVisitId, validRetailerId, activeStorageKey });

// Load cart and sync quantities - this runs every time we come back to OrderEntry
useEffect(() => {
  try {
    if (activeStorageKey) {
      const rawUser = localStorage.getItem(activeStorageKey);
      console.log('Loading cart from localStorage:', { activeStorageKey, rawUser });
      if (rawUser) {
        const cartData = JSON.parse(rawUser) as CartItem[];
        console.log('Parsed cart data:', cartData);
        setCart(cartData);
        // Sync quantities from cart to order entry immediately - CRITICAL for persistence
        syncQuantitiesFromCart(cartData);
        return;
      }
    }
  } catch (error) {
    console.error('Error loading cart:', error);
  }
}, [activeStorageKey]);

// Additional effect to ensure quantities are always synced when returning from cart
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      // Page became visible - likely returning from cart
      console.log('Page became visible, re-syncing cart data');
      const rawUser = localStorage.getItem(activeStorageKey);
      if (rawUser) {
        try {
          const cartData = JSON.parse(rawUser) as CartItem[];
          syncQuantitiesFromCart(cartData);
        } catch (error) {
          console.error('Error re-syncing cart on visibility change:', error);
        }
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Also sync on window focus (when coming back from another tab/page)
  const handleFocus = () => {
    console.log('Window focused, re-syncing cart data');
    const rawUser = localStorage.getItem(activeStorageKey);
    if (rawUser) {
      try {
        const cartData = JSON.parse(rawUser) as CartItem[];
        syncQuantitiesFromCart(cartData);
      } catch (error) {
        console.error('Error re-syncing cart on focus:', error);
      }
    }
  };

  window.addEventListener('focus', handleFocus);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
  };
}, [activeStorageKey]);

  // Function to sync quantities from cart back to order entry
const syncQuantitiesFromCart = (cartData: CartItem[]) => {
  const newQuantities: {[key: string]: number} = {};
  const newStocks: {[key: string]: number} = {};
  const newVariants: {[key: string]: string} = {};
  
  console.log('=== Syncing cart data to OrderEntry ===', cartData);
  
  cartData.forEach(item => {
    console.log('Processing cart item:', { id: item.id, quantity: item.quantity, name: item.name });
    
    // Check if this is a variant item (format: baseId_variant_variantId)
    if (item.id.includes('_variant_')) {
      const parts = item.id.split('_variant_');
      if (parts.length === 2) {
        const baseProductId = parts[0];
        const variantId = parts[1];
        console.log('Found variant item:', { baseProductId, variantId, quantity: item.quantity });
        
        // For variant items, store quantity under the full variant ID and set the variant selection
        newQuantities[item.id] = item.quantity; // Store under full variant ID
        newVariants[baseProductId] = variantId;
        
        // Also set the variant-specific stock if available
        if (item.closingStock) {
          newStocks[item.id] = item.closingStock;
        }
      }
    } else {
      // This is a base product, set its quantity directly
      console.log('Found base product:', { id: item.id, quantity: item.quantity });
      newQuantities[item.id] = item.quantity;
      
      // Set stock if available
      if (item.closingStock) {
        newStocks[item.id] = item.closingStock;
      }
    }
  });
  
  console.log('Applying synced data to OrderEntry state:', { newQuantities, newStocks, newVariants });
  
  // Use functional updates to ensure we get the latest state
  setQuantities(prev => {
    const updated = { ...prev, ...newQuantities };
    console.log('Updated quantities state:', updated);
    return updated;
  });
  setClosingStocks(prev => {
    const updated = { ...prev, ...newStocks };
    console.log('Updated stocks state:', updated);
    return updated;
  });
  setSelectedVariants(prev => {
    const updated = { ...prev, ...newVariants };
    console.log('Updated variants state:', updated);
    return updated;
  });
  
  // Also update the addedItems set to show visual feedback
  const newAddedItems = new Set(Object.keys(newQuantities).filter(id => newQuantities[id] > 0));
  setAddedItems(newAddedItems);
  console.log('Updated addedItems:', newAddedItems);
};

useEffect(() => {
  console.log('Saving cart to localStorage:', { activeStorageKey, cartLength: cart.length, cart });
  localStorage.setItem(activeStorageKey, JSON.stringify(cart));
  
  // Also save quantities, variants, and stocks separately for persistence
  const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
  const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
  const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
  
  localStorage.setItem(quantityKey, JSON.stringify(quantities));
  localStorage.setItem(variantKey, JSON.stringify(selectedVariants));
  localStorage.setItem(stockKey, JSON.stringify(closingStocks));
}, [cart, activeStorageKey, quantities, selectedVariants, closingStocks]);

// Load saved form data when storage key changes or products are loaded
useEffect(() => {
  if (!activeStorageKey) return;

  const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
  const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
  const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
  
  console.log('Loading saved form data...', { 
    activeStorageKey, 
    quantityKey, 
    variantKey, 
    stockKey,
    productsLoaded: products.length > 0 
  });
  
  // Load quantities
  const savedQuantities = localStorage.getItem(quantityKey);
  if (savedQuantities) {
    try {
      const parsedQuantities = JSON.parse(savedQuantities);
      console.log('Loading saved quantities:', parsedQuantities);
      setQuantities(prev => ({ ...prev, ...parsedQuantities }));
    } catch (error) {
      console.error('Error loading saved quantities:', error);
    }
  }
  
  // Load selected variants
  const savedVariants = localStorage.getItem(variantKey);
  if (savedVariants) {
    try {
      const parsedVariants = JSON.parse(savedVariants);
      console.log('Loading saved variants:', parsedVariants);
      setSelectedVariants(prev => ({ ...prev, ...parsedVariants }));
    } catch (error) {
      console.error('Error loading saved variants:', error);
    }
  }
  
  // Load closing stocks
  const savedStocks = localStorage.getItem(stockKey);
  if (savedStocks) {
    try {
      const parsedStocks = JSON.parse(savedStocks);
      console.log('Loading saved stocks:', parsedStocks);
      setClosingStocks(prev => ({ ...prev, ...parsedStocks }));
    } catch (error) {
      console.error('Error loading saved stocks:', error);
    }
  }

  // Also sync from cart data to ensure consistency
  const cartData = localStorage.getItem(activeStorageKey);
  if (cartData) {
    try {
      const parsedCart = JSON.parse(cartData) as CartItem[];
      console.log('Also syncing from cart data for consistency:', parsedCart);
      syncQuantitiesFromCart(parsedCart);
    } catch (error) {
      console.error('Error syncing from cart:', error);
    }
  }
}, [activeStorageKey, products.length]);

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
    console.log('Quantity changed:', { productId, quantity });
    
    // Store quantity under the actual productId (could be base or variant)
    setQuantities(prev => {
      const newQuantities = { ...prev };
      if (quantity > 0) {
        newQuantities[productId] = quantity;
      } else {
        delete newQuantities[productId];
      }
      
      // Immediately save to localStorage
      const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
      localStorage.setItem(quantityKey, JSON.stringify(newQuantities));
      console.log('Saving quantity for product:', { productId, quantity, newQuantities });
      return newQuantities;
    });
    
    // Update cart if item exists there (use the full productId for cart lookup)
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
    
    // Store stock under the actual productId (could be base or variant)
    setClosingStocks(prev => {
      const newStocks = { ...prev };
      if (stock > 0) {
        newStocks[productId] = stock;
      } else {
        delete newStocks[productId];
      }
      
      // Immediately save to localStorage
      const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
      localStorage.setItem(stockKey, JSON.stringify(newStocks));
      console.log('Saving stock for product:', { productId, stock, newStocks });
      return newStocks;
    });
  };

  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants(prev => {
      const newVariants = { ...prev, [productId]: variantId };
      // Immediately save to localStorage
      const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
      localStorage.setItem(variantKey, JSON.stringify(newVariants));
      return newVariants;
    });
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

    console.log('Calculating scheme discount:', {
      productId,
      variantId,
      quantity: safeQuantity,
      basePrice: safeBasePrice,
      availableSchemes: applicableSchemes.map(s => ({
        id: s.id,
        name: s.name,
        variant_id: s.variant_id,
        condition_quantity: s.condition_quantity,
        quantity_condition_type: s.quantity_condition_type,
        discount_percentage: s.discount_percentage,
        scheme_type: s.scheme_type
      }))
    });

    let totalDiscount = 0;
    let freeQuantity = 0;

    applicableSchemes.forEach(scheme => {
      const conditionQty = Number(scheme.condition_quantity) || 0;
      // Fix condition logic: "more_than" should check >= not just >
      const meetsCondition = scheme.quantity_condition_type === 'more_than' 
        ? safeQuantity >= conditionQty  // Changed from > to >=
        : safeQuantity === conditionQty;

      console.log('Scheme condition check:', {
        schemeName: scheme.name,
        conditionType: scheme.quantity_condition_type,
        conditionQty,
        actualQty: safeQuantity,
        meetsCondition
      });

      if (meetsCondition) {
        if (scheme.scheme_type === 'discount' || scheme.scheme_type === 'volume_discount') {
          const discountPct = Number(scheme.discount_percentage) || 0;
          const discountAmt = Number(scheme.discount_amount) || 0;
          
          if (discountPct > 0) {
            const schemeDiscount = (safeBasePrice * safeQuantity * discountPct) / 100;
            totalDiscount += schemeDiscount;
            console.log('Applied percentage discount:', {
              discountPct,
              schemeDiscount,
              totalDiscount
            });
          } else if (discountAmt > 0) {
            totalDiscount += discountAmt;
            console.log('Applied fixed discount:', {
              discountAmt,
              totalDiscount
            });
          }
        } else if (scheme.scheme_type === 'buy_get') {
          freeQuantity += Number(scheme.free_quantity) || 0;
        }
      }
    });

    const result = { 
      totalDiscount: Number(totalDiscount) || 0, 
      freeQuantity: Number(freeQuantity) || 0 
    };
    
    console.log('Final scheme calculation result:', result);
    return result;
  };

  const addToCart = (product: Product) => {
    // Get the display product (could be variant)
    const displayProduct = getDisplayProduct(product as GridProduct);
    // Use the display product ID for quantity lookup (supports both base and variant quantities)
    const quantity = quantities[displayProduct.id] || 0;
    
    console.log('Adding to cart:', { 
      originalProductId: product.id, 
      displayProductId: displayProduct.id,
      productName: displayProduct.name, 
      quantity, 
      activeStorageKey 
    });
    
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    const baseTotal = Number(displayProduct.rate) * Number(quantity);
    
    // Determine the variant ID for scheme calculation
    let variantIdForScheme = null;
    if (displayProduct.id.includes('_variant_')) {
      // For composite variant IDs, extract the actual variant ID
      variantIdForScheme = displayProduct.id.split('_variant_')[1];
    }
    
    console.log('Scheme calculation debug:', {
      productId: product.id,
      variantIdForScheme,
      quantity,
      basePrice: Number(displayProduct.rate),
      displayProductId: displayProduct.id
    });
    
    const { totalDiscount, freeQuantity } = calculateSchemeDiscount(
      product.id, 
      variantIdForScheme, 
      quantity, 
      Number(displayProduct.rate)
    );
    const finalTotal = baseTotal - totalDiscount;
    
    console.log('Scheme discount result:', { baseTotal, totalDiscount, finalTotal });

    const cartItem = {
      ...displayProduct,
      quantity,
      total: finalTotal,
      closingStock: closingStocks[displayProduct.id] || displayProduct.closingStock
    };

    const existingItem = cart.find(item => item.id === displayProduct.id);

    if (existingItem) {
      setCart(prev => {
        const newCart = prev.map(item => 
          item.id === displayProduct.id 
            ? { ...item, quantity, total: finalTotal, closingStock: cartItem.closingStock }
            : item
        );
        console.log('Updated cart:', newCart);
        return newCart;
      });
    } else {
      setCart(prev => {
        const newCart = [...prev, cartItem];
        console.log('New cart:', newCart);
        return newCart;
      });
    }

    const schemeMessage = totalDiscount > 0 ? ` (Saved ₹${totalDiscount.toFixed(2)})` : '';
    const freeMessage = freeQuantity > 0 ? ` + ${freeQuantity} free` : '';

    toast({
      title: "Added to Cart",
      description: `${quantity} ${displayProduct.unit}(s) of ${displayProduct.name} added to cart${schemeMessage}${freeMessage}`
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

  // Function to clear all cached form data
  const clearAllFormData = () => {
    const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
    const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
    const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
    
    // Clear from localStorage
    localStorage.removeItem(activeStorageKey);
    localStorage.removeItem(quantityKey);
    localStorage.removeItem(variantKey);
    localStorage.removeItem(stockKey);
    
    // Reset all state
    setCart([]);
    setQuantities({});
    setSelectedVariants({});
    setClosingStocks({});
    
    console.log('All form data cleared');
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
      
      // Check all variant quantities using composite IDs
      if (product.variants) {
        product.variants.forEach(variant => {
          const variantCompositeId = `${product.id}_variant_${variant.id}`;
          const variantQty = Number(quantities[variantCompositeId]) || 0;
          
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
    
    console.log('Getting selection details with current quantities:', quantities);
    
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
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="container mx-auto p-4">
          <Card className="shadow-card bg-gradient-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 py-3">
              {/* Left side - Back button and title */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/visits/retailers")}
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-2 shrink-0"
                >
                  <ArrowLeft size={18} />
                </Button>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-medium leading-tight">Order Entry</CardTitle>
                  <p className="text-xs text-primary-foreground/80 leading-tight truncate">{loggedInUserName}</p>
                </div>
              </div>
              
              {/* Right side - Clear, Cart and Current value */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Clear Form Button */}
                <Button
                  variant="ghost"
                  onClick={clearAllFormData}
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-1.5 flex flex-col items-center gap-0 min-w-[45px]"
                  title="Clear all form data"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                  <span className="text-[9px] leading-tight">Clear</span>
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/cart?visitId=${visitId}&retailerId=${retailerId}&retailer=${encodeURIComponent(retailerName)}`)}
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-2 flex flex-col items-center gap-0 min-w-[50px]"
                >
                  <ShoppingCart size={16} />
                  <span className="text-[10px] leading-tight">Cart</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const { items } = getSelectionDetails();
                    if (items.length > 0) {
                      setShowOrderSummary(true);
                    }
                  }}
                  className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-2 min-w-[60px]"
                  disabled={getSelectionValue() === 0}
                >
                  <div className="text-center">
                    <p className="text-[10px] text-primary-foreground/80 leading-tight">Current</p>
                    <p className="text-sm font-bold leading-tight">₹{getSelectionValue().toLocaleString()}</p>
                  </div>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-2 sm:px-4 space-y-3 pt-28">

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
                          
                          // Calculate all variant totals using composite IDs
                          if (product.variants) {
                            product.variants.forEach(variant => {
                              const variantCompositeId = `${product.id}_variant_${variant.id}`;
                              const variantQty = quantities[variantCompositeId] || 0;
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
                              const variantCompositeId = `${product.id}_variant_${variant.id}`;
                              const variantQuantity = quantities[variantCompositeId] || 0;
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
                                       const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                       handleQuantityChange(variantCompositeId, qty);
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
                                        const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                        const stock = closingStocks[variantCompositeId] ?? variant.stock_quantity;
                                       return stock === 0 ? "" : stock;
                                     })()}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                        handleClosingStockChange(variantCompositeId, value === "" ? "0" : value);
                                      }}
                                     onFocus={(e) => {
                                       if (e.target.value === "0" || e.target.value === "") {
                                         e.target.select();
                                       }
                                     }}
                                      className={`h-6 text-xs p-1 ${(() => {
                                        const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                        const stock = closingStocks[variantCompositeId] ?? variant.stock_quantity;
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

                    {/* Add to Cart Button - unified for both variants and non-variants */}
                    <div className="mt-3">
                      <Button 
                         onClick={() => {
                           if (product.variants && product.variants.length > 0) {
                             // Handle products with variants
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
                                 total: finalTotal,
                                 closingStock: closingStocks[product.id] || product.closingStock
                               });
                               totalQtyForProduct += baseQty;
                             }
                             
                              // Check all variant quantities for this product
                              product.variants.forEach(variant => {
                                const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                const variantQty = quantities[variantCompositeId] || 0;
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
                                   closingStock: closingStocks[variantCompositeId] || variant.stock_quantity
                                 });
                                 totalQtyForProduct += variantQty;
                               }
                             });
                             
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
                                     ? { ...cartItem, quantity: item.quantity, total: item.total, closingStock: item.closingStock }
                                     : cartItem
                                 ));
                               } else {
                                 // Add new item
                                 setCart(prev => [...prev, item]);
                               }
                             });
                              
                             toast({
                               title: "Added to Cart",
                               description: `${product.name}: ${totalQtyForProduct} item(s) added to cart`
                             });
                           } else {
                             // Handle single products without variants
                             addToCart(product);
                           }
                           
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
                         }}
                         className={`w-full h-8 text-xs transition-all duration-300 ${
                           addedItems.has(product.id) 
                             ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                             : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                         }`}
                         disabled={(() => {
                           if (product.variants && product.variants.length > 0) {
                             // Check if base product has quantity
                             const baseQty = quantities[product.id] || 0;
                              // Check if any variant has quantity
                              const hasVariantQty = product.variants.some(v => {
                                const variantCompositeId = `${product.id}_variant_${v.id}`;
                                return (quantities[variantCompositeId] || 0) > 0;
                              });
                             // Button is disabled if no quantity is entered anywhere
                             return baseQty <= 0 && !hasVariantQty;
                           } else {
                             // For single products
                             const displayProduct = getDisplayProduct(product);
                             const qty = quantities[displayProduct.id] || 0;
                             return qty <= 0;
                           }
                         })()}
                       >
                         {addedItems.has(product.id) ? (
                           <>
                             <Check className="w-3 h-3 mr-1" />
                             Added
                           </>
                         ) : (
                           <>
                             <Plus className="w-3 h-3 mr-1" />
                             Add {(() => {
                               if (product.variants && product.variants.length > 0) {
                                 // Show total quantity for products with variants
                                 const baseQty = quantities[product.id] || 0;
                                  const variantQty = product.variants.reduce((sum, v) => {
                                    const variantCompositeId = `${product.id}_variant_${v.id}`;
                                    return sum + (quantities[variantCompositeId] || 0);
                                  }, 0);
                                 const totalQty = baseQty + variantQty;
                                 return totalQty > 0 ? `${totalQty} item(s)` : '';
                               } else {
                                 // Show quantity for single products
                                 const displayProduct = getDisplayProduct(product);
                                 const qty = quantities[displayProduct.id] || 0;
                                 return qty > 0 ? `${qty} ${displayProduct.unit}(s)` : '';
                               }
                             })()} 
                           </>
                         )}
                       </Button>
                      </div>
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