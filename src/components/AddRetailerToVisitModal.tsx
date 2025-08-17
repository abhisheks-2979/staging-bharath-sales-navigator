import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  beat_id: string;
}

interface AddRetailerToVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  onVisitCreated: () => void;
}

export const AddRetailerToVisitModal = ({ isOpen, onClose, retailer, onVisitCreated }: AddRetailerToVisitModalProps) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);

  const handleCreateVisit = async () => {
    if (!retailer || !selectedDate || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          user_id: user.id,
          retailer_id: retailer.id,
          planned_date: format(selectedDate, 'yyyy-MM-dd'),
          status: 'planned'
        });

      if (error) throw error;

      toast({
        title: "Visit Added",
        description: `Unplanned visit scheduled for ${retailer.name} on ${format(selectedDate, 'MMM dd, yyyy')}`,
      });

      onVisitCreated();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to create visit",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unplanned Visit</DialogTitle>
        </DialogHeader>
        
        {retailer && (
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="font-medium">{retailer.name}</p>
              <p className="text-sm text-muted-foreground">{retailer.address}</p>
              <p className="text-sm text-muted-foreground">Beat: {retailer.beat_id}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Visit Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateVisit} 
                disabled={!selectedDate || loading}
              >
                {loading ? "Creating..." : "Add Visit"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};