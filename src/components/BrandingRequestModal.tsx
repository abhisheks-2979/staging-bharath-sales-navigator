import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, Star, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ImageMeasurement } from "@/components/ImageMeasurement";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

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

interface AssetLineItem {
  id: string;
  assetType: string;
  dueDate: string;
  preferredVendor: string;
  vendorConfirmationStatus: string;
  vendorBudget: string;
}

export const BrandingRequestModal = ({ isOpen, onClose, onBack, defaultVisitId, defaultRetailerId, defaultPincode, onCreated }: BrandingRequestModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [retailerId, setRetailerId] = useState<string | undefined>(defaultRetailerId || undefined);
  const [visitId, setVisitId] = useState<string | undefined>(defaultVisitId || undefined);
  const [pincode, setPincode] = useState<string>(defaultPincode || "");
  const [size, setSize] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [description, setDescription] = useState("");
  const [retailers, setRetailers] = useState<RetailerOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [preferredVendorId, setPreferredVendorId] = useState<string | undefined>(undefined);
  
  // Asset Line Items
  const [assetLineItems, setAssetLineItems] = useState<AssetLineItem[]>([]);
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [currentAsset, setCurrentAsset] = useState<AssetLineItem>({
    id: '',
    assetType: '',
    dueDate: '',
    preferredVendor: '',
    vendorConfirmationStatus: 'Pending',
    vendorBudget: ''
  });
  
  // New fields
  const [contractDocUrl, setContractDocUrl] = useState("");
  const [measurementPhotoUrls, setMeasurementPhotoUrls] = useState<string[]>([]);
  const [implementationDate, setImplementationDate] = useState("");
  const [implementationPhotoUrls, setImplementationPhotoUrls] = useState<string[]>([]);
  const [retailerFeedback, setRetailerFeedback] = useState("");
  const [orderImpact, setOrderImpact] = useState("");
  const [vendorRating, setVendorRating] = useState<number>(0);
  const [vendorFeedback, setVendorFeedback] = useState("");
  const [contractUploading, setContractUploading] = useState(false);
  const [implementationUploading, setImplementationUploading] = useState(false);
  const [itemsCollapsed, setItemsCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setSize("");
    setBudget("");
    setDescription("");
    setPreferredVendorId(undefined);
    setAssetLineItems([]);
    setShowAddAssetForm(false);
    setCurrentAsset({
      id: '',
      assetType: '',
      dueDate: '',
      preferredVendor: '',
      vendorConfirmationStatus: 'Pending',
      vendorBudget: ''
    });
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

  const handleAddAsset = () => {
    if (!currentAsset.assetType) {
      toast({ title: 'Asset type required', variant: 'destructive' });
      return;
    }
    
    if (editingAssetId) {
      setAssetLineItems(assetLineItems.map(item => 
        item.id === editingAssetId ? currentAsset : item
      ));
      toast({ title: 'Asset updated' });
    } else {
      const newItem = { ...currentAsset, id: crypto.randomUUID() };
      setAssetLineItems([...assetLineItems, newItem]);
      toast({ title: 'Asset added' });
    }
    
    setShowAddAssetForm(false);
    setEditingAssetId(null);
    setCurrentAsset({
      id: '',
      assetType: '',
      dueDate: '',
      preferredVendor: '',
      vendorConfirmationStatus: 'Pending',
      vendorBudget: ''
    });
  };

  const handleEditAsset = (item: AssetLineItem) => {
    setCurrentAsset(item);
    setEditingAssetId(item.id);
    setShowAddAssetForm(true);
  };

  const handleDeleteAsset = (id: string) => {
    setAssetLineItems(assetLineItems.filter(item => item.id !== id));
    toast({ title: 'Asset removed' });
  };

  const getProgressForStatus = (status: string): number => {
    switch (status) {
      case 'Pending': return 0;
      case 'Confirmed': return 25;
      case 'In Progress': return 50;
      case 'Completed': return 100;
      case 'Rejected': return 0;
      default: return 0;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Not authenticated');
      if (!retailerId) throw new Error('Please select a retailer');
      if (assetLineItems.length === 0) throw new Error('Please add at least one asset');

      const payload: any = {
        user_id: uid,
        retailer_id: retailerId,
        visit_id: visitId,
        title: title || 'Branding Request',
        description,
        pincode: pincode || null,
        size: size || null,
        budget: budget ? Number(budget) : null,
        assigned_vendor_id: preferredVendorId || null,
        contract_document_url: contractDocUrl || null,
        measurement_photo_urls: measurementPhotoUrls,
        implementation_date: implementationDate || null,
        implementation_photo_urls: implementationPhotoUrls,
        retailer_feedback_on_branding: retailerFeedback || null,
        order_impact_notes: orderImpact || null,
        vendor_rating: vendorRating > 0 ? vendorRating : null,
        vendor_feedback: vendorFeedback || null,
      };

      const { data, error } = await supabase.from('branding_requests').insert(payload).select('id').single();
      if (error) throw error;

      // Insert line items
      const itemsPayload = assetLineItems.map(item => ({
        branding_request_id: data.id,
        asset_type: item.assetType,
        due_date: item.dueDate || null,
        preferred_vendor: item.preferredVendor || null,
        vendor_confirmation_status: item.vendorConfirmationStatus,
        vendor_budget: item.vendorBudget ? Number(item.vendorBudget) : null,
      }));

      const { error: itemsError } = await supabase.from('branding_request_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

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
            <TabsTrigger value="status">Status Info</TabsTrigger>
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

              <Separator className="my-4" />

              {/* Asset Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Assets</Label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddAssetForm(true)}
                    className="h-8 w-8 rounded-full p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {showAddAssetForm && (
                  <Card className="border-primary/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="space-y-1">
                        <Label>Asset Type *</Label>
                        <Select value={currentAsset.assetType} onValueChange={(val) => setCurrentAsset({...currentAsset, assetType: val})}>
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label>Due Date</Label>
                          <Input type="date" value={currentAsset.dueDate} onChange={(e) => setCurrentAsset({...currentAsset, dueDate: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label>Vendor Budget (₹)</Label>
                          <Input type="number" value={currentAsset.vendorBudget} onChange={(e) => setCurrentAsset({...currentAsset, vendorBudget: e.target.value})} placeholder="0" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label>Preferred Vendor (optional)</Label>
                        <Input value={currentAsset.preferredVendor} onChange={(e) => setCurrentAsset({...currentAsset, preferredVendor: e.target.value})} placeholder="Vendor name" />
                      </div>

                      <div className="space-y-1">
                        <Label>Vendor Confirmation Status</Label>
                        <Select value={currentAsset.vendorConfirmationStatus} onValueChange={(val) => setCurrentAsset({...currentAsset, vendorConfirmationStatus: val})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {vendorConfirmationOptions.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowAddAssetForm(false);
                            setEditingAssetId(null);
                            setCurrentAsset({
                              id: '',
                              assetType: '',
                              dueDate: '',
                              preferredVendor: '',
                              vendorConfirmationStatus: 'Pending',
                              vendorBudget: ''
                            });
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={handleAddAsset}>
                          {editingAssetId ? 'Update' : 'Add'} Asset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {assetLineItems.length > 0 && (
                  <div className="space-y-2">
                    {assetLineItems.map((item) => (
                      <Card key={item.id}>
                        <Collapsible open={!itemsCollapsed[item.id]} onOpenChange={(open) => setItemsCollapsed({...itemsCollapsed, [item.id]: !open})}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    {itemsCollapsed[item.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                  </Button>
                                </CollapsibleTrigger>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{item.assetType}</p>
                                  <Badge variant={item.vendorConfirmationStatus === 'Rejected' ? 'destructive' : 'secondary'} className="text-xs mt-1">
                                    {item.vendorConfirmationStatus}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditAsset(item)}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteAsset(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <CollapsibleContent className="mt-3 space-y-2 text-sm">
                              {item.dueDate && <div className="flex justify-between"><span className="text-muted-foreground">Due Date:</span><span>{new Date(item.dueDate).toLocaleDateString()}</span></div>}
                              {item.preferredVendor && <div className="flex justify-between"><span className="text-muted-foreground">Vendor:</span><span>{item.preferredVendor}</span></div>}
                              {item.vendorBudget && <div className="flex justify-between"><span className="text-muted-foreground">Budget:</span><span>₹{Number(item.vendorBudget).toLocaleString()}</span></div>}
                            </CollapsibleContent>
                          </CardContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-4">
              {assetLineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No assets added yet. Add assets in the Basic Info tab.</p>
                </div>
              ) : (
                assetLineItems.map((item) => {
                  const progress = getProgressForStatus(item.vendorConfirmationStatus);
                  const isRejected = item.vendorConfirmationStatus === 'Rejected';
                  
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{item.assetType}</h4>
                            {item.preferredVendor && (
                              <p className="text-sm text-muted-foreground mt-1">Vendor: {item.preferredVendor}</p>
                            )}
                          </div>
                          <Badge variant={isRejected ? 'destructive' : 'secondary'}>
                            {item.vendorConfirmationStatus}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={isRejected ? '[&>div]:bg-destructive' : ''}
                          />
                        </div>

                        {item.dueDate && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Due Date:</span>
                            <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}

                        {item.vendorBudget && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Budget:</span>
                            <span className="font-medium">₹{Number(item.vendorBudget).toLocaleString()}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}

              <Separator className="my-4" />

              <div className="space-y-3">
                <Label className="text-base font-semibold">Vendor Rating & Feedback</Label>
                
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
