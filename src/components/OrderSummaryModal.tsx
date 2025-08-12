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
}

export const OrderSummaryModal = ({ 
  isOpen, 
  onClose, 
  items, 
  totalAmount, 
  totalSavings, 
  onAddToCart 
}: OrderSummaryModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={20} />
            Order Summary
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Selected Items Grid */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Selected Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 grid grid-cols-3 gap-1 p-2 text-xs font-medium">
                <div>Item</div>
                <div>Qty</div>
                <div>Price</div>
              </div>
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-3 gap-1 p-2 text-xs border-t">
                  <div>
                    <div className="font-medium">{item.variantName}</div>
                    <div className="text-muted-foreground">{item.selectedItem}</div>
                  </div>
                  <div className="flex items-center">{item.quantity}</div>
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium">₹{item.totalPrice.toFixed(2)}</div>
                      {item.savings > 0 && (
                        <div className="text-green-600 text-xs">Save ₹{item.savings.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Savings Section */}
          {totalSavings > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={16} className="text-green-600" />
                <h3 className="font-medium text-green-800">Offers Applied</h3>
              </div>
              <div className="space-y-1 text-sm">
                {items.map((item) => 
                  item.appliedOffers.map((offer, index) => (
                    <div key={`${item.id}-${index}`} className="flex justify-between">
                      <span className="text-green-700">{offer}</span>
                      <span className="text-green-600 font-medium">-₹{item.savings.toFixed(2)}</span>
                    </div>
                  ))
                )}
                <div className="border-t border-green-200 pt-1 mt-2 flex justify-between font-medium">
                  <span className="text-green-800">Total Savings:</span>
                  <span className="text-green-600">₹{totalSavings.toFixed(2)}</span>
                </div>
              </div>
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
              Add to Cart (₹{totalAmount.toFixed(2)})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};