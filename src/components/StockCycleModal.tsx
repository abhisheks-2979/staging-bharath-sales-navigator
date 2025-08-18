import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StockCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  retailerId: string;
  retailerName: string;
}

export const StockCycleModal = ({ isOpen, onClose, visitId, retailerId, retailerName }: StockCycleModalProps) => {
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [orderedQuantity, setOrderedQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !stockQuantity.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in product name and stock quantity.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to record stock cycle data.",
          variant: "destructive",
        });
        return;
      }

      const stockCycleData = {
        user_id: user.id,
        retailer_id: retailerId,
        visit_id: visitId,
        product_id: productName.toLowerCase().replace(/\s+/g, '_'),
        product_name: productName,
        ordered_quantity: orderedQuantity ? parseInt(orderedQuantity) : 0,
        stock_quantity: parseInt(stockQuantity),
        visit_date: new Date().toISOString().split('T')[0],
      };

      const { error } = await supabase
        .from('stock_cycle_data')
        .insert(stockCycleData);

      if (error) throw error;

      toast({
        title: "Stock Cycle Recorded",
        description: `Stock data for ${productName} has been saved successfully.`,
      });

      // Reset form
      setProductName("");
      setStockQuantity("");
      setOrderedQuantity("");
      setNotes("");
      onClose();
    } catch (error: any) {
      console.error('Stock cycle submission error:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95%] max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Stock Cycle - {retailerName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Stock Quantity *</Label>
              <Input
                id="stockQuantity"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Current stock level"
                min="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderedQuantity">Ordered Quantity</Label>
              <Input
                id="orderedQuantity"
                type="number"
                value={orderedQuantity}
                onChange={(e) => setOrderedQuantity(e.target.value)}
                placeholder="Quantity ordered today"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional observations about stock movement, supply chain issues, etc."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Stock Data"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};