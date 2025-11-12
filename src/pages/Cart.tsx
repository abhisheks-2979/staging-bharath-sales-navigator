
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Gift, ShoppingCart, Eye, Camera } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { CartItemDetail } from "@/components/CartItemDetail";
import { CameraCapture } from "@/components/CameraCapture";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  base_unit?: string;
  quantity: number;
  total: number;
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  schemes?: Array<{ is_active: boolean; condition_quantity?: number; discount_percentage?: number }>;
}

type AnyCartItem = CartItem;

// Unit conversion helper - matches TableOrderForm logic
const normalizeUnit = (u?: string) => (u || "").toLowerCase().replace(/\./g, "").trim();
const getDisplayRate = (item: CartItem) => {
  const baseRate = Number(item.rate) || 0;
  const baseUnit = normalizeUnit(item.base_unit || item.unit);
  const targetUnit = normalizeUnit(item.unit);

  if (!baseUnit || !item.base_unit) return baseRate;

  // KG ↔ Gram conversions
  if (baseUnit === "kg" || baseUnit === "kilogram" || baseUnit === "kilograms") {
    if (["gram", "grams", "g", "gm"].includes(targetUnit)) return baseRate / 1000;
    if (targetUnit === "kg") return baseRate;
  } else if (["g", "gm", "gram", "grams"].includes(baseUnit)) {
    if (targetUnit === "kg") return baseRate * 1000;
    if (["g", "gm", "gram", "grams"].includes(targetUnit)) return baseRate;
  }

  return baseRate;
};

