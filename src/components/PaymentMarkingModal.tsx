import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface PaymentMarkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retailerId: string;
  currentPendingAmount: number;
  onPaymentMarked: () => void;
}

export const PaymentMarkingModal = ({
  open,
  onOpenChange,
  retailerId,
  currentPendingAmount,
  onPaymentMarked
}: PaymentMarkingModalProps) => {
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleFullPayment = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("retailers")
        .update({ pending_amount: 0 })
        .eq("id", retailerId);

      if (error) throw error;

      toast.success("Full payment marked successfully!");
      onPaymentMarked();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking full payment:", error);
      toast.error("Failed to mark payment");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomPayment = async () => {
    const amount = parseFloat(paymentAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > currentPendingAmount) {
      toast.error("Payment amount cannot exceed pending amount");
      return;
    }

    setLoading(true);
    try {
      const newPendingAmount = currentPendingAmount - amount;
      
      const { error } = await supabase
        .from("retailers")
        .update({ pending_amount: newPendingAmount })
        .eq("id", retailerId);

      if (error) throw error;

      toast.success(`Payment of ₹${amount.toLocaleString()} marked successfully!`);
      onPaymentMarked();
      onOpenChange(false);
      setPaymentAmount("");
    } catch (error) {
      console.error("Error marking custom payment:", error);
      toast.error("Failed to mark payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Mark Payment Received
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Current Pending Amount</p>
            <p className="text-2xl font-bold">₹{currentPendingAmount.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleFullPayment}
              disabled={loading || currentPendingAmount === 0}
              className="w-full"
              size="lg"
            >
              Received Full Payment
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="payment-amount">Custom Payment Amount</Label>
              <Input
                id="payment-amount"
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="0"
                max={currentPendingAmount}
                step="0.01"
              />
              <Button
                onClick={handleCustomPayment}
                disabled={loading || !paymentAmount || currentPendingAmount === 0}
                variant="outline"
                className="w-full"
              >
                Mark Custom Payment
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
