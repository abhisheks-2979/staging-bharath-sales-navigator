import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Phone, MapPin, Edit2, ExternalLink, TrendingUp, Trash2, ShoppingCart, Check, ChevronsUpDown, FileText, Download, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { fetchAndGenerateInvoice } from "@/utils/invoiceGenerator";

interface RetailerInvoice {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  status: string;
}

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  beat_id: string;
  territory_id?: string | null;
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
  manual_credit_score?: number | null;
  last_order_date?: string | null;
  last_order_value?: number | null;
  avg_monthly_orders_3m?: number | null;
  avg_order_per_visit_3m?: number | null;
  total_visits_3m?: number | null;
  productive_visits_3m?: number | null;
  total_lifetime_order_value?: number | null;
  revenue_growth_12m?: number | null;
  total_order_value_fy?: number | null;
}

interface RetailerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailer: Retailer | null;
  onSuccess: () => void;
  startInEditMode?: boolean;
}

export const RetailerDetailModal = ({ isOpen, onClose, retailer, onSuccess, startInEditMode = false }: RetailerDetailModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Retailer | null>(null);
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [loading, setLoading] = useState(false);
  const [beats, setBeats] = useState<{ beat_id: string; beat_name: string }[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string; region: string }[]>([]);
  const [territoryOpen, setTerritoryOpen] = useState(false);
  const [creditConfig, setCreditConfig] = useState<{is_enabled: boolean, scoring_mode: string} | null>(null);
  const [invoices, setInvoices] = useState<RetailerInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (retailer) {
      setFormData({ ...retailer });
      setIsEditing(startInEditMode);
    }
  }, [retailer, startInEditMode]);

  useEffect(() => {
    if (user && isOpen) {
      loadBeats();
      loadTerritories();
      loadCreditConfig();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (retailer?.id && isOpen) {
      loadInvoices(retailer.id);
    }
  }, [retailer?.id, isOpen]);

  const loadInvoices = async (retailerId: string) => {
    setInvoicesLoading(true);
    try {
      // Fetch orders directly - invoice data is stored in orders table
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, invoice_number, created_at, total_amount, status')
        .eq('retailer_id', retailerId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setInvoices(ordersData || []);
    } catch (error: any) {
      console.error('Error loading invoices:', error);
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string, invoiceNumber: string) => {
    setDownloadingInvoiceId(orderId);
    try {
      const { blob } = await fetchAndGenerateInvoice(orderId);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Invoice Downloaded",
        description: `${invoiceNumber} has been downloaded successfully`,
      });
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download invoice",
        variant: "destructive",
      });
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleSendInvoice = async (orderId: string, invoiceNumber: string) => {
    if (!formData?.phone) {
      toast({
        title: "Cannot Send Invoice",
        description: "Retailer phone number is not available",
        variant: "destructive",
      });
      return;
    }

    setSendingInvoiceId(orderId);
    try {
      // First generate and upload the invoice PDF
      const { blob } = await fetchAndGenerateInvoice(orderId);
      
      // Upload to Supabase storage
      const fileName = `${invoiceNumber}_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, blob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // Send via WhatsApp/SMS - use correct parameter names expected by edge function
      const { error: sendError } = await supabase.functions.invoke('send-invoice-whatsapp', {
        body: {
          invoiceId: orderId,
          customerPhone: formData.phone,
          pdfUrl: publicUrl,
          invoiceNumber
        }
      });

      if (sendError) throw sendError;

      toast({
        title: "Invoice Sent",
        description: `${invoiceNumber} has been sent to ${formData.phone}`,
      });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const loadCreditConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_management_config')
        .select('is_enabled, scoring_mode')
        .single();
      
      if (!error && data) {
        setCreditConfig(data);
      }
    } catch (error) {
      console.error('Error loading credit config:', error);
    }
  };

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

  const loadTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name, region')
        .order('name');
      
      if (error) throw error;
      setTerritories(data || []);
    } catch (error: any) {
      console.error('Error loading territories:', error);
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
          territory_id: formData.territory_id || null,
          manual_credit_score: formData.manual_credit_score,
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
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
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
                
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Territory</Label>
                  {isEditing ? (
                    <Popover open={territoryOpen} onOpenChange={setTerritoryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={territoryOpen}
                          className="h-8 w-full justify-between text-sm"
                        >
                          {formData.territory_id
                            ? territories.find((t) => t.id === formData.territory_id)?.name
                            : "Select territory..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Search territory..." />
                          <CommandList>
                            <CommandEmpty>No territory found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setFormData({...formData, territory_id: null});
                                  setTerritoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    !formData.territory_id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                None
                              </CommandItem>
                              {territories.map((territory) => (
                                <CommandItem
                                  key={territory.id}
                                  onSelect={() => {
                                    setFormData({...formData, territory_id: territory.id});
                                    setTerritoryOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.territory_id === territory.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{territory.name}</span>
                                    <span className="text-xs text-muted-foreground">{territory.region}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {territories.find((t) => t.id === formData.territory_id)?.name || 'Not assigned'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          <Accordion type="multiple" defaultValue={["performance", "owner", "location", "outlet"]} className="w-full">
            {/* Performance Summary - NEW SECTION */}
            <AccordionItem value="performance">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Retailer Performance Summary
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg text-center">
                      <p className="text-xl font-bold text-primary">
                        ₹{(formData.total_lifetime_order_value || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Lifetime Value</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-primary">
                        ₹{((formData.total_order_value_fy || 0) / 6).toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Monthly Sales (6M)</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-primary">
                        {(formData.avg_monthly_orders_3m || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Monthly Orders (3M)</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-xl font-bold text-primary">
                        {(formData.avg_order_per_visit_3m || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Order per Visit</p>
                    </div>
                  </div>

                  {/* Last Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Last Order Date</p>
                      <p className="text-base font-semibold">
                        {formData.last_order_date 
                          ? new Date(formData.last_order_date).toLocaleDateString() 
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Last Order Value</p>
                      <p className="text-base font-semibold text-primary">
                        ₹{(formData.last_order_value || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Visit Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Visits (3 Months)</p>
                      <p className="text-base font-semibold">{formData.total_visits_3m || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Productive Visits (3 Months)</p>
                      <p className="text-base font-semibold">
                        {formData.productive_visits_3m || 0}
                        {formData.total_visits_3m && formData.total_visits_3m > 0 && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ({((formData.productive_visits_3m || 0) / formData.total_visits_3m * 100).toFixed(0)}%)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Owner Details */}
            <AccordionItem value="owner">
              <AccordionTrigger className="text-lg font-semibold">
                Owner Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                        <span className="text-sm font-medium">{formData.name}</span>
                      )}
                    </div>
                  </div>

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

                  {/* Manual Credit Score - Only show when credit management is enabled and mode is manual */}
                  {creditConfig?.is_enabled && creditConfig?.scoring_mode === 'manual' && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Credit Score (Manual)</Label>
                      <div className="flex items-center justify-between group">
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            step="0.1"
                            value={formData.manual_credit_score || ''}
                            onChange={(e) => setFormData({...formData, manual_credit_score: e.target.value ? parseFloat(e.target.value) : null})}
                            className="h-8 text-sm"
                            placeholder="Enter score (0-10)"
                          />
                        ) : (
                          <span className="text-sm">{formData.manual_credit_score ? `${formData.manual_credit_score} / 10` : '-'}</span>
                        )}
                      </div>
                    </div>
                  )}

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


            {/* All Invoices Section */}
            <AccordionItem value="invoices">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Invoices ({invoices.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {invoicesLoading ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading invoices...
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No invoices found for this retailer
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-medium">
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell>
                                {new Date(invoice.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                ₹{(invoice.total_amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={invoice.status === 'confirmed' ? 'default' : invoice.status === 'pending' ? 'secondary' : 'outline'}
                                  className={cn(
                                    invoice.status === 'confirmed' && 'bg-success text-success-foreground',
                                    invoice.status === 'pending' && 'bg-amber-100 text-amber-800'
                                  )}
                                >
                                  {invoice.status || 'pending'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                                    disabled={downloadingInvoiceId === invoice.id}
                                    className="h-7 px-2"
                                    title="Download Invoice"
                                  >
                                    {downloadingInvoiceId === invoice.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Download className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleSendInvoice(invoice.id, invoice.invoice_number)}
                                    disabled={sendingInvoiceId === invoice.id || !formData?.phone}
                                    className="h-7 px-2"
                                    title={formData?.phone ? "Send Invoice via WhatsApp" : "No phone number available"}
                                  >
                                    {sendingInvoiceId === invoice.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Send className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t">
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant="ghost"
              onClick={() => {
                navigate(`/order-entry?phoneOrder=true&retailerId=${formData.id}&retailer=${encodeURIComponent(formData.name)}`);
                onClose();
              }}
              disabled={loading}
              className="h-8 w-8 p-0"
              title="Phone Order"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFormData({ ...retailer! });
                    setIsEditing(false);
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};