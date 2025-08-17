import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Retailer {
  id: string;
  name: string;
  beat_id: string;
}

interface MassEditBeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailers: Retailer[];
  beats: string[];
  onSuccess: () => void;
}

export const MassEditBeatsModal = ({ isOpen, onClose, retailers, beats, onSuccess }: MassEditBeatsModalProps) => {
  const { user } = useAuth();
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [targetBeat, setTargetBeat] = useState<string>("");
  const [isNewBeat, setIsNewBeat] = useState(false);
  const [newBeatName, setNewBeatName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRetailerToggle = (retailerId: string) => {
    setSelectedRetailers(prev => 
      prev.includes(retailerId) 
        ? prev.filter(id => id !== retailerId)
        : [...prev, retailerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRetailers.length === retailers.length) {
      setSelectedRetailers([]);
    } else {
      setSelectedRetailers(retailers.map(r => r.id));
    }
  };

  const handleMassEdit = async () => {
    if (selectedRetailers.length === 0) {
      toast({
        title: "No retailers selected",
        description: "Please select at least one retailer",
        variant: "destructive",
      });
      return;
    }

    const beatToAssign = isNewBeat ? newBeatName.trim() : targetBeat;
    if (!beatToAssign) {
      toast({
        title: "No beat specified",
        description: "Please select an existing beat or create a new one",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('retailers')
        .update({ beat_id: beatToAssign })
        .in('id', selectedRetailers)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Beat assignment successful",
        description: `${selectedRetailers.length} retailers moved to beat "${beatToAssign}"`,
      });

      onSuccess();
      onClose();
      setSelectedRetailers([]);
      setTargetBeat("");
      setNewBeatName("");
      setIsNewBeat(false);
    } catch (error: any) {
      toast({
        title: "Failed to update beats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Mass Edit Beats</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Beat Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-beat"
                checked={isNewBeat}
                onCheckedChange={(checked) => setIsNewBeat(checked === true)}
              />
              <Label htmlFor="new-beat">Create new beat</Label>
            </div>

            {isNewBeat ? (
              <div>
                <Label>New Beat Name</Label>
                <Input
                  placeholder="Enter new beat name"
                  value={newBeatName}
                  onChange={(e) => setNewBeatName(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <Label>Select Existing Beat</Label>
                <Select value={targetBeat} onValueChange={setTargetBeat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a beat" />
                  </SelectTrigger>
                  <SelectContent>
                    {beats.map(beat => (
                      <SelectItem key={beat} value={beat}>
                        {beat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Retailer Selection */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Select Retailers ({selectedRetailers.length}/{retailers.length})</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedRetailers.length === retailers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
              {retailers.map(retailer => (
                <div key={retailer.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={retailer.id}
                    checked={selectedRetailers.includes(retailer.id)}
                    onCheckedChange={() => handleRetailerToggle(retailer.id)}
                  />
                  <Label htmlFor={retailer.id} className="flex-1 text-sm">
                    {retailer.name} <span className="text-muted-foreground">(Current: {retailer.beat_id})</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleMassEdit} 
            disabled={loading || selectedRetailers.length === 0}
          >
            {loading ? "Updating..." : `Update ${selectedRetailers.length} Retailers`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};