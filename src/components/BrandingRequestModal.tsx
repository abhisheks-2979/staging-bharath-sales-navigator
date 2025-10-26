import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ImageMeasurement } from "@/components/ImageMeasurement";

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
  
  // New fields
  const [dueDate, setDueDate] = useState("");
  const [contractDocUrl, setContractDocUrl] = useState("");
  const [measurementPhotoUrls, setMeasurementPhotoUrls] = useState<string[]>([]);
  const [implementationDate, setImplementationDate] = useState("");
  const [implementationPhotoUrls, setImplementationPhotoUrls] = useState<string[]>([]);
  const [retailerFeedback, setRetailerFeedback] = useState("");
  const [orderImpact, setOrderImpact] = useState("");
  const [vendorDueDate, setVendorDueDate] = useState("");
  const [vendorBudget, setVendorBudget] = useState("");
  const [vendorConfirmation, setVendorConfirmation] = useState("");
  const [vendorRating, setVendorRating] = useState<number>(0);
  const [vendorFeedback, setVendorFeedback] = useState("");
  const [contractUploading, setContractUploading] = useState(false);
  const [implementationUploading, setImplementationUploading] = useState(false);

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
      try {
        if (!pincode) {
          // Load a small set of approved vendors if no pincode yet
          const { data, error } = await supabase.rpc('get_public_vendors');
          if (error) throw error;
          setVendors((data as any) || []);
          return;
        }
        // For pincode-based filtering, use the secure function and filter client-side
        const { data, error } = await supabase.rpc('get_public_vendors');
        if (error) throw error;
        const filteredData = (data || []).filter(vendor => 
          vendor.region_pincodes?.includes(pincode)
        );
        setVendors(filteredData as any);
      } catch (error) {
        console.error('Error loading vendors:', error);
        setVendors([]);
      }
    };
    loadVendors();
  }, [pincode]);

  const recommended = useMemo(() => vendors.filter(v => v.is_approved), [vendors]);

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContractUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('branding-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding-documents')
        .getPublicUrl(fileName);

      setContractDocUrl(publicUrl);
      toast({ title: "Contract uploaded", description: "Document uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setContractUploading(false);
    }
  };

  const handleImplementationPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImplementationUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('branding-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('branding-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setImplementationPhotoUrls([...implementationPhotoUrls, ...uploadedUrls]);
      toast({ title: "Photos uploaded", description: `${uploadedUrls.length} photo(s) added` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setImplementationUploading(false);
    }
  };

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
        due_date: dueDate || null,
        contract_document_url: contractDocUrl || null,
        measurement_photo_urls: measurementPhotoUrls,
        implementation_date: implementationDate || null,
        implementation_photo_urls: implementationPhotoUrls,
        retailer_feedback_on_branding: retailerFeedback || null,
        order_impact_notes: orderImpact || null,
        vendor_due_date: vendorDueDate || null,
        vendor_budget: vendorBudget ? Number(vendorBudget) : null,
        vendor_confirmation_status: vendorConfirmation || null,
        vendor_rating: vendorRating > 0 ? vendorRating : null,
        vendor_feedback: vendorFeedback || null,
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

  const assetOptions = [
    "Name board",
    "Paint side walls",
    "Instore marketing board",
    "Free samples",
    "Shelf branding",
    "Window graphics",
    "Floor graphics",
    "Banner stands",
    "Posters",
    "Other"
  ];

  const vendorConfirmationOptions = [
    "Pending",
    "Confirmed",
    "In Progress",
    "Completed",
    "Rejected"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="vendor">Vendor Details</TabsTrigger>
            <TabsTrigger value="implementation">Implementation</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label>Retailer *</Label>
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
                  <Label>Assets *</Label>
                  <Select value={assets} onValueChange={setAssets}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Due Date to Implement</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Size (editable)</Label>
                <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Will be auto-filled from measurement or enter manually" />
              </div>

              <Separator />

              <ImageMeasurement 
                onMeasurementComplete={(measuredSize, urls) => {
                  setSize(measuredSize);
                  setMeasurementPhotoUrls(urls);
                }}
                existingUrls={measurementPhotoUrls}
              />

              <Separator />

              <div className="space-y-1">
                <Label>Contract Document (Retailer Approval)</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleContractUpload}
                    disabled={contractUploading}
                  />
                  {contractDocUrl && (
                    <Badge variant="outline" className="whitespace-nowrap">Uploaded</Badge>
                  )}
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
          </TabsContent>

          <TabsContent value="vendor" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Vendor Due Date to Execute</Label>
                  <Input type="date" value={vendorDueDate} onChange={(e) => setVendorDueDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Vendor Budget (₹)</Label>
                  <Input type="number" value={vendorBudget} onChange={(e) => setVendorBudget(e.target.value)} placeholder="Vendor quote" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Vendor Confirmation Status</Label>
                <Select value={vendorConfirmation} onValueChange={setVendorConfirmation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorConfirmationOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Vendor Rating (from Sales Team)</Label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Button
                      key={star}
                      type="button"
                      variant={vendorRating >= star ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVendorRating(star)}
                    >
                      <Star className={`h-4 w-4 ${vendorRating >= star ? 'fill-current' : ''}`} />
                    </Button>
                  ))}
                  {vendorRating > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVendorRating(0)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Vendor Feedback</Label>
                <Textarea 
                  value={vendorFeedback} 
                  onChange={(e) => setVendorFeedback(e.target.value)} 
                  placeholder="Feedback on vendor performance, quality, timeliness, etc."
                  rows={4}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="implementation" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label>Implementation Date</Label>
                <Input type="date" value={implementationDate} onChange={(e) => setImplementationDate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Implementation Photos</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('implementation-photos')?.click()}
                    disabled={implementationUploading}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {implementationUploading ? 'Uploading...' : 'Upload Post-Implementation Photos'}
                  </Button>
                  <input
                    id="implementation-photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImplementationPhotos}
                    className="hidden"
                  />
                  {implementationPhotoUrls.length > 0 && (
                    <Badge>{implementationPhotoUrls.length} photo(s)</Badge>
                  )}
                </div>
              </div>

              {implementationPhotoUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {implementationPhotoUrls.map((url, idx) => (
                    <img key={idx} src={url} alt={`Implementation ${idx + 1}`} className="w-full h-24 object-cover rounded" />
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <Label>Retailer Feedback on Branding</Label>
                <Textarea 
                  value={retailerFeedback} 
                  onChange={(e) => setRetailerFeedback(e.target.value)} 
                  placeholder="What does the retailer think about the branding?"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label>Impact on Orders (Post-Branding)</Label>
                <Textarea 
                  value={orderImpact} 
                  onChange={(e) => setOrderImpact(e.target.value)} 
                  placeholder="How has the branding affected order volumes? Any observable trends?"
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Request'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrandingRequestModal;
