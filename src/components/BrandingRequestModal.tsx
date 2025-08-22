import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface BrandingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  defaultVisitId?: string | null;
  defaultRetailerId?: string | null;
  defaultPincode?: string | null;
  onCreated?: (id: string) => void;
}

interface RetailerOption { id: string; name: string; address?: string | null }
interface VendorOption { id: string; name: string; region_pincodes: string[]; is_approved: boolean }

export const BrandingRequestModal = ({ isOpen, onClose, onBack, defaultVisitId, defaultRetailerId, defaultPincode, onCreated }: BrandingRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [retailerId, setRetailerId] = useState<string | undefined>(defaultRetailerId || undefined);
  const [visitId, setVisitId] = useState<string | undefined>(defaultVisitId || undefined);
  const [pincode, setPincode] = useState<string>(defaultPincode || "");
  const [assets, setAssets] = useState("");
  const [size, setSize] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [description, setDescription] = useState("");
  const [retailers, setRetailers] = useState<RetailerOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [preferredVendorId, setPreferredVendorId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setAssets("");
    setSize("");
    setBudget("");
    setDescription("");
    setPreferredVendorId(undefined);
  }, [isOpen]);

  useEffect(() => {
    const loadRetailers = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data, error } = await supabase
        .from('retailers')
        .select('id, name, address')
        .eq('user_id', uid)
        .order('name');
      if (!error && data) setRetailers(data as any);
    };
    loadRetailers();
  }, []);

  useEffect(() => {
    const loadVendors = async () => {
      if (!pincode) {
        // Load a small set of approved vendors if no pincode yet
        const { data } = await supabase
          .from('vendors')
          .select('id, name, region_pincodes, is_approved')
          .eq('is_approved', true)
          .limit(10);
        setVendors((data as any) || []);
        return;
      }
      const { data } = await supabase
        .from('vendors')
        .select('id, name, region_pincodes, is_approved')
        .eq('is_approved', true)
        .contains('region_pincodes', [pincode]);
      setVendors((data as any) || []);
    };
    loadVendors();
  }, [pincode]);

  const recommended = useMemo(() => vendors.filter(v => v.is_approved), [vendors]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Not authenticated');
      if (!retailerId) throw new Error('Please select a retailer');

      const payload: any = {
        user_id: uid,
        retailer_id: retailerId,
        visit_id: visitId,
        title: title || 'Branding Request',
        description,
        pincode: pincode || null,
        requested_assets: assets || null,
        size: size || null,
        budget: budget ? Number(budget) : null,
        assigned_vendor_id: preferredVendorId || null,
      };

      const { data, error } = await supabase.from('branding_requests').insert(payload).select('id').single();
      if (error) throw error;

      toast({ title: 'Branding request submitted', description: 'Your request has been created.' });
      onCreated?.(data!.id);
      onClose();
    } catch (err: any) {
      toast({ title: 'Submit failed', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-1 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>Branding Request</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label>Retailer</Label>
              <Select value={retailerId} onValueChange={setRetailerId} disabled={!!defaultRetailerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select retailer" />
                </SelectTrigger>
                <SelectContent>
                  {retailers.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Glow sign board" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Pincode</Label>
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="560001" />
              </div>
              <div className="space-y-1">
                <Label>Budget (₹)</Label>
                <Input type="number" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="10000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Assets</Label>
                <Input value={assets} onChange={(e) => setAssets(e.target.value)} placeholder="Wall, shelf strip..." />
              </div>
              <div className="space-y-1">
                <Label>Size</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="6ft x 3ft" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details/instructions" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Preferred Vendor (optional)</Label>
                {pincode && (
                  <Badge variant="outline">{recommended.length} suggested</Badge>
                )}
              </div>
              <Select value={preferredVendorId} onValueChange={setPreferredVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder={pincode ? "Select from suggested" : "Select vendor (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {recommended.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Request'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandingRequestModal;
