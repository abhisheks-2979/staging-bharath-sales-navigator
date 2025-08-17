import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
}

interface RetailerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  onSuccess: () => void;
}

export const RetailerDetailModal = ({ isOpen, onClose, retailer, onSuccess }: RetailerDetailModalProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Retailer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (retailer) {
      setFormData({ ...retailer });
      setIsEditing(false);
    }
  }, [retailer]);

  const handleSave = async () => {
    if (!formData || !user) return;

    setLoading(true);
    try {
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
        })
        .eq('id', formData.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Retailer updated",
        description: "Changes saved successfully",
      });

      setIsEditing(false);
      onSuccess();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Retailer" : "Retailer Details"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              disabled={!isEditing}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category || ''}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label>Potential</Label>
              <Select 
                value={formData.potential || ''} 
                onValueChange={(v) => setFormData({...formData, potential: v})}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select potential" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Retail Type</Label>
              <Input
                value={formData.retail_type || ''}
                onChange={(e) => setFormData({...formData, retail_type: e.target.value})}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status || ''} 
                onValueChange={(v) => setFormData({...formData, status: v})}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              disabled={!isEditing}
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
            <div><span className="font-medium">Beat:</span> {formData.beat_id}</div>
            <div><span className="font-medium">Created:</span> {new Date(formData.created_at).toLocaleDateString()}</div>
            {formData.last_visit_date && (
              <div><span className="font-medium">Last Visit:</span> {new Date(formData.last_visit_date).toLocaleDateString()}</div>
            )}
          </div>
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
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
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