// Currency formatter that truncates to 2 decimals (no rounding)
const formatINRTrunc2 = (value: number) => {
  const num = Number(value) || 0;
  const truncated = Math.floor(num * 100) / 100;
  return truncated.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const Cart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  const retailerName = searchParams.get("retailer") || "Retailer Name";
  const isPhoneOrder = searchParams.get("phoneOrder") === "true";

  // Fetch and cache schemes from database
  const [allSchemes, setAllSchemes] = React.useState<any[]>([]);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [loggedInUserName, setLoggedInUserName] = React.useState<string>("User");
  const [visitDate, setVisitDate] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<CartItem | null>(null);
  const [showItemDetail, setShowItemDetail] = React.useState(false);
  const [pendingAmountFromPrevious, setPendingAmountFromPrevious] = React.useState<number>(0);
  
  // New payment flow state
  const [paymentType, setPaymentType] = React.useState<"" | "full" | "partial" | "credit">("");
  const [paymentMethod, setPaymentMethod] = React.useState<"" | "cash" | "cheque" | "upi">("");
  const [partialAmount, setPartialAmount] = React.useState<string>("");
  const [chequePhotoUrl, setChequePhotoUrl] = React.useState<string>("");
  const [upiPhotoUrl, setUpiPhotoUrl] = React.useState<string>("");
  const [isCameraOpen, setIsCameraOpen] = React.useState(false);
  const [cameraMode, setCameraMode] = React.useState<"cheque" | "upi">("cheque");
  
  // Fix retailerId validation - don't use "." as a valid retailerId  
  const validRetailerId = retailerId && retailerId !== '.' && retailerId.length > 1 ? retailerId : null;
  const validVisitId = visitId && visitId.length > 1 ? visitId : null;

  // Use visitId and retailerId from URL params consistently (same as Order Entry)
  const activeStorageKey = validVisitId && validRetailerId 
    ? `order_cart:${validVisitId}:${validRetailerId}`
    : validRetailerId 
      ? `order_cart:temp:${validRetailerId}`
      : 'order_cart:fallback';

  console.log('Cart Storage Debug:', { visitId, retailerId, validVisitId, validRetailerId, activeStorageKey });

  React.useEffect(() => {
    const fetchSchemes = async () => {
      const { data } = await supabase
        .from('product_schemes')
        .select(`
          *,
          products(name),
          product_variants(variant_name)
        `)
        .eq('is_active', true);
      
      if (data) {
        setAllSchemes(data);
      }
    };
    
    fetchSchemes();

    // Fetch pending amount for this retailer
    const fetchPendingAmount = async () => {
      if (!validRetailerId) return;
      const { data } = await supabase
        .from('retailers')
        .select('pending_amount')
        .eq('id', validRetailerId)
        .single();
      setPendingAmountFromPrevious(Number(data?.pending_amount ?? 0));
    };

    fetchPendingAmount();
  }, [validRetailerId]);

const getItemScheme = (item: AnyCartItem) => {
    try {
      // First check if item has pre-calculated scheme data
      const active = item.schemes?.find(s => s.is_active);
      if (active) {
        return {
          condition: active.condition_quantity ? Number(active.condition_quantity) : undefined,
          discountPct: active.discount_percentage ? Number(active.discount_percentage) : undefined,
        };
      }

      // Then check from database schemes by matching product name
      const matchingScheme = allSchemes.find(scheme => {
        if (!scheme || !scheme.is_active) return false;
        
        const productName = scheme.products?.name;
        if (!productName || !item.name) return false;
        
        // Simple name matching to avoid complex logic
        const nameMatches = item.name.toLowerCase().includes(productName.toLowerCase()) ||
                           productName.toLowerCase().includes(item.name.toLowerCase());
        
        return nameMatches;
      });

      if (matchingScheme) {
        return {
          condition: matchingScheme.condition_quantity ? Number(matchingScheme.condition_quantity) : undefined,
          discountPct: matchingScheme.discount_percentage ? Number(matchingScheme.discount_percentage) : undefined,
        };
      }

      // Fallback to item's own scheme data
      return {
        condition: item.schemeConditionQuantity ? Number(item.schemeConditionQuantity) : undefined,
        discountPct: item.schemeDiscountPercentage ? Number(item.schemeDiscountPercentage) : undefined,
      };
    } catch (error) {
      console.error('Error in getItemScheme:', error);
      return { condition: undefined, discountPct: undefined };
    }
  };

const computeItemSubtotal = (item: AnyCartItem) => {
  try {
    if (!item || !item.rate || !item.quantity) return 0;
    const displayRate = getDisplayRate(item);
    return Number(displayRate) * Number(item.quantity);
  } catch (error) {
    console.error('Error computing subtotal:', error);
    return 0;
  }
};

const computeItemDiscount = (item: AnyCartItem) => {
  try {
    if (!item || !item.quantity) return 0;
    
    const { condition, discountPct } = getItemScheme(item);
    
    if (condition && discountPct && Number(item.quantity) >= condition) {
      const subtotal = computeItemSubtotal(item);
      const discount = (subtotal * discountPct) / 100;
      return Math.max(0, discount); // Ensure non-negative
    }
    return 0;
  } catch (error) {
    console.error('Error computing discount:', error);
    return 0;
  }
};

const computeItemTotal = (item: AnyCartItem) => {
  try {
    if (!item) return 0;
    const subtotal = computeItemSubtotal(item);
    const discount = computeItemDiscount(item);
    return Math.max(0, subtotal - discount); // Ensure non-negative
  } catch (error) {
    console.error('Error computing total:', error);
    return 0;
  }
};



React.useEffect(() => {
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

// Fetch visit date if visitId is available
React.useEffect(() => {
  if (visitId) {
    supabase
      .from('visits')
      .select('planned_date')
      .eq('id', visitId)
      .single()
      .then(({ data }) => {
        if (data) {
          setVisitDate(data.planned_date);
        }
      });
  }
}, [visitId]);

// Load cart items from localStorage with proper refresh handling
React.useEffect(() => {
  const loadCartItems = () => {
    console.log('Cart Debug - Loading cart items:', { userId, retailerId, validRetailerId, activeStorageKey });
    try {
      const rawData = localStorage.getItem(activeStorageKey);
      if (rawData && rawData !== 'undefined' && rawData !== 'null') {
        const parsedItems = JSON.parse(rawData);
        // Validate parsed items are an array
        if (Array.isArray(parsedItems)) {
          console.log('Setting cart items:', parsedItems);
          setCartItems(parsedItems);
        } else {
          console.warn('Cart data is not an array, resetting cart');
          setCartItems([]);
        }
      } else {
        console.log('No cart data found, cart will be empty');
        setCartItems([]);
      }
    } catch (error) {
      console.error('Error loading cart items:', error);
      // Clear corrupted data
      localStorage.removeItem(activeStorageKey);
      setCartItems([]);
    }
  };

  loadCartItems();
  
  // Also listen for storage changes (when updated from OrderEntry)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === activeStorageKey) {
      loadCartItems();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, [activeStorageKey]);

React.useEffect(() => {
  localStorage.setItem(activeStorageKey, JSON.stringify(cartItems));
}, [cartItems, activeStorageKey]);

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    // Also remove from OrderEntry quantities
    updateOrderEntryQuantities(productId, 0);
    toast({
      title: "Item Removed",
      description: "Item removed from cart"
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      // Also update the quantities storage for OrderEntry sync
      updateOrderEntryQuantities(productId, 0);
      return;
    }

    setCartItems(prev => prev.map(item => {
      if (item.id === productId) {
        const updatedItem = { ...item, quantity: newQuantity };
        
        // Remove pre-calculated total so schemes are recalculated based on new quantity
        delete updatedItem.total;
        
        console.log('Updating quantity for:', updatedItem.name, 'New quantity:', newQuantity, 'Schemes will be recalculated');
        
        // Update OrderEntry quantities storage - make sure to sync correctly
        updateOrderEntryQuantities(productId, newQuantity);
        
        return updatedItem;
      }
      return item;
    }));
  };

  // Function to update OrderEntry quantities storage
  const updateOrderEntryQuantities = (productId: string, quantity: number) => {
    const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
    const existingQuantities = localStorage.getItem(quantityKey);
    
    try {
      const quantities = existingQuantities ? JSON.parse(existingQuantities) : {};
      if (quantity > 0) {
        quantities[productId] = quantity;
      } else {
        delete quantities[productId];
      }
      localStorage.setItem(quantityKey, JSON.stringify(quantities));
      console.log('Updated OrderEntry quantities:', { productId, quantity, allQuantities: quantities });
    } catch (error) {
      console.error('Error updating OrderEntry quantities:', error);
    }
  };

  const getSubtotal = () => {
    try {
      return cartItems.reduce((sum, item) => {
        if (!item) return sum;
        return sum + computeItemSubtotal(item);
      }, 0);
    } catch (error) {
      console.error('Error computing subtotal:', error);
      return 0;
    }
  };
  
  const getDiscount = () => {
    try {
      return cartItems.reduce((sum, item) => {
        if (!item) return sum;
        return sum + computeItemDiscount(item);
      }, 0);
    } catch (error) {
      console.error('Error computing discount:', error);
      return 0;
    }
  };
  
  const getAmountAfterDiscount = () => {
    try {
      const subtotal = getSubtotal();
      const discount = getDiscount();
      return Math.max(0, subtotal - discount);
    } catch (error) {
      console.error('Error computing amount after discount:', error);
      return 0;
    }
  };

  const getCGST = () => {
    const amountAfterDiscount = getAmountAfterDiscount();
    return (amountAfterDiscount * 2.5) / 100; // 2.5% CGST
  };

  const getSGST = () => {
    const amountAfterDiscount = getAmountAfterDiscount();
    return (amountAfterDiscount * 2.5) / 100; // 2.5% SGST
  };

  const getFinalTotal = () => {
    try {
      const amountAfterDiscount = getAmountAfterDiscount();
      const cgst = getCGST();
      const sgst = getSGST();
      return Math.max(0, amountAfterDiscount + cgst + sgst);
    } catch (error) {
      console.error('Error computing final total:', error);
      return 0;
    }
  };

  // Check if the visit date allows order submission
  const canSubmitOrder = () => {
    if (!visitDate) return true; // Allow if no visit date (backwards compatibility)
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    console.log('Visit date:', visitDate, 'Today:', today, 'Can submit:', visitDate === today);
    return visitDate === today;
  };

  const getSubmitButtonText = () => {
    if (!visitDate) return "Submit Order";
    const today = new Date().toISOString().split('T')[0];
    if (visitDate === today) return "Submit Order";
    return `Order will be placed on ${new Date(visitDate).toLocaleDateString()}`;
  };

  const handleCameraCapture = async (blob: Blob) => {
    try {
      const fileName = `payment-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('expense-bills')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('expense-bills')
        .getPublicUrl(fileName);

      if (cameraMode === "cheque") {
        setChequePhotoUrl(publicUrl);
        toast({ title: "Cheque photo captured successfully" });
      } else {
        setUpiPhotoUrl(publicUrl);
        toast({ title: "Payment confirmation captured successfully" });
      }
      
      setIsCameraOpen(false);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before submitting",
        variant: "destructive"
      });
      return;
    }

    // Validate payment selections
    if (!paymentType) {
      toast({
        title: "Select Payment Type",
        description: "Please select Full Payment, Partial Payment, or Full Credit",
        variant: "destructive"
      });
      return;
    }

    if ((paymentType === "full" || paymentType === "partial") && !paymentMethod) {
      toast({
        title: "Select Payment Method",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }

    if (paymentType === "partial" && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid partial payment amount",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === "cheque" && !chequePhotoUrl) {
      toast({
        title: "Cheque Photo Required",
        description: "Please capture cheque photo",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === "upi" && !upiPhotoUrl) {
      toast({
        title: "Payment Confirmation Required",
        description: "Please capture payment confirmation photo",
        variant: "destructive"
      });
      return;
    }

    // Check if order can be submitted today - BLOCK submission if not today
    if (!canSubmitOrder()) {
      toast({
        title: "Order Scheduled",
        description: `This order will be submitted on ${new Date(visitDate!).toLocaleDateString()}. Items will remain in your cart until then.`,
        variant: "default"
      });
      return; // This prevents any further execution
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit orders",
          variant: "destructive"
        });
        return;
      }

      const subtotal = getSubtotal();
      const discountAmount = getDiscount();
      const cgstAmount = getCGST();
      const sgstAmount = getSGST();
      const totalAmount = getFinalTotal();
      // Prepare IDs
      const validRetailerId = retailerId && /^[0-9a-fA-F-]{36}$/.test(retailerId) ? retailerId : null;
      const validVisitId = visitId && /^[0-9a-fA-F-]{36}$/.test(visitId) ? visitId : null;

      // Calculate credit amounts based on new payment flow
      const totalDue = pendingAmountFromPrevious + totalAmount;
      let newTotalPending = 0;
      let creditPending = 0;
      let creditPaid = 0;
      let previousPendingCleared = 0;
      let isCreditOrder = false;
      let orderPaymentMethod = "";
      let paymentProofUrl = "";

      if (paymentType === "credit") {
        // Full credit - no payment received
        isCreditOrder = true;
        newTotalPending = totalDue;
        creditPending = totalAmount;
        creditPaid = 0;
        previousPendingCleared = 0;
        orderPaymentMethod = "credit";
      } else if (paymentType === "full") {
        // Full payment - clear all dues
        isCreditOrder = false;
        newTotalPending = 0;
        previousPendingCleared = pendingAmountFromPrevious;
        creditPaid = totalAmount;
        creditPending = 0;
        orderPaymentMethod = paymentMethod;
        paymentProofUrl = paymentMethod === "cheque" ? chequePhotoUrl : (paymentMethod === "upi" ? upiPhotoUrl : "");
      } else if (paymentType === "partial") {
        // Partial payment
        isCreditOrder = true;
        const paidAmount = parseFloat(partialAmount);
        previousPendingCleared = Math.min(pendingAmountFromPrevious, paidAmount);
        creditPaid = paidAmount;
        newTotalPending = totalDue - paidAmount;
        creditPending = newTotalPending;
        orderPaymentMethod = paymentMethod;
        paymentProofUrl = paymentMethod === "cheque" ? chequePhotoUrl : (paymentMethod === "upi" ? upiPhotoUrl : "");
      }


      // For phone orders, create a visit first
      let actualVisitId = validVisitId;
      if (isPhoneOrder && !validVisitId && validRetailerId) {
        const today = new Date().toISOString().split('T')[0];
        const { data: newVisit, error: visitError } = await supabase
          .from('visits')
          .insert({
            user_id: user.id,
            retailer_id: validRetailerId,
            planned_date: today,
            status: 'productive',
            skip_check_in_reason: 'phone-order',
            skip_check_in_time: new Date().toISOString()
          })
          .select()
          .single();

        if (visitError) {
          console.error('Error creating phone order visit:', visitError);
          toast({
            title: "Error",
            description: "Failed to create visit for phone order",
            variant: "destructive"
          });
          return;
        }

        actualVisitId = newVisit.id;
      }

      // Create order with payment details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          visit_id: actualVisitId,
          retailer_id: validRetailerId,
          retailer_name: retailerName,
          subtotal,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          status: 'confirmed',
          is_credit_order: isCreditOrder,
          credit_pending_amount: creditPending,
          credit_paid_amount: creditPaid,
          previous_pending_cleared: previousPendingCleared,
          payment_method: orderPaymentMethod,
          payment_proof_url: paymentProofUrl
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        rate: item.rate,
        unit: item.unit,
        quantity: item.quantity,
        total: computeItemTotal(item)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update retailer's pending amount based on order type
      if (validRetailerId) {
        await supabase
          .from('retailers')
          .update({ pending_amount: newTotalPending })
          .eq('id', validRetailerId);
      }

      // Mark visit as productive if available
      if (actualVisitId) {
        await supabase.from('visits').update({ status: 'productive' }).eq('id', actualVisitId);
        
        // Dispatch event to notify VisitCard components to refresh
        window.dispatchEvent(new CustomEvent('visitStatusChanged', { 
          detail: { visitId: actualVisitId, status: 'productive', retailerId: validRetailerId } 
        }));
      }

      // Create invoice and send via SMS automatically
      let invoiceSentViaSMS = false;
      try {
        // Get retailer phone number
        const { data: retailerData } = await supabase
          .from('retailers')
          .select('phone')
          .eq('id', validRetailerId)
          .single();

        const retailerPhone = retailerData?.phone;

        // Get company settings for invoice (not used currently but kept for future)
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (validRetailerId && retailerPhone) {
          // Generate a temporary invoice number for SMS (will be formalized in database)
          const tempInvoiceNumber = `INV-${Date.now()}`;
          
          // Create a simple invoice URL (you can enhance this to generate actual PDF)
          const invoiceUrl = `${window.location.origin}/order-detail/${order.id}`;
          
          console.log('Sending invoice via SMS to:', retailerPhone);
          
          // Send via Twilio SMS
          const { data: smsData, error: smsError } = await supabase.functions.invoke('send-invoice-whatsapp', {
            body: { 
              invoiceId: order.id,
              customerPhone: retailerPhone,
              pdfUrl: invoiceUrl,
              invoiceNumber: tempInvoiceNumber
            }
          });

          if (smsError) {
            console.error('SMS send error:', smsError);
          } else if (smsData?.success) {
            console.log('Invoice sent via SMS successfully');
            invoiceSentViaSMS = true;
          }
        }
      } catch (invoiceError) {
        console.error('Error sending invoice via SMS:', invoiceError);
        // Don't block order submission if SMS fails
      }

      const orderType = isCreditOrder ? "Credit Order" : "Order";
      const smsMsg = invoiceSentViaSMS ? " Invoice link sent via SMS." : "";
      toast({
        title: `${orderType} Submitted`,
        description: isCreditOrder 
          ? `${orderType} for ${retailerName} submitted with ₹${creditPending.toLocaleString()} pending!${smsMsg}`
          : `Order for ${retailerName} submitted successfully!${smsMsg}`
      });
      
      // Clear cart and all order entry form data
      localStorage.removeItem(activeStorageKey);
      // Also clear the quantities, variants, and stocks storage for order entry
      const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
      const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
      const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
      const tableFormKey = activeStorageKey.replace('order_cart:', 'table_form:');
      localStorage.removeItem(quantityKey);
      localStorage.removeItem(variantKey);
      localStorage.removeItem(stockKey);
      localStorage.removeItem(tableFormKey);
      setCartItems([]);
      navigate(isPhoneOrder ? '/my-retailers' : '/visits/retailers');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast({
        title: "Error",
        description: "Failed to submit order. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(`/order-entry?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}${isPhoneOrder ? '&phoneOrder=true' : ''}`)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <CardTitle className="text-lg">Cart</CardTitle>
                <p className="text-primary-foreground/80">{loggedInUserName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <Badge variant="secondary">{cartItems.length} items</Badge>
              <Badge variant="secondary">₹{formatINRTrunc2(getFinalTotal())}</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <Button 
                onClick={() => navigate(`/order-entry?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}`)}
                className="mt-4"
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {cartItems.map(item => {
                const discount = computeItemDiscount(item);
                const finalPrice = computeItemTotal(item);
                const hasDiscount = discount > 0;
                
                // Extract just the variant name if it contains a dash
                const displayName = item.name.includes(' - ') 
                  ? item.name.split(' - ')[1] || item.name
                  : item.name;
                
                return (
                  <Card key={item.id} className="border-border/50">
                    <CardContent className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {/* Product Info - Compact */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate leading-tight">{displayName}</h3>
                          <p className="text-xs text-muted-foreground">₹{getDisplayRate(item).toFixed(2)}/{item.unit}</p>
                        </div>
                        
                        {/* Quantity Controls - Compact */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 text-xs"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="text-xs font-medium min-w-[40px] text-center">{item.quantity} {item.unit}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 text-xs"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        
                        {/* Price - Compact */}
                        <div className="text-right min-w-[60px] shrink-0">
                          <div className="font-bold text-xs">₹{formatINRTrunc2(finalPrice)}</div>
                          {hasDiscount && (
                            <div className="text-[10px] text-green-600 font-medium">-₹{formatINRTrunc2(discount)}</div>
                          )}
                        </div>
                        
                        {/* Action Buttons - Compact */}
                        <div className="flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowItemDetail(true);
                            }}
                          >
                            <Eye size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive/80"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">₹{formatINRTrunc2(getSubtotal())}</span>
                </div>

                {getDiscount() > 0 && (
                  <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift size={16} className="text-success" />
                      <p className="text-sm font-medium text-success">Schemes Applied</p>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Discount:</span>
                      <span className="text-success font-medium">-₹{formatINRTrunc2(getDiscount())}</span>
                    </div>
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>CGST (2.5%):</span>
                    <span>₹{formatINRTrunc2(getCGST())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>SGST (2.5%):</span>
                    <span>₹{formatINRTrunc2(getSGST())}</span>
                  </div>
                </div>

                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Total:</span>
                  <span>₹{formatINRTrunc2(getFinalTotal())}</span>
                </div>

                {pendingAmountFromPrevious > 0 && (
                  <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Previous Pending:</span>
                      <span className="font-semibold text-warning">₹{formatINRTrunc2(pendingAmountFromPrevious)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Order:</span>
                      <span className="font-semibold">₹{formatINRTrunc2(getFinalTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-amber-200 dark:border-amber-800">
                      <span className="font-medium">Total Due:</span>
                      <span className="font-bold">₹{formatINRTrunc2(pendingAmountFromPrevious + getFinalTotal())}</span>
                    </div>
                  </div>
                )}

                {/* Payment Type Selection */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Select Payment Type:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      onClick={() => {
                        setPaymentType("full");
                        setPaymentMethod("");
                      }}
                      variant={paymentType === "full" ? "default" : "outline"}
                      className="w-full h-auto py-3 whitespace-normal leading-tight text-center"
                    >
                      Full Payment
                    </Button>
                    <Button
                      onClick={() => {
                        setPaymentType("partial");
                        setPaymentMethod("");
                      }}
                      variant={paymentType === "partial" ? "default" : "outline"}
                      className="w-full h-auto py-3 whitespace-normal leading-tight text-center"
                    >
                      Partial Payment
                    </Button>
                    <Button
                      onClick={() => {
                        setPaymentType("credit");
                        setPaymentMethod("");
                      }}
                      variant={paymentType === "credit" ? "default" : "outline"}
                      className="w-full h-auto py-3 whitespace-normal leading-tight text-center"
                    >
                      Full Credit
                    </Button>
                  </div>
                </div>

                {/* Partial Payment Amount Input */}
                {paymentType === "partial" && (
                  <div className="space-y-2">
                    <Label htmlFor="partial-amount">Partial Payment Amount</Label>
                    <Input
                      id="partial-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      max={getFinalTotal() + pendingAmountFromPrevious}
                    />
                    {partialAmount && parseFloat(partialAmount) > 0 && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-success">Paying Now:</span>
                          <span className="font-semibold text-success">-₹{formatINRTrunc2(parseFloat(partialAmount))}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-amber-200 dark:border-amber-800">
                          <span className="font-medium text-warning">Remaining Pending:</span>
                          <span className="font-bold text-warning">₹{formatINRTrunc2(Math.max(0, (getFinalTotal() + pendingAmountFromPrevious) - parseFloat(partialAmount)))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Method Selection */}
                {(paymentType === "full" || paymentType === "partial") && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">Payment Method:</p>
                    <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cheque" id="cheque" />
                        <Label htmlFor="cheque">Cheque</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upi" id="upi" />
                        <Label htmlFor="upi">UPI</Label>
                      </div>
                    </RadioGroup>

                    {/* Cheque Photo Capture */}
                    {paymentMethod === "cheque" && (
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            setCameraMode("cheque");
                            setIsCameraOpen(true);
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          <Camera className="mr-2" size={16} />
                          {chequePhotoUrl ? "Retake Cheque Photo" : "Capture Cheque Photo"}
                        </Button>
                        {chequePhotoUrl && (
                          <p className="text-xs text-success">✓ Cheque photo captured</p>
                        )}
                      </div>
                    )}

                    {/* UPI Payment Confirmation */}
                    {paymentMethod === "upi" && (
                      <div className="space-y-2">
                        <div className="p-4 bg-background rounded-md border">
                          <p className="text-sm text-muted-foreground mb-2">Scan QR Code for Payment</p>
                          <div className="flex items-center justify-center h-48 bg-muted rounded">
                            <p className="text-muted-foreground">QR Code (Upload from Admin Panel)</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setCameraMode("upi");
                            setIsCameraOpen(true);
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          <Camera className="mr-2" size={16} />
                          {upiPhotoUrl ? "Retake Payment Confirmation" : "Capture Payment Confirmation"}
                        </Button>
                        {upiPhotoUrl && (
                          <p className="text-xs text-success">✓ Payment confirmation captured</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Order Button */}
                <Button 
                  onClick={handleSubmitOrder}
                  className="w-full"
                  size="lg"
                  variant="default"
                  disabled={!canSubmitOrder() || !paymentType}
                >
                  {getSubmitButtonText()}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
        
        {/* Cart Item Detail Modal */}
        <CartItemDetail
          isOpen={showItemDetail}
          onClose={() => setShowItemDetail(false)}
          item={selectedItem}
        />

        <CameraCapture
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
          title={cameraMode === "cheque" ? "Capture Cheque Photo" : "Capture Payment Confirmation"}
        />
      </div>
    </div>
  );
};
