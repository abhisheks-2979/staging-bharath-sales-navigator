import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Package, Gift, ArrowLeft, Plus, Check, Grid3X3, Table, Minus, ChevronDown, ChevronRight, Search, X, XCircle, UserX, DoorClosed, Camera, RotateCcw, Star, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { TableOrderForm } from "@/components/TableOrderForm";
import { OrderSummaryModal } from "@/components/OrderSummaryModal";
import { SchemeDetailsModal } from "@/components/SchemeDetailsModal";
import { supabase } from "@/integrations/supabase/client";
import { ImageStockCapture } from "@/components/ImageStockCapture";
import { ReturnStockForm } from "@/components/ReturnStockForm";
import { useCheckInMandatory } from "@/hooks/useCheckInMandatory";
import { isFocusedProductActive } from "@/utils/focusedProductChecker";
interface Product {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  hasScheme?: boolean;
  schemeDetails?: string;
  closingStock?: number;
  is_focused_product?: boolean;
  focused_type?: string | null;
  focused_due_date?: string | null;
  focused_recurring_config?: any;
  focused_territories?: string[] | null;
}
interface CartItem extends Product {
  quantity: number;
  total: number;
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  schemes?: Array<{
    is_active: boolean;
    condition_quantity?: number;
    discount_percentage?: number;
  }>;
}
interface GridProduct {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  base_unit?: string;
  conversion_factor?: number;
  hasScheme?: boolean;
  schemeDetails?: string;
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  closingStock?: number;
  variants?: ProductVariant[];
  selectedVariantId?: string;
  sku?: string;
  is_focused_product?: boolean;
  focused_type?: string | null;
  focused_due_date?: string | null;
  focused_recurring_config?: any;
  focused_territories?: string[] | null;
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
  is_focused_product?: boolean;
  focused_type?: string | null;
  focused_due_date?: string | null;
  focused_recurring_config?: any;
  focused_territories?: string[] | null;
}
export const OrderEntry = () => {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  const retailerName = searchParams.get("retailer") || "Retailer Name";
  const isPhoneOrder = searchParams.get("phoneOrder") === "true";
  const {
    isCheckInMandatory,
    loading: checkInMandatoryLoading
  } = useCheckInMandatory();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<{
    [key: string]: number;
  }>({});
  const [closingStocks, setClosingStocks] = useState<{
    [key: string]: number;
  }>({});
  const [selectedVariants, setSelectedVariants] = useState<{
    [key: string]: string;
  }>({});
  const [selectedUnits, setSelectedUnits] = useState<{
    [key: string]: string;
  }>({});
  const [orderMode, setOrderMode] = useState<"grid" | "table" | "no-order" | "return-stock">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [noOrderReason, setNoOrderReason] = useState<string>("");
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [products, setProducts] = useState<GridProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [loggedInUserName, setLoggedInUserName] = useState<string>("User");
  const [schemes, setSchemes] = useState<any[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<{
    [key: string]: boolean;
  }>({});
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);

  // Reset auto-expand flag whenever category changes
  useEffect(() => {
    setHasAutoExpanded(false);
  }, [selectedCategory]);

  // Auto-expand first product with variants when products are loaded
  useEffect(() => {
    if (products.length > 0 && !hasAutoExpanded) {
      // Filter products based on selected category
      const productsToCheck = selectedCategory === "All" ? products : products.filter(p => p.category === selectedCategory);
      const firstProductWithVariants = productsToCheck.find(p => p.variants && p.variants.length > 0);
      if (firstProductWithVariants) {
        console.log('Auto-expanding first product with variants:', firstProductWithVariants.name);
        setExpandedProducts({
          [firstProductWithVariants.id]: true
        });
        setHasAutoExpanded(true);
      }
    }
  }, [products, selectedCategory, hasAutoExpanded]);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [currentProductName, setCurrentProductName] = useState<string>("Product");
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [selectedProductForScheme, setSelectedProductForScheme] = useState<GridProduct | null>(null);
  const [filteredSchemes, setFilteredSchemes] = useState<any[]>([]);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [showImageCapture, setShowImageCapture] = useState(false);

  // Function to auto-select "Over Stocked" option
  const handleAutoSelectOverStocked = async () => {
    if (!visitId) return;
    try {
      // First check if there's already a confirmed order for this visit
      const {
        data: existingOrders
      } = await supabase.from('orders').select('id').eq('visit_id', visitId).eq('status', 'confirmed');

      // If an order already exists, don't mark as unproductive
      if (existingOrders && existingOrders.length > 0) {
        console.log('Order already exists for this visit. Not marking as unproductive.');
        return;
      }

      // Only mark as unproductive if no order exists
      const {
        error
      } = await supabase.from('visits').update({
        status: 'unproductive',
        no_order_reason: 'over-stocked'
      }).eq('id', visitId);
      if (error) {
        console.error('Error auto-selecting over stocked:', error);
      } else {
        console.log('Auto-selected "Over Stocked" for visit:', visitId);
      }
    } catch (error) {
      console.error('Error in handleAutoSelectOverStocked:', error);
    }
  };
  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Fetch user profile to get the name
        const {
          data: profile
        } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
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

  // Check if user has started their day when feature is enabled
  useEffect(() => {
    const checkDayStarted = async () => {
      // Skip check if feature is loading or not mandatory
      if (checkInMandatoryLoading || !isCheckInMandatory) {
        return;
      }
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        // Check if user has started their day (attendance check-in)
        const {
          data: attendance,
          error
        } = await supabase.from('attendance').select('check_in_time').eq('user_id', user.id).eq('date', today).maybeSingle();
        if (error) {
          console.error('Error checking attendance:', error);
          return;
        }

        // If no attendance record or no check-in time, redirect to attendance page
        if (!attendance || !attendance.check_in_time) {
          toast({
            title: "Start Your Day First",
            description: "Please start your day from the Attendance page before entering orders.",
            variant: "destructive"
          });
          navigate('/attendance');
        }
      } catch (error) {
        console.error('Error in day start validation:', error);
      }
    };
    checkDayStarted();
  }, [isCheckInMandatory, checkInMandatoryLoading, navigate]);

  // Fix retailerId validation - don't use "." as a valid retailerId  
  const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
  const validVisitId = visitId && visitId.length > 1 ? visitId : null;

  // Use visitId and retailerId from URL params consistently
  const activeStorageKey = validVisitId && validRetailerId ? `order_cart:${validVisitId}:${validRetailerId}` : validRetailerId ? `order_cart:temp:${validRetailerId}` : 'order_cart:fallback';

  // Debug storage keys
  console.log('Storage Debug:', {
    visitId,
    retailerId,
    validVisitId,
    validRetailerId,
    activeStorageKey
  });

  // Load cart and sync quantities - this runs every time we come back to OrderEntry
  useEffect(() => {
    try {
      if (activeStorageKey) {
        const rawUser = localStorage.getItem(activeStorageKey);
        console.log('Loading cart from localStorage:', {
          activeStorageKey,
          rawUser
        });
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
    const newQuantities: {
      [key: string]: number;
    } = {};
    const newStocks: {
      [key: string]: number;
    } = {};
    const newVariants: {
      [key: string]: string;
    } = {};
    console.log('=== Syncing cart data to OrderEntry ===', cartData);
    cartData.forEach(item => {
      console.log('Processing cart item:', {
        id: item.id,
        quantity: item.quantity,
        name: item.name
      });

      // Check if this is a variant item (format: baseId_variant_variantId)
      if (item.id.includes('_variant_')) {
        const parts = item.id.split('_variant_');
        if (parts.length === 2) {
          const baseProductId = parts[0];
          const variantId = parts[1];
          console.log('Found variant item:', {
            baseProductId,
            variantId,
            quantity: item.quantity
          });

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
        console.log('Found base product:', {
          id: item.id,
          quantity: item.quantity
        });
        newQuantities[item.id] = item.quantity;

        // Set stock if available
        if (item.closingStock) {
          newStocks[item.id] = item.closingStock;
        }
      }
    });
    console.log('Applying synced data to OrderEntry state:', {
      newQuantities,
      newStocks,
      newVariants
    });

    // Use functional updates to ensure we get the latest state
    setQuantities(prev => {
      const updated = {
        ...prev,
        ...newQuantities
      };
      console.log('Updated quantities state:', updated);
      return updated;
    });
    setClosingStocks(prev => {
      const updated = {
        ...prev,
        ...newStocks
      };
      console.log('Updated stocks state:', updated);
      return updated;
    });
    setSelectedVariants(prev => {
      const updated = {
        ...prev,
        ...newVariants
      };
      console.log('Updated variants state:', updated);
      return updated;
    });

    // Also update the addedItems set (by base product id) so the green state persists
    const addedBaseIds = new Set<string>();
    cartData.forEach(item => {
      const baseId = item.id.includes('_variant_') ? item.id.split('_variant_')[0] : item.id;
      if ((item.quantity || 0) > 0) addedBaseIds.add(baseId);
    });
    setAddedItems(prev => new Set([...prev, ...Array.from(addedBaseIds)]));
    console.log('Updated addedItems (base product ids):', addedBaseIds);
  };
  useEffect(() => {
    console.log('Saving cart to localStorage:', {
      activeStorageKey,
      cartLength: cart.length,
      cart
    });
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
        setQuantities(prev => ({
          ...prev,
          ...parsedQuantities
        }));
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
        setSelectedVariants(prev => ({
          ...prev,
          ...parsedVariants
        }));
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
        setClosingStocks(prev => ({
          ...prev,
          ...parsedStocks
        }));
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
        console.log('🔄 OrderEntry: Starting to fetch products and categories...');

        // Fetch categories first
        const {
          data: categoriesData,
          error: categoriesError
        } = await supabase.from('product_categories').select('name').order('name');
        if (categoriesError) {
          console.error('❌ Categories Error:', categoriesError);
        }

        // Fetch products with a simpler query
        const {
          data: productsData,
          error: productsError
        } = await supabase.from('products').select('*').eq('is_active', true).order('name');
        if (productsError) {
          console.error('❌ Products Error:', productsError);
          throw productsError;
        }

        // Fetch product categories separately
        const {
          data: productCategoriesData
        } = await supabase.from('product_categories').select('*');

        // Fetch schemes separately  
        const {
          data: schemesData
        } = await supabase.from('product_schemes').select('*').eq('is_active', true);

        // Fetch variants separately
        const {
          data: variantsData
        } = await supabase.from('product_variants').select('*').eq('is_active', true);
        console.log('📊 Categories Response:', categoriesData);
        console.log('🛍️ Products Response:', productsData);
        console.log('🎯 Schemes Response:', schemesData);
        console.log('🎨 Variants Response:', variantsData);
        setCategories(["All", ...(categoriesData || []).map((c: any) => c.name)]);
        console.log('🏷️ Categories set:', ["All", ...(categoriesData || []).map((c: any) => c.name)]);
        const mapped: GridProduct[] = [];
        const allSchemes: any[] = schemesData || [];
        console.log('🔍 Processing products:', productsData?.length || 0);
        (productsData || []).forEach((p: any) => {
          // Find category name
          const categoryData = productCategoriesData?.find(cat => cat.id === p.category_id);

          // Find schemes for this product
          const productSchemes = (schemesData || []).filter((s: any) => s.product_id === p.id && s.is_active && (!s.start_date || new Date(s.start_date) <= new Date()) && (!s.end_date || new Date(s.end_date) >= new Date()));

          // Find variants for this product
          const productVariants = (variantsData || []).filter((v: any) => v.product_id === p.id && v.is_active);
          const baseProduct: GridProduct = {
            id: p.id,
            name: p.name,
            category: categoryData?.name || 'Uncategorized',
            rate: p.rate || 0,
            unit: p.unit || 'piece',
            base_unit: p.base_unit || 'kg',
            conversion_factor: p.conversion_factor || 1,
            hasScheme: productSchemes.length > 0,
            schemeDetails: productSchemes.length > 0 ? productSchemes.map(s => `${s.name}: ${getSchemeDescription(s)}`).join('; ') : undefined,
            closingStock: p.closing_stock || 0,
            is_focused_product: p.is_focused_product || false,
            focused_type: p.focused_type,
            focused_due_date: p.focused_due_date,
            focused_recurring_config: p.focused_recurring_config,
            focused_territories: p.focused_territories,
            variants: productVariants.map((v: any) => ({
              id: v.id,
              variant_name: v.variant_name,
              sku: v.sku,
              price: v.price,
              stock_quantity: v.stock_quantity,
              discount_percentage: v.discount_percentage,
              discount_amount: v.discount_amount,
              is_active: v.is_active,
              is_focused_product: v.is_focused_product || false,
              focused_type: v.focused_type,
              focused_due_date: v.focused_due_date,
              focused_recurring_config: v.focused_recurring_config,
              focused_territories: v.focused_territories
            })),
            sku: p.sku
          };
          mapped.push(baseProduct);
        });
        console.log('✅ Mapped products:', mapped.length, mapped);
        setProducts(mapped);
        setSchemes(allSchemes);
        console.log('🏪 Products state updated with', mapped.length, 'products');
        console.log('🎯 Schemes state updated with', allSchemes.length, 'schemes');
      } catch (error) {
        console.error('💥 Error loading products', error);
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
        console.log('✅ OrderEntry: Finished loading products');
      }
    };
    fetchData();

    // Set up real-time subscriptions for automatic updates
    const channel = supabase.channel('order-entry-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'products'
    }, () => {
      console.log('Product change detected, refreshing...');
      fetchData();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'product_schemes'
    }, () => {
      console.log('Product scheme change detected, refreshing...');
      fetchData();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'product_variants'
    }, () => {
      console.log('Product variant change detected, refreshing...');
      fetchData();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter products by category and search term
  const filteredProducts = products.filter(product => {
    // Category filter
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;

    // Search filter - search in product name, SKU, and variant names
    const matchesSearch = searchTerm.trim() === "" || product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()) || product.variants && product.variants.some(v => v.variant_name.toLowerCase().includes(searchTerm.toLowerCase()) || v.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  console.log('🔍 Filtered products for category', selectedCategory, ':', filteredProducts.length, filteredProducts);
  const handleQuantityChange = (productId: string, quantity: number) => {
    console.log('Quantity changed:', {
      productId,
      quantity
    });

    // Store quantity under the actual productId (could be base or variant)
    setQuantities(prev => {
      const newQuantities = {
        ...prev
      };
      if (quantity > 0) {
        newQuantities[productId] = quantity;
      } else {
        delete newQuantities[productId];
      }

      // Immediately save to localStorage
      const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
      localStorage.setItem(quantityKey, JSON.stringify(newQuantities));
      console.log('Saving quantity for product:', {
        productId,
        quantity,
        newQuantities
      });
      return newQuantities;
    });

    // Update cart if item exists there (use the full productId for cart lookup)
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === productId);
      if (existingItem && quantity > 0) {
        return prevCart.map(item => item.id === productId ? {
          ...item,
          quantity,
          total: item.rate * quantity
        } : item);
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
      const newStocks = {
        ...prev
      };
      if (stock > 0) {
        newStocks[productId] = stock;
      } else {
        delete newStocks[productId];
      }

      // Immediately save to localStorage
      const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
      localStorage.setItem(stockKey, JSON.stringify(newStocks));
      console.log('Saving stock for product:', {
        productId,
        stock,
        newStocks
      });
      return newStocks;
    });
  };
  const handleVariantChange = (productId: string, variantId: string) => {
    setSelectedVariants(prev => {
      const newVariants = {
        ...prev,
        [productId]: variantId
      };
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
        const variantPrice = variant.discount_percentage > 0 ? variant.price - variant.price * variant.discount_percentage / 100 : variant.discount_amount > 0 ? variant.price - variant.discount_amount : variant.price;

        // Check if variant name is "Base variant" or "Base Variant" - if so, just use product name
        const isBaseVariant = variant.variant_name.toLowerCase() === 'base variant';
        const displayName = isBaseVariant ? product.name : `${product.name} - ${variant.variant_name}`;
        return {
          ...product,
          id: `${product.id}_variant_${variant.id}`,
          name: displayName,
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
    const conditionText = scheme.quantity_condition_type === 'more_than' ? `Buy ${scheme.condition_quantity}+ ${scheme.scheme_type === 'buy_get' ? 'items' : 'units'}` : `Buy exactly ${scheme.condition_quantity} ${scheme.scheme_type === 'buy_get' ? 'items' : 'units'}`;
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
    const applicableSchemes = schemes.filter(scheme => scheme.product_id === productId && (scheme.variant_id === variantId || scheme.variant_id === null));
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
      const meetsCondition = scheme.quantity_condition_type === 'more_than' ? safeQuantity >= conditionQty // Changed from > to >=
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
            const schemeDiscount = safeBasePrice * safeQuantity * discountPct / 100;
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

  // Function to save stock data to database
  const saveStockData = async (productId: string, stockQuantity: number, productName: string) => {
    if (!userId || !visitId || !retailerId) return;
    try {
      const {
        error
      } = await supabase.from('stock').upsert({
        user_id: userId,
        retailer_id: retailerId,
        visit_id: visitId,
        product_id: productId,
        product_name: productName,
        stock_quantity: stockQuantity
      }, {
        onConflict: 'user_id,retailer_id,visit_id,product_id'
      });
      if (error) {
        console.error('Error saving stock data:', error);
        toast({
          title: "Stock Save Error",
          description: error?.message ? String(error.message) : "Failed to save stock quantity",
          variant: "destructive"
        });
      } else {
        console.log('Stock saved successfully', {
          productId,
          stockQuantity
        });
      }
    } catch (error: any) {
      console.error('Error saving stock data:', error);
      toast({
        title: "Stock Save Error",
        description: error?.message ? String(error.message) : "Failed to save stock quantity",
        variant: "destructive"
      });
    }
  };
  const addToCart = (product: Product) => {
    // Get the display product (could be variant)
    const displayProduct = getDisplayProduct(product as GridProduct);
    // Use the display product ID for quantity lookup (supports both base and variant quantities)
    const quantity = quantities[displayProduct.id] || 0;
    const stockQuantity = closingStocks[displayProduct.id] || 0;
    console.log('Adding to cart:', {
      originalProductId: product.id,
      displayProductId: displayProduct.id,
      productName: displayProduct.name,
      quantity,
      stockQuantity,
      activeStorageKey
    });

    // Check if only stock is updated without any quantity
    // First check if ANY quantity exists across all products/variants
    const hasAnyQuantity = Object.values(quantities).some(qty => (qty || 0) > 0);
    if (quantity <= 0 && stockQuantity > 0) {
      // Save stock data only
      saveStockData(displayProduct.id, stockQuantity, displayProduct.name);

      // Only auto-select "Over Stocked" if NO quantities are entered anywhere
      if (!hasAnyQuantity) {
        toast({
          title: "Over Stocked - Auto Selected",
          description: `Stock quantity saved for ${displayProduct.name}. Over Stocked reason auto-selected.`
        });
        handleAutoSelectOverStocked();
      } else {
        toast({
          title: "Stock Updated",
          description: `Stock quantity saved for ${displayProduct.name}.`
        });
      }
      return;
    }
    if (quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive"
      });
      return;
    }

    // Apply unit conversion to get correct price
    let effectiveRate = Number(displayProduct.rate);
    const selectedUnit = selectedUnits[product.id] || product.unit || 'kg';

    // Only apply conversion for non-variant products
    if (!displayProduct.id.includes('_variant_') && (product as GridProduct).base_unit) {
      const gridProduct = product as GridProduct;
      const baseUnit = gridProduct.base_unit?.toLowerCase() || 'kg';
      const targetUnit = selectedUnit.toLowerCase();
      let conversionFactor = 1;
      if (baseUnit === 'kg') {
        if (targetUnit === 'grams' || targetUnit === 'gram') {
          conversionFactor = 0.001;
        }
      }
      effectiveRate = effectiveRate * conversionFactor;
    }
    const baseTotal = effectiveRate * Number(quantity);

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
    const {
      totalDiscount,
      freeQuantity
    } = calculateSchemeDiscount(product.id, variantIdForScheme, quantity, effectiveRate);
    const finalTotal = baseTotal - totalDiscount;
    console.log('Scheme discount result:', {
      baseTotal,
      totalDiscount,
      finalTotal
    });
    const cartItem = {
      ...displayProduct,
      quantity,
      total: finalTotal,
      closingStock: closingStocks[displayProduct.id] || displayProduct.closingStock
    };
    const existingItem = cart.find(item => item.id === displayProduct.id);
    if (existingItem) {
      setCart(prev => {
        const newCart = prev.map(item => item.id === displayProduct.id ? {
          ...item,
          quantity,
          total: finalTotal,
          closingStock: cartItem.closingStock
        } : item);
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

    // Save stock data if stock quantity is provided
    if (stockQuantity > 0) {
      saveStockData(displayProduct.id, stockQuantity, displayProduct.name);
    }
    toast({
      title: "Added to Cart",
      description: `${quantity} ${displayProduct.unit}(s) of ${displayProduct.name} added to cart${schemeMessage}${freeMessage}`
    });
  };
  const handleBulkCartUpdate = (items: CartItem[]) => {
    console.log('Bulk update from TableOrderForm:', items);
    // 1) Update cart by replacing quantities/totals for incoming items
    setCart(prev => {
      const newCart = [...prev];
      items.forEach(item => {
        const existingIndex = newCart.findIndex(cartItem => cartItem.id === item.id);
        if (existingIndex >= 0) {
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            quantity: item.quantity,
            total: item.total,
            closingStock: item.closingStock
          };
        } else if (item.quantity > 0) {
          newCart.push(item);
        }
      });
      // Also remove any items that now have zero quantity
      return newCart.filter(ci => ci.quantity > 0);
    });

    // 2) Sync "Current" selection values immediately
    setQuantities(prev => {
      const updated = {
        ...prev
      };
      items.forEach(it => {
        if (it.quantity > 0) {
          updated[it.id] = it.quantity;
        } else {
          delete updated[it.id];
        }
      });
      return updated;
    });

    // 3) Sync closing stock values as well
    setClosingStocks(prev => {
      const updated = {
        ...prev
      } as {
        [key: string]: number;
      };
      items.forEach(it => {
        if (typeof (it as any).closingStock === 'number') {
          updated[it.id] = Number((it as any).closingStock) || 0;
        }
      });
      return updated;
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
    // In table mode, rely on cart snapshot from TableOrderForm for immediate header updates
    if (orderMode === "table") {
      const cartTotal = cart.reduce((sum, item) => sum + (Number(item.total) || Number(item.rate) * Number(item.quantity) || 0), 0);
      return Number(cartTotal) || 0;
    }
    let total = 0;

    // Include all products regardless of category to match cart behavior
    products.forEach(product => {
      // Check base product quantity
      const baseQty = Number(quantities[product.id]) || 0;
      if (baseQty > 0) {
        const productRate = Number(product.rate) || 0;
        const {
          totalDiscount
        } = calculateSchemeDiscount(product.id, null, baseQty, productRate);
        const discountValue = Number(totalDiscount) || 0;
        const subtotal = baseQty * productRate - discountValue;
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
            const variantPrice = discountPct > 0 ? basePrice - basePrice * discountPct / 100 : discountAmt > 0 ? basePrice - discountAmt : basePrice;
            const {
              totalDiscount
            } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
            const discountValue = Number(totalDiscount) || 0;
            const subtotal = variantQty * variantPrice - discountValue;
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
    // In table mode, derive directly from cart snapshot
    if (orderMode === "table") {
      const items = cart.map(ci => {
        const baseId = ci.id.includes('_variant_') ? ci.id.split('_variant_')[0] : ci.id;
        const product = products.find(p => p.id === baseId);
        const savings = Math.max(0, Number(ci.rate) * Number(ci.quantity) - Number(ci.total || 0));
        const appliedOffers: string[] = [];
        if (savings > 0) appliedOffers.push(`Savings: ₹${savings.toFixed(2)}`);
        return {
          id: ci.id,
          variantName: ci.name,
          selectedItem: ci.name,
          quantity: Number(ci.quantity) || 0,
          rate: Number(ci.rate) || 0,
          totalPrice: Number(ci.total) || Number(ci.rate) * Number(ci.quantity) || 0,
          savings,
          appliedOffers,
          unit: product?.unit || 'piece'
        };
      });
      const totalSavings = items.reduce((s, it) => s + (Number(it.savings) || 0), 0);
      return {
        items,
        totalSavings
      };
    }
    const items: any[] = [];
    let totalSavings = 0;
    console.log('Getting selection details with current quantities:', quantities);

    // Include all products regardless of category
    products.forEach(product => {
      // Check base product quantity
      const baseQty = quantities[product.id] || 0;
      if (baseQty > 0) {
        const total = baseQty * product.rate;
        const {
          totalDiscount
        } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
        totalSavings += totalDiscount;
        items.push({
          id: product.id,
          variantName: product.name,
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
          // FIX: use composite id for variant quantities
          const variantCompositeId = `${product.id}_variant_${variant.id}`;
          const variantQty = quantities[variantCompositeId] || 0;
          if (variantQty > 0) {
            const variantPrice = variant.discount_percentage > 0 ? variant.price - variant.price * variant.discount_percentage / 100 : variant.discount_amount > 0 ? variant.price - variant.discount_amount : variant.price;
            const variantSavings = variant.discount_percentage > 0 ? variant.price * variant.discount_percentage / 100 : variant.discount_amount;
            const baseTotal = variantQty * variantPrice;
            const {
              totalDiscount
            } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
            totalSavings += variantSavings * variantQty + totalDiscount;
            const appliedOffers = [] as string[];
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
              rate: variant.price,
              // Use original price, not discounted
              totalPrice: baseTotal - totalDiscount,
              savings: variantSavings * variantQty + totalDiscount,
              appliedOffers
            });
          }
        });
      }
    });
    return {
      items,
      totalSavings
    };
  };

  // Handle adding all selected items to cart
  const handleAddAllToCart = () => {
    const {
      items
    } = getSelectionDetails();
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
      const applicableSchemes = schemes.filter(scheme => scheme.product_id === baseProductId && (scheme.variant_id === variantId || scheme.variant_id === null));

      // Get the active scheme (if any)
      const activeScheme = applicableSchemes.find(scheme => {
        const meetsCondition = scheme.quantity_condition_type === 'more_than' ? item.quantity > scheme.condition_quantity : item.quantity === scheme.condition_quantity;
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
    // setQuantities({};
    // setSelectedVariants({});
    setShowOrderSummary(false);
    toast({
      title: "Cart Updated",
      description: `Cart updated with ${items.length} item(s)`
    });

    // Navigate to cart with current parameters
    const params = new URLSearchParams(searchParams);
    navigate(`/cart?${params.toString()}`);
  };

  // Auto-sync function to update cart with current selections
  const autoSyncCart = () => {
    const {
      items
    } = getSelectionDetails();

    // Create new cart items from current selections
    const newCartItems: CartItem[] = [];
    items.forEach(item => {
      const baseProductId = item.id.split('_')[0];
      const product = products.find(p => p.id === baseProductId);

      // Check if this is a variant or base product
      const isVariant = item.id.includes('_variant_');
      const variantId = isVariant ? item.id.split('_variant_')[1] : null;

      // Find applicable schemes for discount calculation
      const applicableSchemes = schemes.filter(scheme => scheme.product_id === baseProductId && (scheme.variant_id === variantId || scheme.variant_id === null));

      // Get the active scheme (if any)
      const activeScheme = applicableSchemes.find(scheme => {
        const meetsCondition = scheme.quantity_condition_type === 'more_than' ? item.quantity > scheme.condition_quantity : item.quantity === scheme.condition_quantity;
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
    const storageKey = userId && retailerId ? `order_cart:${userId}:${retailerId}` : retailerId ? `order_cart:temp:${retailerId}` : null;
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

  // Auto-expand logic for filtered products when category changes - preserve any already expanded items
  useEffect(() => {
    if (filteredProducts.length > 0) {
      setExpandedProducts(prev => {
        const newExpanded: {
          [key: string]: boolean;
        } = {
          ...prev
        };
        // Initialize keys for current list but don't collapse ones already opened
        filteredProducts.forEach(product => {
          if (newExpanded[product.id] === undefined) {
            newExpanded[product.id] = false;
          }
        });
        return newExpanded;
      });
    }
  }, [selectedCategory, filteredProducts]);

  // Function to handle scheme click
  const handleSchemeClick = (product: GridProduct) => {
    const productSchemes = schemes.filter(scheme => scheme.product_id === product.id && scheme.is_active && (!scheme.start_date || new Date(scheme.start_date) <= new Date()) && (!scheme.end_date || new Date(scheme.end_date) >= new Date()));
    setSelectedProductForScheme(product);
    setFilteredSchemes(productSchemes);
    setShowSchemeModal(true);
  };
  return <div className="min-h-screen bg-background pb-20">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
          <Card className="shadow-card bg-gradient-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-2 sm:px-3 py-2 sm:py-3 gap-2">
              {/* Left side - Back button and title */}
              <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                <Button variant="ghost" size="sm" onClick={() => navigate(isPhoneOrder ? "/my-retailers" : "/visits/retailers")} className="text-primary-foreground hover:bg-primary-foreground/20 p-1.5 sm:p-2 shrink-0">
                  <ArrowLeft size={18} />
                </Button>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <CardTitle className="text-sm sm:text-base font-medium leading-tight truncate">
                    {isPhoneOrder ? t('order.phoneOrderEntry') : t('order.orderEntry')}
                  </CardTitle>
                  <p className="text-[10px] sm:text-xs text-primary-foreground/80 leading-tight truncate">{retailerName}</p>
                </div>
              </div>
              
              {/* Right side - Clear, Cart and Current value */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Clear Form Button */}
                <Button variant="ghost" onClick={clearAllFormData} className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-1 sm:p-1.5 flex flex-col items-center gap-0 min-w-[40px] sm:min-w-[45px]" title="Clear all form data">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-[14px] sm:h-[14px]">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span className="text-[8px] sm:text-[9px] leading-tight">{t('common.delete')}</span>
                </Button>
                
                <Button variant="ghost" onClick={() => navigate(`/cart?visitId=${visitId}&retailerId=${retailerId}&retailer=${encodeURIComponent(retailerName)}${isPhoneOrder ? '&phoneOrder=true' : ''}`)} className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-1.5 sm:p-2 flex flex-col items-center gap-0 min-w-[42px] sm:min-w-[50px] relative">
                  <div className="relative">
                    <ShoppingCart size={14} className="sm:w-4 sm:h-4" />
                    {cart.length > 0 && <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 flex items-center justify-center p-0 text-[9px] sm:text-[10px] bg-destructive text-destructive-foreground rounded-full border-0">
                        {cart.length}
                      </Badge>}
                  </div>
                  <span className="text-[9px] sm:text-[10px] leading-tight">{t('order.cart')}</span>
                </Button>
                <Button variant="ghost" onClick={() => {
                const {
                  items
                } = getSelectionDetails();
                if (items.length > 0) {
                  setShowOrderSummary(true);
                }
              }} className="text-primary-foreground hover:bg-primary-foreground/20 h-auto p-1.5 sm:p-2 min-w-[50px] sm:min-w-[60px]" disabled={getSelectionValue() === 0}>
                  <div className="text-center">
                    <p className="text-[9px] sm:text-[10px] text-primary-foreground/80 leading-tight">Current</p>
                    <p className="text-xs sm:text-sm font-bold leading-tight break-all">₹{getSelectionValue().toLocaleString()}</p>
                  </div>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      <div className="w-full px-2 sm:px-4 space-y-3 pt-24 sm:pt-28">

        {/* Order Mode Toggle */}
        <Card>
          <CardContent className="p-2">
            <div className="space-y-1.5">
              {/* First Row: Grid, Table, AI Stock */}
              <div className="flex gap-1.5">
                <Button variant={orderMode === "grid" ? "default" : "outline"} onClick={() => setOrderMode("grid")} className="flex-1 h-7 text-xs" size="sm">
                  <Grid3X3 size={12} className="mr-0.5" />
                  Grid
                </Button>
                <Button variant={orderMode === "table" ? "default" : "outline"} onClick={() => setOrderMode("table")} className="flex-1 h-7 text-xs" size="sm">
                  <Table size={12} className="mr-0.5" />
                  Table
                </Button>
                <Button variant="outline" onClick={() => setShowImageCapture(true)} className="flex-1 h-7 text-xs" size="sm" title="AI Stock Capture">
                  <Camera size={12} className="mr-0.5" />
                  AI Stock
                </Button>
              </div>
              
              {/* Second Row: Return Stock, No Order */}
              <div className="flex gap-1.5">
                <Button variant={orderMode === "return-stock" ? "default" : "outline"} onClick={() => setOrderMode("return-stock")} className="flex-1 h-7 text-xs" size="sm">
                  <RotateCcw size={12} className="mr-0.5" />
                  Return Stock
                </Button>
                <Button variant={orderMode === "no-order" ? "default" : "outline"} onClick={() => setOrderMode("no-order")} className="flex-1 h-7 text-xs" size="sm">
                  <XCircle size={12} className="mr-0.5" />
                  No Order
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar - Compact */}
        

        {orderMode === "return-stock" ? <>
            {/* Return Stock Section */}
            <ReturnStockForm visitId={visitId} retailerId={retailerId} retailerName={retailerName} onComplete={() => {
          toast({
            title: "Returns Recorded",
            description: "Return stock has been recorded successfully"
          });
          setOrderMode("grid");
        }} />
          </> : orderMode === "no-order" ? <>
            {/* No Order Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select No Order Reason</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[{
              value: "over-stocked",
              label: "Over Stocked",
              description: "Retailer has sufficient inventory",
              icon: Package,
              color: "text-warning"
            }, {
              value: "owner-not-available",
              label: "Owner Not Available",
              description: "Decision maker is not present",
              icon: UserX,
              color: "text-muted-foreground"
            }, {
              value: "store-closed",
              label: "Store Closed",
              description: "Store is temporarily closed",
              icon: DoorClosed,
              color: "text-destructive"
            }, {
              value: "permanently-closed",
              label: "Permanently Closed",
              description: "Store has shut down permanently",
              icon: XCircle,
              color: "text-destructive"
            }].map(reason => {
              const IconComponent = reason.icon;
              return <Card key={reason.value} className={`cursor-pointer transition-all duration-200 hover:shadow-md ${noOrderReason === reason.value ? 'ring-2 ring-primary' : ''}`} onClick={async () => {
                if (reason.value === "over-stocked") {
                  toast({
                    title: "Information",
                    description: "Update stock quantities in Grid/Table view - this option will auto-select",
                    duration: 4000
                  });
                  return;
                }
                setNoOrderReason(reason.value);

                // Save no order reason to database
                if (visitId) {
                  try {
                    const {
                      error
                    } = await supabase.from('visits').update({
                      status: 'unproductive',
                      no_order_reason: reason.value
                    }).eq('id', visitId);
                    if (error) throw error;
                    toast({
                      title: "No Order Marked",
                      description: `Reason: ${reason.label}`
                    });

                    // Navigate back after a short delay
                    setTimeout(() => {
                      navigate("/visits/retailers");
                    }, 1000);
                  } catch (error) {
                    console.error('Error saving no order reason:', error);
                    toast({
                      title: "Error",
                      description: "Failed to save no order reason",
                      variant: "destructive"
                    });
                  }
                }
              }}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <IconComponent className={`size-5 ${reason.color}`} />
                          <div className="flex-1">
                            <h4 className="font-medium text-card-foreground">{reason.label}</h4>
                            <p className="text-sm text-muted-foreground">{reason.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>;
            })}
              </CardContent>
            </Card>
          </> : orderMode === "grid" ? <>
            {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-3 w-full">
            {categories.slice(0, 3).map(category => <TabsTrigger key={category} value={category} className="text-xs">
                {category}
              </TabsTrigger>)}
          </TabsList>
          <TabsList className="grid grid-cols-3 w-full mt-2">
            {categories.slice(3).map(category => <TabsTrigger key={category} value={category} className="text-xs">
                {category}
              </TabsTrigger>)}
          </TabsList>
        </Tabs>

        {/* Single Column Layout */}
        <div className="space-y-3">
          {/* Products Grid */}
          <div className="space-y-3">
          {loading ? <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading products...</p>
            </div> : filteredProducts.length === 0 ? <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedCategory === "All" ? "No products available" : `No products in ${selectedCategory} category`}
              </p>
            </div> : filteredProducts.map(product => {
              const displayProduct = getDisplayProduct(product);
              const savingsAmount = getSavingsAmount(product);
              return <Card key={product.id} className="relative">
                {/* Only show scheme button for products with active schemes */}
                {product.hasScheme && <div className="absolute -top-2 -right-2 z-20">
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:scale-105 text-white text-xs px-2 py-1 cursor-pointer transition-all duration-200 shadow-lg border-2 border-white" onClick={() => handleSchemeClick(product)}>
                      <Gift size={10} className="mr-1" />
                      Scheme
                    </Badge>
                  </div>}
                
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm cursor-pointer text-primary hover:underline flex items-center gap-1.5" onClick={() => {
                        // Close all other products and open this one
                        setExpandedProducts({
                          [product.id]: true
                        });
                      }}>
                        {isFocusedProductActive(product) && (
                          <Star size={14} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
                        )}
                        {product.hasScheme && (
                          <Sparkles size={14} className="fill-orange-500 text-orange-500 flex-shrink-0" />
                        )}
                        <span className="flex-1">{product.name}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                      {displayProduct.sku && <p className="text-xs text-blue-600 font-mono">SKU: {displayProduct.sku}</p>}
                      <p className="text-base font-bold text-primary">
                        Total: ₹{(() => {
                          let total = 0;

                          // Calculate base product total
                          const baseQty = quantities[product.id] || 0;
                          if (baseQty > 0) {
                            const {
                              totalDiscount
                            } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
                            total += baseQty * product.rate - totalDiscount;
                          }

                          // Calculate all variant totals using composite IDs
                          if (product.variants) {
                            product.variants.forEach(variant => {
                              const variantCompositeId = `${product.id}_variant_${variant.id}`;
                              const variantQty = quantities[variantCompositeId] || 0;
                              if (variantQty > 0) {
                                const variantPrice = variant.discount_percentage > 0 ? variant.price - variant.price * variant.discount_percentage / 100 : variant.discount_amount > 0 ? variant.price - variant.discount_amount : variant.price;
                                const {
                                  totalDiscount
                                } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
                                total += variantQty * variantPrice - totalDiscount;
                              }
                            });
                          }
                          return total > 0 ? total.toLocaleString() : "0";
                        })()}
                      </p>
                      
                      {savingsAmount > 0 && <p className="text-xs text-green-600 font-semibold">
                          You save ₹{savingsAmount.toFixed(2)}
                        </p>}
                    </div>
                    
                  </div>

                  {/* Variant Grid */}
                  {product.variants && product.variants.length > 0 && <div className="mb-3">
                      <Collapsible open={expandedProducts[product.id]} onOpenChange={open => {
                      setExpandedProducts(prev => ({
                        ...prev,
                        [product.id]: open
                      }));
                    }}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between mb-2 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                            <label className="text-xs text-muted-foreground">Available Variants</label>
                            <div className="flex items-center">
                              {expandedProducts[product.id] ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 grid grid-cols-5 gap-1 p-2 text-xs font-medium">
                            <div>Variant</div>
                            <div>Rate</div>
                            <div>Unit</div>
                            <div>Qty</div>
                            <div>Stock</div>
                          </div>
                          
                          {/* Base Product Row */}
                          <div className="grid grid-cols-5 gap-1 p-2 text-xs border-t">
                            <div className="text-xs flex items-center gap-1">
                              {isFocusedProductActive(product) && (
                                <Star size={12} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
                              )}
                              {product.hasScheme && (
                                <Sparkles size={12} className="fill-orange-500 text-orange-500 flex-shrink-0" />
                              )}
                              <span>{product.name}</span>
                            </div>
                            <div className="font-medium">
                              {(() => {
                                const selectedUnit = selectedUnits[product.id] || product.unit || 'kg';
                                const baseUnit = product.base_unit?.toLowerCase() || 'kg';
                                const targetUnit = selectedUnit.toLowerCase();
                                let conversionFactor = 1;
                                if (baseUnit === 'kg') {
                                  if (targetUnit === 'grams' || targetUnit === 'gram') {
                                    conversionFactor = 0.001;
                                  }
                                }
                                const pricePerUnit = product.rate * conversionFactor;
                                return conversionFactor !== 1 ? <div className="flex flex-col">
                                    <span>₹{pricePerUnit.toFixed(2)}</span>
                                    <span className="text-[9px] text-muted-foreground">
                                      (₹{product.rate.toFixed(2)}/{baseUnit})
                                    </span>
                                  </div> : `₹${product.rate % 1 === 0 ? product.rate.toString() : product.rate.toFixed(2)}`;
                              })()}
                            </div>
                            <div>
                              <Select value={selectedUnits[product.id] || product.unit || 'kg'} onValueChange={value => {
                                setSelectedUnits(prev => ({
                                  ...prev,
                                  [product.id]: value
                                }));
                              }}>
                                <SelectTrigger className="h-6 text-xs p-1 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="kg">kg</SelectItem>
                                  <SelectItem value="grams">grams</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Input type="number" placeholder="0" value={quantities[product.id] || ""} onChange={e => {
                                console.log('Base product quantity change:', product.id, e.target.value);
                                const qty = parseInt(e.target.value) || 0;
                                handleQuantityChange(product.id, qty);
                                if (qty > 0) {
                                  handleVariantChange(product.id, "base");
                                }
                              }} className="h-6 text-xs p-1" min="0" disabled={false} />
                            </div>
                             <div>
                               <Input type="number" placeholder="0" value={(() => {
                                const stock = closingStocks[product.id] ?? product.closingStock;
                                return stock === 0 ? "" : stock;
                              })()} onChange={e => {
                                const value = e.target.value;
                                handleClosingStockChange(product.id, value === "" ? "0" : value);
                              }} onFocus={e => {
                                if (e.target.value === "0" || e.target.value === "") {
                                  e.target.select();
                                }
                              }} className={`h-6 text-xs p-1 ${(() => {
                                const stock = closingStocks[product.id] ?? product.closingStock;
                                return stock === 0 ? "text-muted-foreground" : "";
                              })()}`} min="0" />
                             </div>
                          </div>

                           {/* Variant Rows */}
                           {product.variants.map(variant => {
                            const variantPrice = variant.discount_percentage > 0 ? variant.price - variant.price * variant.discount_percentage / 100 : variant.discount_amount > 0 ? variant.price - variant.discount_amount : variant.price;
                            const savings = variant.discount_percentage > 0 ? variant.price * variant.discount_percentage / 100 : variant.discount_amount;
                            const variantCompositeId = `${product.id}_variant_${variant.id}`;
                            const variantQuantity = quantities[variantCompositeId] || 0;
                            const variantAmount = variantQuantity * variantPrice;

                            // Check if this variant has a scheme applied specifically to it
                            const hasVariantScheme = schemes.some(scheme => scheme.product_id === product.id && scheme.variant_id === variant.id && scheme.is_active && (!scheme.start_date || new Date(scheme.start_date) <= new Date()) && (!scheme.end_date || new Date(scheme.end_date) >= new Date()));

                            // Get variant-specific schemes
                            const variantSchemes = schemes.filter(scheme => scheme.product_id === product.id && scheme.variant_id === variant.id && scheme.is_active && (!scheme.start_date || new Date(scheme.start_date) <= new Date()) && (!scheme.end_date || new Date(scheme.end_date) >= new Date()));
                            return <div key={variant.id} className={`grid grid-cols-4 gap-1 p-2 text-xs border-t ${hasVariantScheme ? 'bg-green-50 border-green-200' : ''}`}>
                                 <div className="text-xs flex items-center gap-1">
                                   {isFocusedProductActive(variant) && (
                                     <Star size={12} className="fill-yellow-500 text-yellow-500 flex-shrink-0" />
                                   )}
                                   {hasVariantScheme && (
                                     <Sparkles size={12} className="fill-orange-500 text-orange-500 flex-shrink-0" />
                                   )}
                                   <div>
                                     <div>{variant.variant_name}</div>
                                     {variantSchemes.length > 0 && <div className="text-orange-500 font-medium mt-1">
                                         {variantSchemes.map(scheme => scheme.description).join(', ')}
                                       </div>}
                                   </div>
                                 </div>
                                 <div className="font-medium">₹{variantPrice % 1 === 0 ? variantPrice.toString() : variantPrice.toFixed(2)}</div>
                                <div>
                                  <Input type="number" placeholder="0" value={variantQuantity || ""} onChange={e => {
                                  const qty = parseInt(e.target.value) || 0;
                                  const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                  handleQuantityChange(variantCompositeId, qty);
                                  if (qty > 0) {
                                    handleVariantChange(product.id, variant.id);
                                  }
                                }} className="h-6 text-xs p-1" min="0" />
                                </div>
                                 <div>
                                   <Input type="number" placeholder="0" value={(() => {
                                  const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                  const stock = closingStocks[variantCompositeId] ?? variant.stock_quantity;
                                  return stock === 0 ? "" : stock;
                                })()} onChange={e => {
                                  const value = e.target.value;
                                  const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                  handleClosingStockChange(variantCompositeId, value === "" ? "0" : value);
                                }} onFocus={e => {
                                  if (e.target.value === "0" || e.target.value === "") {
                                    e.target.select();
                                  }
                                }} className={`h-6 text-xs p-1 ${(() => {
                                  const variantCompositeId = `${product.id}_variant_${variant.id}`;
                                  const stock = closingStocks[variantCompositeId] ?? variant.stock_quantity;
                                  return stock === 0 ? "text-muted-foreground" : "";
                                })()}`} min="0" />
                                </div>
                              </div>;
                          })}
                         </div>
                        </CollapsibleContent>
                      </Collapsible>
                      </div>}

                   {/* Simple table for products without variants */}
                   {(!product.variants || product.variants.length === 0) && <div className="mb-3">
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
                             <Input type="number" placeholder="0" value={quantities[product.id] || ""} onChange={e => {
                            const qty = parseInt(e.target.value) || 0;
                            handleQuantityChange(product.id, qty);
                          }} className="h-6 text-xs p-1" min="0" />
                           </div>
                           <div>
                             <Input type="number" placeholder="0" value={(() => {
                            const stock = closingStocks[product.id] ?? product.closingStock;
                            return stock === 0 ? "" : stock;
                          })()} onChange={e => {
                            const value = e.target.value;
                            handleClosingStockChange(product.id, value === "" ? "0" : value);
                          }} onFocus={e => {
                            if (e.target.value === "0" || e.target.value === "") {
                              e.target.select();
                            }
                          }} className={`h-6 text-xs p-1 ${(() => {
                            const stock = closingStocks[product.id] ?? product.closingStock;
                            return stock === 0 ? "text-muted-foreground" : "";
                          })()}`} min="0" />
                            </div>
                          </div>
                        </div>
                      </div>}

                    {/* Add to Cart Button - unified for both variants and non-variants */}
                    <div className="mt-3">
                      <Button onClick={() => {
                      if (product.variants && product.variants.length > 0) {
                        // Handle products with variants
                        const selectedItems = [];
                        const stockOnlyItems = [];
                        let totalQtyForProduct = 0;

                        // Check base product quantity and stock
                        const baseQty = quantities[product.id] || 0;
                        const baseStock = closingStocks[product.id] || 0;
                        if (baseQty > 0) {
                          const baseTotal = baseQty * product.rate;
                          const {
                            totalDiscount
                          } = calculateSchemeDiscount(product.id, null, baseQty, product.rate);
                          const finalTotal = baseTotal - totalDiscount;
                          selectedItems.push({
                            ...product,
                            quantity: baseQty,
                            total: finalTotal,
                            closingStock: baseStock || product.closingStock
                          });
                          totalQtyForProduct += baseQty;
                        } else if (baseStock > 0) {
                          // Only stock, no quantity
                          stockOnlyItems.push({
                            id: product.id,
                            name: product.name,
                            stock: baseStock
                          });
                        }

                        // Check all variant quantities and stocks for this product
                        product.variants.forEach(variant => {
                          const variantCompositeId = `${product.id}_variant_${variant.id}`;
                          const variantQty = quantities[variantCompositeId] || 0;
                          const variantStock = closingStocks[variantCompositeId] || 0;
                          if (variantQty > 0) {
                            const variantPrice = variant.discount_percentage > 0 ? variant.price - variant.price * variant.discount_percentage / 100 : variant.discount_amount > 0 ? variant.price - variant.discount_amount : variant.price;
                            const baseTotal = variantQty * variantPrice;
                            const {
                              totalDiscount
                            } = calculateSchemeDiscount(product.id, variant.id, variantQty, variantPrice);
                            const finalTotal = baseTotal - totalDiscount;
                            selectedItems.push({
                              id: `${product.id}_variant_${variant.id}`,
                              name: `${product.name} - ${variant.variant_name}`,
                              category: product.category,
                              rate: variantPrice,
                              unit: product.unit,
                              quantity: variantQty,
                              total: finalTotal,
                              closingStock: variantStock || variant.stock_quantity
                            });
                            totalQtyForProduct += variantQty;
                          } else if (variantStock > 0) {
                            // Only stock, no quantity
                            stockOnlyItems.push({
                              id: `${product.id}_variant_${variant.id}`,
                              name: `${product.name} - ${variant.variant_name}`,
                              stock: variantStock
                            });
                          }
                        });

                        // Handle stock-only items (save to database only)
                        if (stockOnlyItems.length > 0) {
                          stockOnlyItems.forEach(item => {
                            saveStockData(item.id, item.stock, item.name);
                          });
                        }

                        // Handle cart items (quantity > 0)
                        if (selectedItems.length > 0) {
                          selectedItems.forEach(item => {
                            const existingItem = cart.find(cartItem => cartItem.id === item.id);
                            if (existingItem) {
                              // Replace existing item with new quantity
                              setCart(prev => prev.map(cartItem => cartItem.id === item.id ? {
                                ...cartItem,
                                quantity: item.quantity,
                                total: item.total,
                                closingStock: item.closingStock
                              } : cartItem));
                            } else {
                              // Add new item
                              setCart(prev => [...prev, item]);
                            }

                            // Save stock data if stock quantity is provided
                            if (item.closingStock > 0) {
                              saveStockData(item.id, item.closingStock, item.name);
                            }
                          });
                        }

                        // Show appropriate toast message
                        if (selectedItems.length > 0 && stockOnlyItems.length > 0) {
                          toast({
                            title: "Updated",
                            description: `${totalQtyForProduct} item(s) added to cart and stock quantities saved for ${stockOnlyItems.length} item(s)`
                          });
                        } else if (selectedItems.length > 0) {
                          toast({
                            title: "Added to Cart",
                            description: `${product.name}: ${totalQtyForProduct} item(s) added to cart`
                          });
                        } else if (stockOnlyItems.length > 0) {
                          // Check if ANY quantity exists across all products/variants
                          const hasAnyQuantity = Object.values(quantities).some(qty => (qty || 0) > 0);
                          if (!hasAnyQuantity) {
                            toast({
                              title: "Over Stocked - Auto Selected",
                              description: `Stock quantities saved for ${stockOnlyItems.length} item(s) of ${product.name}. Over Stocked reason auto-selected.`
                            });
                            // Auto-select "Over Stocked" option
                            handleAutoSelectOverStocked();
                          } else {
                            toast({
                              title: "Stock Updated",
                              description: `Stock quantities saved for ${stockOnlyItems.length} item(s) of ${product.name}.`
                            });
                          }
                        }
                      } else {
                        // Handle single products without variants
                        addToCart(product);
                      }

                      // Mark item as added and keep it in the set (persistent state)
                      setAddedItems(prev => new Set([...prev, product.id]));
                    }} className={`w-full h-8 text-xs transition-all duration-300 ${addedItems.has(product.id) ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`} disabled={(() => {
                      if (product.variants && product.variants.length > 0) {
                        // Check if base product has quantity or stock
                        const baseQty = quantities[product.id] || 0;
                        const baseStock = closingStocks[product.id] || 0;
                        const hasValidBase = baseQty > 0 || baseStock > 0;

                        // Check if any variant has quantity or stock
                        const hasValidVariant = product.variants.some(v => {
                          const variantCompositeId = `${product.id}_variant_${v.id}`;
                          const variantQty = quantities[variantCompositeId] || 0;
                          const variantStock = closingStocks[variantCompositeId] || 0;
                          return variantQty > 0 || variantStock > 0;
                        });
                        // Button is enabled if either quantity OR stock exists
                        return !hasValidBase && !hasValidVariant;
                      } else {
                        // For single products - enable if either quantity OR stock exists
                        const displayProduct = getDisplayProduct(product);
                        const qty = quantities[displayProduct.id] || 0;
                        const stock = closingStocks[displayProduct.id] || 0;
                        return qty <= 0 && stock <= 0;
                      }
                    })()}>
                         {addedItems.has(product.id) ? <>
                             <Check className="w-3 h-3 mr-1" />
                             Added
                           </> : <>
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
                           </>}
                       </Button>
                      </div>
                  </CardContent>
               </Card>;
            })}
           </div>

        </div>
        </> : (/* Table Order Form */
      <TableOrderForm onCartUpdate={handleBulkCartUpdate} />)}

        
        {/* Order Summary Modal */}
        <OrderSummaryModal isOpen={showOrderSummary} onClose={() => setShowOrderSummary(false)} items={getSelectionDetails().items} totalAmount={getSelectionValue()} totalSavings={getSelectionDetails().totalSavings} onAddToCart={handleAddAllToCart} productName={currentProductName} />
        
        {/* Scheme Details Modal */}
        <SchemeDetailsModal isOpen={showSchemeModal} onClose={() => setShowSchemeModal(false)} productName={selectedProductForScheme?.name || "Product"} schemes={filteredSchemes} />

        {/* Image Stock Capture Modal */}
        <ImageStockCapture isOpen={showImageCapture} onClose={() => setShowImageCapture(false)} onApprove={async stockCounts => {
        try {
          const {
            data: {
              user
            }
          } = await supabase.auth.getUser();
          if (!user) {
            toast({
              title: 'Not signed in',
              description: 'Please sign in and try again',
              variant: 'destructive'
            });
            return;
          }
          const today = new Date().toISOString().split('T')[0];

          // Enhanced matching: Match detected products with local products by ID or name
          const matchedStockUpdates: {
            [key: string]: number;
          } = {};
          const databaseRecords: any[] = [];
          console.log('🔍 Processing AI detected stock counts:', stockCounts);
          console.log('📦 Available products:', products.map(p => ({
            id: p.id,
            name: p.name,
            variants: p.variants?.length || 0
          })));
          stockCounts.forEach(({
            productId,
            productName,
            count
          }) => {
            // Try to find product by ID first
            let matchedProduct = products.find(p => p.id === productId);

            // If not found by ID, try to match by name (case-insensitive and partial match)
            if (!matchedProduct && productName) {
              const searchName = productName.toLowerCase().trim();
              matchedProduct = products.find(p => {
                const pName = p.name.toLowerCase().trim();
                // Match if product name contains the detected name OR detected name contains product name
                return pName.includes(searchName) || searchName.includes(pName);
              });
              console.log(`🔎 Matching by name for "${productName}":`, matchedProduct?.name || 'No match');
            }
            if (matchedProduct) {
              console.log(`✅ Matched product:`, {
                id: matchedProduct.id,
                name: matchedProduct.name,
                count
              });

              // Update stock for the matched product
              if (matchedProduct.variants && matchedProduct.variants.length > 0) {
                // Has variants - update all variants with the same stock count
                matchedProduct.variants.forEach(variant => {
                  const variantCompositeId = `${matchedProduct.id}_variant_${variant.id}`;
                  matchedStockUpdates[variantCompositeId] = count;
                  console.log(`📝 Updated variant stock: ${variantCompositeId} = ${count}`);
                });

                // Also update base product stock
                matchedStockUpdates[matchedProduct.id] = count;
              } else {
                // No variants - update base product
                matchedStockUpdates[matchedProduct.id] = count;
                console.log(`📝 Updated base product stock: ${matchedProduct.id} = ${count}`);
              }

              // Create database record
              databaseRecords.push({
                user_id: user.id,
                retailer_id: retailerId,
                visit_id: visitId,
                product_id: matchedProduct.id,
                product_name: matchedProduct.name,
                stock_quantity: count,
                ordered_quantity: 0,
                visit_date: today
              });
            } else {
              console.warn(`⚠️ Could not match detected product: "${productName || productId}"`);
            }
          });
          console.log('📊 Final stock updates to apply:', matchedStockUpdates);

          // Save to database
          if (databaseRecords.length > 0) {
            const {
              error: insertError
            } = await supabase.from('stock_cycle_data').insert(databaseRecords);
            if (insertError) {
              console.error('Database insert error:', insertError);
              throw insertError;
            }
            console.log('✅ Saved to database:', databaseRecords.length, 'records');
          }

          // Update local state for immediate UI feedback
          setClosingStocks(prev => {
            const updated = {
              ...prev,
              ...matchedStockUpdates
            };
            console.log('📦 Updated closingStocks state:', updated);
            return updated;
          });

          // Also save to localStorage for persistence
          const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
          const existingStocks = JSON.parse(localStorage.getItem(stockKey) || '{}');
          const mergedStocks = {
            ...existingStocks,
            ...matchedStockUpdates
          };
          localStorage.setItem(stockKey, JSON.stringify(mergedStocks));
          console.log('💾 Saved to localStorage:', mergedStocks);
          const matchedCount = Object.keys(matchedStockUpdates).length;
          if (matchedCount > 0) {
            toast({
              title: 'Stock Updated Successfully',
              description: `Updated stock for ${matchedCount} item${matchedCount === 1 ? '' : 's'}. Check "Stock Qty" column in the order form.`,
              duration: 5000
            });
          } else {
            toast({
              title: 'No Products Matched',
              description: 'Could not match detected products with available products. Please check product names.',
              variant: 'destructive',
              duration: 5000
            });
          }
          console.log('✅ Stock update complete. Matched products:', matchedCount);
        } catch (e: any) {
          console.error('Error saving stock records:', e);
          toast({
            title: 'Failed to update stock',
            description: e?.message || 'Please try again',
            variant: 'destructive'
          });
        } finally {
          setShowImageCapture(false);
        }
      }} />
      </div>
    </div>;
};