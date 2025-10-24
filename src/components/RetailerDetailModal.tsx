import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Phone, MapPin, Edit2, ExternalLink } from "lucide-react";

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  beat_id: string;
  created_at: string;
  last_visit_date?: string | null;
  notes?: string | null;
  parent_type?: string | null;
  parent_name?: string | null;
  location_tag?: string | null;
  retail_type?: string | null;
  potential?: string | null;
  competitors?: string[] | null;
  gst_number?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photo_url?: string | null;
  order_value?: number | null;
}

interface RetailerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  onSuccess: () => void;
  startInEditMode?: boolean;
}

export const RetailerDetailModal = ({ isOpen, onClose, retailer, onSuccess, startInEditMode = true }: RetailerDetailModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Retailer | null>(null);
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [loading, setLoading] = useState(false);
  const [beats, setBeats] = useState<{ beat_id: string; beat_name: string }[]>([]);

  useEffect(() => {
    if (retailer) {
      setFormData({ ...retailer });
      setIsEditing(startInEditMode);
    }
  }, [retailer, startInEditMode]);

  useEffect(() => {
    if (user && isOpen) {
      loadBeats();
    }
  }, [user, isOpen]);

  const loadBeats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('beat_id, beat_name')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('beat_name');
      
      if (error) throw error;
      setBeats(data || []);
    } catch (error: any) {
      console.error('Error loading beats:', error);
    }
  };

  const handleSave = async () => {
    if (!formData || !user) return;

    setLoading(true);
    try {
      const selectedBeat = beats.find(b => b.beat_id === formData.beat_id);
      
      const { error } = await supabase
        .from('retailers')
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          category: formData.category,
          priority: formData.priority,
          status: formData.status,
          notes: formData.notes,
          parent_type: formData.parent_type,
          parent_name: formData.parent_name,
          location_tag: formData.location_tag,
          retail_type: formData.retail_type,
          potential: formData.potential,
          competitors: formData.competitors,
          gst_number: formData.gst_number,
          latitude: formData.latitude,
          longitude: formData.longitude,
          beat_id: formData.beat_id,
          beat_name: selectedBeat?.beat_name || formData.beat_id,
        })
        .eq('id', formData.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Retailer updated",
        description: "Changes saved successfully",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formData || !user) return;

    if (!window.confirm(`Delete ${formData.name}? This cannot be undone.`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('retailers')
        .delete()
        .eq('id', formData.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Retailer deleted",
        description: `${formData.name} has been removed`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!formData) return null;

  const getGoogleMapsLink = () => {
    if (formData.latitude && formData.longitude) {
      return `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Retailer Overview</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Photo and Name Section */}
          <div className="flex items-center gap-4 pb-4 border-b">
            {formData.photo_url && (
              <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-border flex-shrink-0">
                <img 
                  src={formData.photo_url} 
                  alt={formData.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{formData.name}</h3>
              <div className="space-y-1 mt-2">
                <Label className="text-xs text-muted-foreground">Beat</Label>
                {isEditing ? (
                  <Select 
                    value={formData.beat_id || ''} 
                    onValueChange={(v) => setFormData({...formData, beat_id: v})}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select beat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {beats.map((beat) => (
                        <SelectItem key={beat.beat_id} value={beat.beat_id}>
                          {beat.beat_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {formData.beat_id || 'Unassigned'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          <Accordion type="multiple" defaultValue={["owner", "outlet", "location"]} className="w-full">
            {/* Owner Details */}
            <AccordionItem value="owner">
              <AccordionTrigger className="text-lg font-semibold">
                Owner Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Owner's Number</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter phone number"
                        />
                      ) : formData.phone ? (
                        <a 
                          href={`tel:${formData.phone.replace(/\s+/g, '')}`}
                          className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone size={14} className="text-primary" />
                          <span>{formData.phone}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Owner's Name</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="h-8 text-sm"
                        />
                      ) : (
                        <span className="text-sm">{formData.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Last Order Date</Label>
                    <div className="flex items-center justify-between group">
                      <span className="text-sm">
                        {formData.last_visit_date 
                          ? new Date(formData.last_visit_date).toLocaleDateString() 
                          : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Last Order Value</Label>
                    <div className="flex items-center justify-between group">
                      <span className="text-sm">
                        {formData.order_value ? `₹${formData.order_value.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">GST Number</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.gst_number || ''}
                          onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter GST number"
                        />
                      ) : (
                        <span className="text-sm">{formData.gst_number || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Outlet Details */}
            <AccordionItem value="outlet">
              <AccordionTrigger className="text-lg font-semibold">
                Outlet Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Outlet Type</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.retail_type || ''}
                          onChange={(e) => setFormData({...formData, retail_type: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter outlet type"
                        />
                      ) : (
                        <span className="text-sm">{formData.retail_type || '-'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.category || ''}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter category"
                        />
                      ) : (
                        <span className="text-sm">{formData.category || '-'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Potential</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Select 
                          value={formData.potential || ''} 
                          onValueChange={(v) => setFormData({...formData, potential: v})}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select potential" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm capitalize">{formData.potential || '-'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Select 
                          value={formData.status || ''} 
                          onValueChange={(v) => setFormData({...formData, status: v})}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm capitalize">{formData.status || '-'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parent Type</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.parent_type || ''}
                          onChange={(e) => setFormData({...formData, parent_type: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter parent type"
                        />
                      ) : (
                        <span className="text-sm">{formData.parent_type || '-'}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Parent Name</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.parent_name || ''}
                          onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter parent name"
                        />
                      ) : (
                        <span className="text-sm">{formData.parent_name || '-'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Location Details */}
            <AccordionItem value="location">
              <AccordionTrigger className="text-lg font-semibold">
                Location Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <div className="flex items-center justify-between group">
{isEditing ? (
  <Input
    value={formData.address}
    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
    className="h-8 text-sm"
  />
) : (
  <a
    href={(getGoogleMapsLink() || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.address || '')}`)}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-primary hover:underline break-words"
    onClick={(e) => e.stopPropagation()}
    title="Open in Google Maps"
  >
    {formData.address}
  </a>
)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Location Tag</Label>
                    <div className="flex items-center justify-between group">
                      {isEditing ? (
                        <Input
                          value={formData.location_tag || ''}
                          onChange={(e) => setFormData({...formData, location_tag: e.target.value})}
                          className="h-8 text-sm"
                          placeholder="Enter location tag"
                        />
                      ) : (
                        <span className="text-sm">{formData.location_tag || '-'}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Latitude</Label>
                      <div className="flex items-center justify-between group">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="any"
                            value={formData.latitude || ''}
                            onChange={(e) => setFormData({...formData, latitude: e.target.value ? parseFloat(e.target.value) : null})}
                            className="h-8 text-sm"
                            placeholder="Enter latitude"
                          />
                        ) : (
                          <span className="text-sm">{formData.latitude || '-'}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Longitude</Label>
                      <div className="flex items-center justify-between group">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="any"
                            value={formData.longitude || ''}
                            onChange={(e) => setFormData({...formData, longitude: e.target.value ? parseFloat(e.target.value) : null})}
                            className="h-8 text-sm"
                            placeholder="Enter longitude"
                          />
                        ) : (
                          <span className="text-sm">{formData.longitude || '-'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {getGoogleMapsLink() && (
                    <div className="pt-2">
                      <a
                        href={getGoogleMapsLink()!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <MapPin size={16} />
                        <span>View on Google Maps</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div>
            {isEditing && (
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({ ...retailer! });
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};