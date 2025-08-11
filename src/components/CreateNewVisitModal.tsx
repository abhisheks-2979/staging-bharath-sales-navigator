import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Users, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface Beat {
  id: string;
  name: string;
  retailerCount: number;
  category: string;
  priority: string;
}

interface CreateNewVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVisitCreated?: () => void;
}

export const CreateNewVisitModal = ({ isOpen, onClose, onVisitCreated }: CreateNewVisitModalProps) => {
  const [selectedBeat, setSelectedBeat] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableBeats, setAvailableBeats] = useState<Beat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadAvailableBeats();
    }
  }, [isOpen, user]);

  const loadAvailableBeats = async () => {
    if (!user) return;

    try {
      // Get all retailers grouped by beat
      const { data: retailers, error } = await supabase
        .from('retailers')
        .select('beat_id, category, priority')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      // Group retailers by beat and create beat objects
      const beatMap = new Map<string, { retailerCount: number; category: string; priority: string }>();
      
      (retailers || []).forEach(retailer => {
        const beatId = retailer.beat_id;
        if (!beatId || beatId === 'unassigned') return;
        
        const existing = beatMap.get(beatId) || { retailerCount: 0, category: '', priority: '' };
        beatMap.set(beatId, {
          retailerCount: existing.retailerCount + 1,
          category: retailer.category || '',
          priority: retailer.priority || ''
        });
      });

      const beats: Beat[] = Array.from(beatMap.entries()).map(([beatId, data]) => ({
        id: beatId,
        name: beatId,
        retailerCount: data.retailerCount,
        category: data.category,
        priority: data.priority
      }));

      setAvailableBeats(beats);
    } catch (error) {
      console.error('Error loading beats:', error);
      toast({
        title: "Error",
        description: "Failed to load available beats",
        variant: "destructive"
      });
    }
  };

  const handleCreateVisit = async () => {
    if (!selectedBeat || !user) {
      toast({
        title: "Missing Information",
        description: "Please select a beat to create a visit",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Check if beat plan already exists for this date
      const { data: existingPlan } = await supabase
        .from('beat_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('beat_id', selectedBeat)
        .eq('plan_date', formattedDate)
        .single();

      if (existingPlan) {
        toast({
          title: "Beat Already Planned",
          description: "This beat is already planned for the selected date",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Get beat details
      const selectedBeatData = availableBeats.find(b => b.id === selectedBeat);
      
      // Create beat plan
      const { error } = await supabase
        .from('beat_plans')
        .insert({
          user_id: user.id,
          beat_id: selectedBeat,
          beat_name: selectedBeat,
          plan_date: formattedDate,
          beat_data: {
            id: selectedBeat,
            name: selectedBeat,
            retailerCount: selectedBeatData?.retailerCount || 0,
            category: selectedBeatData?.category || '',
            priority: selectedBeatData?.priority || ''
          }
        });

      if (error) throw error;

      toast({
        title: "Visit Created",
        description: `Successfully planned ${selectedBeat} for ${format(selectedDate, 'PPP')}`,
      });

      onVisitCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating visit:', error);
      toast({
        title: "Error",
        description: "Failed to create visit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Create New Visit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Beat</Label>
            <Select value={selectedBeat} onValueChange={setSelectedBeat}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a beat to visit" />
              </SelectTrigger>
              <SelectContent>
                {availableBeats.map((beat) => (
                  <SelectItem key={beat.id} value={beat.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{beat.name}</span>
                      <div className="flex items-center gap-2 ml-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {beat.retailerCount}
                        </Badge>
                        {beat.category && (
                          <Badge variant="outline" className="text-xs">
                            {beat.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableBeats.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No beats available. Create retailers and assign them to beats first.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
          </div>

          {selectedBeat && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Selected Beat Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Beat: {selectedBeat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {availableBeats.find(b => b.id === selectedBeat)?.retailerCount || 0} retailers
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateVisit} 
            disabled={!selectedBeat || isLoading}
          >
            {isLoading ? "Creating..." : "Create Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};