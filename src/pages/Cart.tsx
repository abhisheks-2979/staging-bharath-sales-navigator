
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2, Gift, ShoppingCart, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { CartItemDetail } from "@/components/CartItemDetail";
import { supabase } from "@/integrations/supabase/client";

interface CartItem {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  quantity: number;
  total: number;
  schemeConditionQuantity?: number;
  schemeDiscountPercentage?: number;
  schemes?: Array<{ is_active: boolean; condition_quantity?: number; discount_percentage?: number }>;
}

type AnyCartItem = CartItem;

export const Cart = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get("visitId") || '';
  const retailerId = searchParams.get("retailerId") || '';
  const retailerName = searchParams.get("retailer") || "Retailer Name";

  // Fetch and cache schemes from database
  const [allSchemes, setAllSchemes] = React.useState<any[]>([]);
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [loggedInUserName, setLoggedInUserName] = React.useState<string>("User");
  const [visitDate, setVisitDate] = React.useState<string | null>(null);
  const [selectedItem, setSelectedItem] = React.useState<CartItem | null>(null);
  const [showItemDetail, setShowItemDetail] = React.useState(false);
  
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
  }, []);

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
    return Number(item.rate) * Number(item.quantity);
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
  
  const getFinalTotal = () => {
    try {
      const subtotal = getSubtotal();
      const discount = getDiscount();
      return Math.max(0, subtotal - discount);
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

  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before submitting",
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
      const totalAmount = getFinalTotal();
      // Prepare IDs
      const validRetailerId = retailerId && /^[0-9a-fA-F-]{36}$/.test(retailerId) ? retailerId : null;
      const validVisitId = visitId && /^[0-9a-fA-F-]{36}$/.test(visitId) ? visitId : null;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          visit_id: validVisitId,
          retailer_id: validRetailerId,
          retailer_name: retailerName,
          subtotal,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          status: 'confirmed'
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

      // Mark visit as productive if available
      if (validVisitId) {
        await supabase.from('visits').update({ status: 'productive' }).eq('id', validVisitId);
      }

      toast({
        title: "Order Submitted",
        description: `Order for ${retailerName} submitted successfully!`
      });
      
      // Clear cart and all order entry form data
      localStorage.removeItem(activeStorageKey);
      // Also clear the quantities, variants, and stocks storage for order entry
      const quantityKey = activeStorageKey.replace('order_cart:', 'order_quantities:');
      const variantKey = activeStorageKey.replace('order_cart:', 'order_variants:');
      const stockKey = activeStorageKey.replace('order_cart:', 'order_stocks:');
      localStorage.removeItem(quantityKey);
      localStorage.removeItem(variantKey);
      localStorage.removeItem(stockKey);
      setCartItems([]);
      navigate(`/visits/retailers`);
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
                onClick={() => navigate(`/order-entry?visitId=${visitId}&retailer=${retailerName}&retailerId=${retailerId}`)}
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
              <Badge variant="secondary">₹{getFinalTotal().toLocaleString()}</Badge>
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
            <div className="space-y-3">
              {cartItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">₹{item.rate}/{item.unit}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowItemDetail(true);
                            }}
                            className="text-xs text-muted-foreground hover:text-primary"
                          >
                            <Eye size={12} className="mr-1" />
                            Show More
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                        className="text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const originalPrice = computeItemSubtotal(item);
                          const discount = computeItemDiscount(item);
                          const finalPrice = computeItemTotal(item);
                          const hasDiscount = discount > 0;
                          
                          return (
                            <div className="flex flex-col items-end">
                              {hasDiscount && (
                                <span className="text-xs text-muted-foreground line-through">₹{originalPrice.toLocaleString()}</span>
                              )}
                              <span className="font-bold text-lg">₹{finalPrice.toLocaleString()}</span>
                              {hasDiscount && (
                                <span className="text-xs text-green-600 font-medium">You saved ₹{discount.toLocaleString()}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>₹{item.rate}/{item.unit} × {item.quantity}</span>
                        <span>₹{computeItemSubtotal(item).toLocaleString()}</span>
                      </div>
                      {computeItemDiscount(item) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span className="flex items-center gap-1">
                            <Gift size={12} />
                            {(() => {
                              // Show scheme details if available, otherwise generic message
                              if (item.total !== undefined) {
                                return 'Scheme Offer Applied';
                              }
                              const s = getItemScheme(item);
                              return s.discountPct ? `Scheme Discount (${s.discountPct}% off)` : 'Scheme Discount';
                            })()}
                          </span>
                          <span className="font-medium">-₹{computeItemDiscount(item).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Final Total</span>
                        <span>₹{computeItemTotal(item).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <Card className="sticky bottom-4">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold">₹{getSubtotal().toLocaleString()}</span>
                </div>

                {getDiscount() > 0 && (
                  <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift size={16} className="text-success" />
                      <p className="text-sm font-medium text-success">Schemes Applied</p>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Discount:</span>
                      <span className="text-success font-medium">-₹{getDiscount().toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Total:</span>
                  <span>₹{getFinalTotal().toLocaleString()}</span>
                </div>

                <Button 
                  onClick={handleSubmitOrder}
                  className="w-full"
                  size="lg"
                  variant={canSubmitOrder() ? "default" : "outline"}
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
      </div>
    </div>
  );
};
