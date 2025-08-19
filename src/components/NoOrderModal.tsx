import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, UserX, DoorClosed, XCircle } from "lucide-react";

interface NoOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReasonSelect: (reason: string) => void;
  currentReason?: string;
}

export const NoOrderModal = ({ isOpen, onClose, onReasonSelect, currentReason }: NoOrderModalProps) => {
  const [selectedReason, setSelectedReason] = useState<string>(currentReason || "");

  const reasons = [
    {
      value: "over-stocked",
      label: "Over Stocked",
      description: "Retailer has sufficient inventory",
      icon: Package,
      color: "text-warning"
    },
    {
      value: "owner-not-available",
      label: "Owner Not Available",
      description: "Decision maker is not present",
      icon: UserX,
      color: "text-muted-foreground"
    },
    {
      value: "store-closed",
      label: "Store Closed",
      description: "Store is temporarily closed",
      icon: DoorClosed,
      color: "text-destructive"
    },
    {
      value: "permanently-closed",
      label: "Permanently Closed",
      description: "Store has shut down permanently",
      icon: XCircle,
      color: "text-destructive"
    }
  ];

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    if (reason === "over-stocked") {
      // Show message about updating stock quantities
      setTimeout(() => {
        onReasonSelect(reason);
        onClose();
      }, 100);
    } else {
      onReasonSelect(reason);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select No Order Reason</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {reasons.map((reason) => {
            const IconComponent = reason.icon;
            return (
                <Card 
                key={reason.value}
                className={`transition-all duration-200 ${
                  reason.value === "over-stocked" 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-md'
                } ${selectedReason === reason.value ? 'ring-2 ring-primary' : ''}`}
                onClick={reason.value === "over-stocked" ? undefined : () => handleReasonSelect(reason.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <IconComponent className={`size-5 ${reason.color} ${reason.value === "over-stocked" ? 'opacity-50' : ''}`} />
                    <div className="flex-1">
                      <h4 className={`font-medium text-card-foreground ${reason.value === "over-stocked" ? 'opacity-50' : ''}`}>{reason.label}</h4>
                      <p className={`text-sm text-muted-foreground ${reason.value === "over-stocked" ? 'opacity-50' : ''}`}>{reason.description}</p>
                      {reason.value === "over-stocked" && (
                        <p className="text-xs text-primary mt-1 font-medium opacity-75">
                          Update stock quantities in Order Entry page - this option will auto-select
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};