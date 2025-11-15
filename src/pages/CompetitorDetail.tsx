import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, ArrowLeft, Sparkles, BarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CompetitionDataList } from "@/components/competition/CompetitionDataList";
import { CompetitionAISummary } from "@/components/competition/CompetitionAISummary";
import { CompetitionRetailerAnalytics } from "@/components/competition/CompetitionRetailerAnalytics";
import { SKUDetailModal } from "@/components/competition/SKUDetailModal";

interface Competitor {
  id: string;
  competitor_name: string;
  business_background: string;
  key_financial_stats: any;
  focus: string;
  strategy: string;
  website: string;
  sales_team_size: number;
  supply_chain_info: string;
  head_office: string;
  regional_offices_count: number;
  created_at: string;
}

interface CompetitorSKU {
  id: string;
  competitor_id: string;
  sku_name: string;
  unit: string;
  is_active: boolean;
  demand?: string;
  observations?: number;
  avgStock?: string;
}

interface CompetitorContact {
  id: string;
  competitor_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  designation: string;
  hq: string;
  region_covered: string;
  reporting_to: string;
  level: string;
  skill: string;
  competitor_since: number;
  role: string;
  is_active: boolean;
}

export default function CompetitorDetail() {
  const navigate = useNavigate();
  const { competitorId } = useParams();
  const { userRole } = useAuth();
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [skus, setSKUs] = useState<CompetitorSKU[]>([]);
  const [contacts, setContacts] = useState<CompetitorContact[]>([]);
  const [competitionData, setCompetitionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSKUDialogOpen, setIsSKUDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSKUDetailOpen, setIsSKUDetailOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<{ id: string; name: string } | null>(null);

  const [skuForm, setSKUForm] = useState({
    sku_name: "",
    unit: "",
    is_active: true
  });

  const [contactForm, setContactForm] = useState({
    id: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    designation: "",
    hq: "",
    region_covered: "",
    reporting_to: "",
    level: "",
    skill: "",
    competitor_since: new Date().getFullYear(),
    role: "",
    is_active: true
  });

  useEffect(() => {
    if (competitorId) {
      fetchCompetitorDetails(competitorId);
    }
  }, [competitorId]);

  const fetchCompetitorDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data: competitorData, error: competitorError } = await supabase
        .from('competition_master')
        .select('*')
        .eq('id', id)
        .single();

      if (competitorError) throw competitorError;
      setCompetitor(competitorData);

      const [skusRes, contactsRes, dataRes] = await Promise.all([
        supabase.from('competition_skus').select('*').eq('competitor_id', id).order('sku_name'),
        supabase.from('competition_contacts').select('*').eq('competitor_id', id).order('contact_name'),
        supabase.from('competition_data').select(`
          *,
          competition_skus(sku_name, unit),
          retailers(retailer_name, territory)
        `).eq('competitor_id', id).order('created_at', { ascending: false })
      ]);

      if (skusRes.error) throw skusRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (dataRes.error) throw dataRes.error;

      setSKUs(skusRes.data || []);
      setContacts(contactsRes.data || []);
      setCompetitionData(dataRes.data || []);
    } catch (error) {
      console.error('Error fetching competitor details:', error);
      toast({ title: "Error", description: "Failed to load competitor details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSKU = async () => {
    if (!competitor) return;
    try {
      const { error } = await supabase.from('competition_skus').insert([{ competitor_id: competitor.id, ...skuForm }]);
      if (error) throw error;
      toast({ title: "Success", description: "SKU added successfully" });
      setIsSKUDialogOpen(false);
      setSKUForm({ sku_name: "", unit: "", is_active: true });
      fetchCompetitorDetails(competitor.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add SKU", variant: "destructive" });
    }
  };

  const handleAddContact = async () => {
    if (!competitor) return;
    try {
      if (isEditingContact && contactForm.id) {
        const { error } = await supabase.from('competition_contacts').update(contactForm).eq('id', contactForm.id);
        if (error) throw error;
        toast({ title: "Success", description: "Contact updated successfully" });
      } else {
        const { error } = await supabase.from('competition_contacts').insert([{ competitor_id: competitor.id, ...contactForm }]);
        if (error) throw error;
        toast({ title: "Success", description: "Contact added successfully" });
      }
      setIsContactDialogOpen(false);
      setIsEditingContact(false);
      setContactForm({
        id: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        designation: "",
        hq: "",
        region_covered: "",
        reporting_to: "",
        level: "",
        skill: "",
        competitor_since: new Date().getFullYear(),
        role: "",
        is_active: true
      });
      fetchCompetitorDetails(competitor.id);
    } catch (error) {
      toast({ title: "Error", description: isEditingContact ? "Failed to update contact" : "Failed to add contact", variant: "destructive" });
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (userRole !== 'admin') {
      toast({ title: "Permission Denied", description: "Only admins can delete contacts", variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from('competition_contacts').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Contact deleted successfully" });
      if (competitor) fetchCompetitorDetails(competitor.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-4 md:p-8">Loading...</div>;
  if (!competitor) return <div className="p-4 md:p-8">Competitor not found</div>;

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20">
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/competition-master')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-3xl font-bold">{competitor.competitor_name}</h1>
          <p className="text-sm text-muted-foreground">Intelligence Hub</p>
        </div>
      </div>

      <Tabs defaultValue="skus" className="w-full">
        <TabsList className="inline-flex w-full md:grid md:grid-cols-5 gap-1 overflow-x-auto flex-nowrap justify-start bg-muted">
          <TabsTrigger value="skus" className="text-xs md:text-sm whitespace-nowrap shrink-0">SKUs</TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs md:text-sm whitespace-nowrap shrink-0">Contacts</TabsTrigger>
          <TabsTrigger value="data" className="text-xs md:text-sm whitespace-nowrap shrink-0">Stocks</TabsTrigger>
          <TabsTrigger value="ai-summary" className="text-xs md:text-sm whitespace-nowrap shrink-0 flex items-center gap-1">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            <span>AI</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs md:text-sm whitespace-nowrap shrink-0 flex items-center gap-1">
            <BarChart className="h-3 w-3 md:h-4 md:w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skus" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={isSKUDialogOpen} onOpenChange={setIsSKUDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full md:w-auto"><Plus className="h-4 w-4 mr-2" />Add SKU</Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader><DialogTitle>Add New SKU</DialogTitle></DialogHeader>
                <div className="grid gap-4">
                  <div><Label>SKU Name</Label><Input value={skuForm.sku_name} onChange={(e) => setSKUForm({ ...skuForm, sku_name: e.target.value })} /></div>
                  <div><Label>Unit</Label><Input value={skuForm.unit} onChange={(e) => setSKUForm({ ...skuForm, unit: e.target.value })} placeholder="e.g., Bottle, Packet" /></div>
                  <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={skuForm.is_active} onCheckedChange={(checked) => setSKUForm({ ...skuForm, is_active: checked })} /></div>
                  <Button onClick={handleAddSKU}>Add SKU</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skus.map((sku) => (
                  <TableRow key={sku.id}>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium hover:underline"
                        onClick={() => { setSelectedSKU({ id: sku.id, name: sku.sku_name }); setIsSKUDetailOpen(true); }}
                      >
                        {sku.sku_name}
                      </Button>
                    </TableCell>
                    <TableCell>{sku.unit}</TableCell>
                    <TableCell><Badge variant={sku.is_active ? "default" : "secondary"}>{sku.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {skus.map((sku) => (
              <Card key={sku.id}>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold hover:underline text-base text-left"
                        onClick={() => { setSelectedSKU({ id: sku.id, name: sku.sku_name }); setIsSKUDetailOpen(true); }}
                      >
                        {sku.sku_name}
                      </Button>
                      <Badge variant={sku.is_active ? "default" : "secondary"} className="text-xs">
                        {sku.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Unit: {sku.unit}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full md:w-auto"><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{isEditingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1"><Label>Name</Label><Input value={contactForm.contact_name} onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>Phone</Label><Input value={contactForm.contact_phone} onChange={(e) => setContactForm({ ...contactForm, contact_phone: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>Email</Label><Input type="email" value={contactForm.contact_email} onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>Designation</Label><Input value={contactForm.designation} onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>HQ</Label><Input value={contactForm.hq} onChange={(e) => setContactForm({ ...contactForm, hq: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>Region Covered</Label><Input value={contactForm.region_covered} onChange={(e) => setContactForm({ ...contactForm, region_covered: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>Reporting To</Label><Input value={contactForm.reporting_to} onChange={(e) => setContactForm({ ...contactForm, reporting_to: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>Level</Label><Input value={contactForm.level} onChange={(e) => setContactForm({ ...contactForm, level: e.target.value })} placeholder="e.g., Manager, Executive" /></div>
                  <div className="md:col-span-1"><Label>Skill</Label><Input value={contactForm.skill} onChange={(e) => setContactForm({ ...contactForm, skill: e.target.value })} /></div>
                  <div className="md:col-span-1"><Label>With Competitor Since</Label><Input type="number" value={contactForm.competitor_since} onChange={(e) => setContactForm({ ...contactForm, competitor_since: parseInt(e.target.value) || new Date().getFullYear() })} /></div>
                  <div className="md:col-span-1"><Label>Role</Label><Input value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} /></div>
                  <div className="md:col-span-1 flex items-center gap-2"><Label>Active</Label><Switch checked={contactForm.is_active} onCheckedChange={(checked) => setContactForm({ ...contactForm, is_active: checked })} /></div>
                  <div className="md:col-span-2"><Button onClick={handleAddContact} className="w-full">{isEditingContact ? "Update Contact" : "Add Contact"}</Button></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>HQ</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto font-medium hover:underline">
                            {contact.contact_name}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md">
                          <DialogHeader><DialogTitle>Contact Details</DialogTitle></DialogHeader>
                          <div className="grid gap-4">
                            <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{contact.contact_name}</p></div>
                            <div><Label className="text-muted-foreground">Phone</Label><p>{contact.contact_phone}</p></div>
                            <div><Label className="text-muted-foreground">Email</Label><p>{contact.contact_email}</p></div>
                            <div><Label className="text-muted-foreground">Designation</Label><p>{contact.designation}</p></div>
                            <div><Label className="text-muted-foreground">HQ</Label><p>{contact.hq}</p></div>
                            <div><Label className="text-muted-foreground">Region Covered</Label><p>{contact.region_covered}</p></div>
                            <div><Label className="text-muted-foreground">Reporting To</Label><p>{contact.reporting_to}</p></div>
                            <div><Label className="text-muted-foreground">Level</Label><p>{contact.level}</p></div>
                            <div><Label className="text-muted-foreground">Skill</Label><p>{contact.skill}</p></div>
                            <div><Label className="text-muted-foreground">With Competitor Since</Label><p>{contact.competitor_since}</p></div>
                            <div><Label className="text-muted-foreground">Role</Label><p>{contact.role}</p></div>
                            <div><Label className="text-muted-foreground">Status</Label><Badge variant={contact.is_active ? "default" : "secondary"}>{contact.is_active ? "Active" : "Inactive"}</Badge></div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>{contact.role}</TableCell>
                    <TableCell>{contact.level}</TableCell>
                    <TableCell>{contact.hq}</TableCell>
                    <TableCell>{contact.contact_phone}</TableCell>
                    <TableCell><Badge variant={contact.is_active ? "default" : "secondary"}>{contact.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setContactForm(contact); setIsEditingContact(true); setIsContactDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                        {userRole === 'admin' && <Button variant="outline" size="sm" onClick={() => handleDeleteContact(contact.id)}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto font-medium hover:underline text-left text-sm">
                              {contact.contact_name}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-md">
                            <DialogHeader><DialogTitle>Contact Details</DialogTitle></DialogHeader>
                            <div className="grid gap-4">
                              <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{contact.contact_name}</p></div>
                              <div><Label className="text-muted-foreground">Phone</Label><p>{contact.contact_phone}</p></div>
                              <div><Label className="text-muted-foreground">Email</Label><p>{contact.contact_email}</p></div>
                              <div><Label className="text-muted-foreground">Designation</Label><p>{contact.designation}</p></div>
                              <div><Label className="text-muted-foreground">HQ</Label><p>{contact.hq}</p></div>
                              <div><Label className="text-muted-foreground">Region Covered</Label><p>{contact.region_covered}</p></div>
                              <div><Label className="text-muted-foreground">Reporting To</Label><p>{contact.reporting_to}</p></div>
                              <div><Label className="text-muted-foreground">Level</Label><p>{contact.level}</p></div>
                              <div><Label className="text-muted-foreground">Skill</Label><p>{contact.skill}</p></div>
                              <div><Label className="text-muted-foreground">With Competitor Since</Label><p>{contact.competitor_since}</p></div>
                              <div><Label className="text-muted-foreground">Role</Label><p>{contact.role}</p></div>
                              <div><Label className="text-muted-foreground">Status</Label><Badge variant={contact.is_active ? "default" : "secondary"}>{contact.is_active ? "Active" : "Inactive"}</Badge></div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <p className="text-xs text-muted-foreground mt-1">{contact.role}</p>
                      </div>
                      <Badge variant={contact.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                        {contact.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Level: {contact.level}</p>
                      <p>HQ: {contact.hq}</p>
                      <p>Phone: {contact.contact_phone}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContactForm(contact);
                          setIsEditingContact(true);
                          setIsContactDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {userRole === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <CompetitionDataList
            data={competitionData}
            skus={skus}
          />
        </TabsContent>

        <TabsContent value="ai-summary" className="mt-4">
          <CompetitionAISummary
            competitorId={competitor.id}
            competitorName={competitor.competitor_name}
            competitionData={competitionData}
            competitorData={competitor}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <CompetitionRetailerAnalytics
            competitionData={competitionData}
            skus={skus}
          />
        </TabsContent>
      </Tabs>

      <SKUDetailModal
        open={isSKUDetailOpen}
        onOpenChange={setIsSKUDetailOpen}
        skuId={selectedSKU?.id || ""}
        skuName={selectedSKU?.name || ""}
        competitorName={competitor.competitor_name}
      />
    </div>
  );
}
