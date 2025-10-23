import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchInput } from '@/components/SearchInput';
import { Save, X, Users, MapPin, Clock, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Beat {
  id: string;
  name: string;
  travel_allowance?: number;
  average_km?: number;
  average_time_minutes?: number;
}

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string;
  category?: string;
  beat_id?: string;
  beat_name?: string;
}

interface EditBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  beat: Beat | null;
  onBeatUpdated: () => void;
}

export const EditBeatModal = ({ isOpen, onClose, beat, onBeatUpdated }: EditBeatModalProps) => {
  const [beatName, setBeatName] = useState('');
  const [travelAllowance, setTravelAllowance] = useState('');
  const [averageKm, setAverageKm] = useState('');
  const [averageTimeMinutes, setAverageTimeMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [allRetailers, setAllRetailers] = useState<Retailer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRetailers, setSelectedRetailers] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    if (beat && isOpen) {
      setBeatName(beat.name || '');
      setTravelAllowance(beat.travel_allowance?.toString() || '');
      setAverageKm(beat.average_km?.toString() || '');
      setAverageTimeMinutes(beat.average_time_minutes?.toString() || '');
      loadRetailers();
    }
  }, [beat, isOpen]);

  const loadRetailers = async () => {
    if (!user || !beat) return;
    
    try {
      // Get all retailers for user
      const { data: allRetailersData, error: allError } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (allError) throw allError;

      // Get current beat retailers
      const { data: beatRetailersData, error: beatError } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', user.id)
        .eq('beat_id', beat.id)
        .order('name');

      if (beatError) throw beatError;

      const allRetailersFormatted = (allRetailersData || []).map(retailer => ({
        id: retailer.id,
        name: retailer.name,
        address: retailer.address,
        phone: retailer.phone || 'N/A',
        category: retailer.category,
        beat_id: retailer.beat_id,
        beat_name: retailer.beat_name
      }));

      const beatRetailerIds = new Set((beatRetailersData || []).map(r => r.id));
      
      setAllRetailers(allRetailersFormatted);
      setRetailers(allRetailersFormatted);
      setSelectedRetailers(beatRetailerIds);
    } catch (error) {
      console.error('Error loading retailers:', error);
      toast.error('Failed to load retailers');
    }
  };

  const handleRetailerSelection = (retailerId: string) => {
    const newSelectedRetailers = new Set(selectedRetailers);
    if (newSelectedRetailers.has(retailerId)) {
      newSelectedRetailers.delete(retailerId);
    } else {
      newSelectedRetailers.add(retailerId);
    }
    setSelectedRetailers(newSelectedRetailers);
  };

  const handleSave = async () => {
    if (!beatName.trim()) {
      toast.error('Please enter a beat name');
      return;
    }

    if (!user || !beat) return;

    setLoading(true);
    try {
      // Update the shared beats table
      const { error: beatUpdateError } = await supabase
        .from('beats')
        .update({
          beat_name: beatName.trim(),
          travel_allowance: parseFloat(travelAllowance) || 0,
          average_km: parseFloat(averageKm) || 0,
          average_time_minutes: parseInt(averageTimeMinutes) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('beat_id', beat.id);

      if (beatUpdateError) throw beatUpdateError;

      // Update beat allowances for this user
      const { error: allowanceError } = await supabase
        .from('beat_allowances')
        .upsert({
          user_id: user.id,
          beat_id: beat.id,
          beat_name: beatName.trim(),
          travel_allowance: parseFloat(travelAllowance) || 0,
          average_km: parseFloat(averageKm) || 0,
          average_time_minutes: parseInt(averageTimeMinutes) || 0,
          daily_allowance: 0
        }, {
          onConflict: 'user_id,beat_id'
        });

      if (allowanceError) throw allowanceError;

      // Get current retailers in this beat
      const { data: currentBeatRetailers, error: currentError } = await supabase
        .from('retailers')
        .select('id')
        .eq('user_id', user.id)
        .eq('beat_id', beat.id);

      if (currentError) throw currentError;

      const currentRetailerIds = new Set((currentBeatRetailers || []).map(r => r.id));
      const newRetailerIds = selectedRetailers;

      // Retailers to remove from beat (unassign)
      const retailersToRemove = Array.from(currentRetailerIds).filter(id => !newRetailerIds.has(id));
      
      // Retailers to add to beat
      const retailersToAdd = Array.from(newRetailerIds).filter(id => !currentRetailerIds.has(id));

      // Remove retailers from beat
      if (retailersToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('retailers')
          .update({ 
            beat_id: 'unassigned',
            beat_name: null
          })
          .in('id', retailersToRemove)
          .eq('user_id', user.id);

        if (removeError) throw removeError;
      }

      // Add retailers to beat
      if (retailersToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('retailers')
          .update({ 
            beat_id: beat.id,
            beat_name: beatName.trim()
          })
          .in('id', retailersToAdd)
          .eq('user_id', user.id);

        if (addError) throw addError;
      }

      // Update beat name for all current retailers in this beat
      const { error: updateNameError } = await supabase
        .from('retailers')
        .update({ beat_name: beatName.trim() })
        .eq('beat_id', beat.id)
        .eq('user_id', user.id);

      if (updateNameError) throw updateNameError;

      toast.success(`Beat "${beatName}" updated successfully`);
      onBeatUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating beat:', error);
      toast.error('Failed to update beat');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBeatName('');
    setTravelAllowance('');
    setAverageKm('');
    setAverageTimeMinutes('');
    setSearchTerm('');
    setSelectedRetailers(new Set());
    onClose();
  };

  const filteredRetailers = retailers.filter(retailer =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.phone.includes(searchTerm)
  );

  const getCurrentBeatName = (retailer: Retailer) => {
    if (!retailer.beat_id || retailer.beat_id === 'unassigned') {
      return 'Unassigned';
    }
    return retailer.beat_name || retailer.beat_id;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Edit Beat: {beat?.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
              {/* Beat Details Form */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="beatName">Beat Name</Label>
                      <Input
                        id="beatName"
                        placeholder="Enter beat name"
                        value={beatName}
                        onChange={(e) => setBeatName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="travelAllowance">Travel Allowance (₹)</Label>
                      <Input
                        id="travelAllowance"
                        type="number"
                        placeholder="0"
                        value={travelAllowance}
                        onChange={(e) => setTravelAllowance(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="averageKm" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Beat Average KM
                      </Label>
                      <Input
                        id="averageKm"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={averageKm}
                        onChange={(e) => setAverageKm(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="averageTime" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Average Time (minutes)
                      </Label>
                      <Input
                        id="averageTime"
                        type="number"
                        placeholder="0"
                        value={averageTimeMinutes}
                        onChange={(e) => setAverageTimeMinutes(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Retailer Management */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Manage Retailers</h3>
                    <Badge variant="secondary">
                      {selectedRetailers.size} selected
                    </Badge>
                  </div>
                  
                  <SearchInput
                    placeholder="Search retailers by name, address, or phone"
                    value={searchTerm}
                    onChange={setSearchTerm}
                  />
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredRetailers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No retailers found
                      </div>
                    ) : (
                      filteredRetailers.map((retailer) => (
                        <div
                          key={retailer.id}
                          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                            selectedRetailers.has(retailer.id) 
                              ? 'border-primary bg-primary/5' 
                              : ''
                          }`}
                          onClick={() => handleRetailerSelection(retailer.id)}
                        >
                          <Checkbox
                            checked={selectedRetailers.has(retailer.id)}
                            onChange={() => handleRetailerSelection(retailer.id)}
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm truncate">
                                  {retailer.name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate">{retailer.address}</span>
                                </div>
                                {retailer.phone && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{retailer.phone}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-1">
                                {retailer.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {retailer.category}
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-xs">
                                  <Truck className="h-3 w-3" />
                                  <span className="text-muted-foreground">
                                    {getCurrentBeatName(retailer)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};