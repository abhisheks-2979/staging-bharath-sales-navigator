import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Package, ShoppingCart } from "lucide-react";

interface OrderSummaryItem {
  id: string;
  variantName: string;
  selectedItem: string;
  quantity: number;
  rate: number;
  totalPrice: number;
  savings: number;
  appliedOffers: string[];
}

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderSummaryItem[];
  totalAmount: number;
  totalSavings: number;
  onAddToCart: () => void;
  productName?: string;
}

export const OrderSummaryModal = ({ 
  isOpen, 
  onClose, 
  items, 
  totalAmount, 
  totalSavings, 
  onAddToCart,
  productName = "Product"
}: OrderSummaryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} />
            View Breakdown — {productName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Selected Items */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Selected Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 grid grid-cols-4 gap-2 p-2 text-xs font-medium">
                <div>Item / Variant</div>
                <div>Unit Price</div>
                <div>Qty</div>
                <div>Subtotal</div>
              </div>
              {items.map((item) => {
                const originalPrice = item.savings > 0 ? item.totalPrice + item.savings : item.totalPrice;
                return (
                  <div key={item.id} className="grid grid-cols-4 gap-2 p-2 text-xs border-t">
                    <div>
                      <div className="font-medium">{item.variantName}</div>
                      <div className="text-muted-foreground">{item.selectedItem}</div>
                    </div>
                    <div className="flex flex-col">
                      {item.savings > 0 ? (
                        <>
                          <span className="line-through text-muted-foreground">₹{item.rate.toFixed(2)}</span>
                          <span className="font-medium">₹{(item.rate - (item.savings / item.quantity)).toFixed(2)}</span>
                          {item.appliedOffers.length > 0 && (
                            <span className="text-green-600 text-xs">{item.appliedOffers[0]}</span>
                          )}
                        </>
                      ) : (
                        <span className="font-medium">₹{item.rate.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex items-center font-medium">{item.quantity}</div>
                    <div className="flex flex-col">
                      {item.savings > 0 ? (
                        <>
                          <span className="line-through text-muted-foreground">₹{originalPrice.toFixed(2)}</span>
                          <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                          <span className="text-green-600 text-xs">You saved ₹{item.savings.toFixed(2)} on this item</span>
                        </>
                      ) : (
                        <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Savings */}
          {totalSavings > 0 && (
            <div className="text-center">
              <p className="text-green-600 font-medium">
                You saved ₹{totalSavings.toFixed(2)} on this order
              </p>
            </div>
          )}

          {/* Total Section */}
          <div className="border-t pt-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-semibold">Total Amount:</span>
              <span className="text-xl font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
            
            <Button 
              onClick={onAddToCart}
              className="w-full"
              size="lg"
            >
              <ShoppingCart size={16} className="mr-2" />
              Add Selected to Cart (₹{totalAmount.toFixed(2)})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};