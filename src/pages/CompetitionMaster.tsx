import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, ArrowLeft, Users, Sparkles, BarChart } from "lucide-react";
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
  created_at: string;
  sku_count?: number;
  contact_count?: number;
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

export default function CompetitionMaster() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
  const [skus, setSKUs] = useState<CompetitorSKU[]>([]);
  const [contacts, setContacts] = useState<CompetitorContact[]>([]);
  const [competitionData, setCompetitionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSKUDialogOpen, setIsSKUDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSKUDetailOpen, setIsSKUDetailOpen] = useState(false);
  const [selectedSKU, setSelectedSKU] = useState<{ id: string; name: string } | null>(null);

  const [formData, setFormData] = useState({
    competitor_name: "",
    business_background: "",
    key_financial_stats: {}
  });

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
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('competition_master')
        .select('*')
        .order('competitor_name');

      if (error) throw error;
      
      // Get rollup counts for each competitor
      if (data) {
        const competitorsWithCounts = await Promise.all(
          data.map(async (comp) => {
            const [skusRes, contactsRes] = await Promise.all([
              supabase.from('competition_skus').select('id', { count: 'exact', head: true }).eq('competitor_id', comp.id),
              supabase.from('competition_contacts').select('id', { count: 'exact', head: true }).eq('competitor_id', comp.id)
            ]);
            
            return {
              ...comp,
              sku_count: skusRes.count || 0,
              contact_count: contactsRes.count || 0
            };
          })
        );
        setCompetitors(competitorsWithCounts);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load competitors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeSKUDemand = (skus: any[], competitionData: any[]) => {
    const skuDemandData = skus.map(sku => {
      const skuData = competitionData.filter(d => d.sku_id === sku.id);
      const totalStock = skuData.reduce((sum, d) => sum + (d.stock_quantity || 0), 0);
      const avgStock = skuData.length > 0 ? totalStock / skuData.length : 0;
      const observations = skuData.length;

      let demand = 'Low';
      if (observations >= 5 && avgStock > 50) {
        demand = 'High';
      } else if (observations >= 3 && avgStock > 20) {
        demand = 'Medium';
      }

      return {
        ...sku,
        demand,
        observations,
        avgStock: avgStock.toFixed(1)
      };
    });

    setSKUs(skuDemandData);
  };

  const fetchCompetitorDetails = async (competitorId: string) => {
    try {
      const [skusRes, contactsRes, dataRes] = await Promise.all([
        supabase.from('competition_skus').select('*').eq('competitor_id', competitorId),
        supabase.from('competition_contacts').select('*').eq('competitor_id', competitorId),
        supabase.from('competition_data')
          .select('*')
          .eq('competitor_id', competitorId)
          .order('created_at', { ascending: false })
      ]);

      if (skusRes.error) throw skusRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (dataRes.error) throw dataRes.error;

      const retailerIds = [...new Set(dataRes.data?.map(d => d.retailer_id).filter(Boolean) || [])];
      const visitIds = [...new Set(dataRes.data?.map(d => d.visit_id).filter(Boolean) || [])];

      const [retailersRes, visitsRes] = await Promise.all([
        retailerIds.length > 0 
          ? supabase.from('retailers').select('id, name, address, location_tag').in('id', retailerIds)
          : Promise.resolve({ data: [], error: null }),
        visitIds.length > 0
          ? supabase.from('visits').select('id, planned_date, user_id').in('id', visitIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const retailersMap = new Map((retailersRes.data || []).map(r => [r.id, r]));
      const visitsMap = new Map((visitsRes.data || []).map(v => [v.id, v]));

      const enhancedData = dataRes.data?.map(d => ({
        ...d,
        sku_name: skusRes.data?.find(s => s.id === d.sku_id)?.sku_name || 'Unknown',
        retailers: d.retailer_id ? retailersMap.get(d.retailer_id) : null,
        visits: d.visit_id ? visitsMap.get(d.visit_id) : null
      })) || [];

      setContacts(contactsRes.data || []);
      setCompetitionData(enhancedData);
      
      if (skusRes.data && skusRes.data.length > 0) {
        analyzeSKUDemand(skusRes.data, enhancedData);
      } else {
        setSKUs([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load competitor details",
        variant: "destructive"
      });
    }
  };

  const handleAddCompetitor = async () => {
    try {
      const { error } = await supabase.from('competition_master').insert([formData]);
      if (error) throw error;
      toast({ title: "Success", description: "Competitor added successfully" });
      setIsAddDialogOpen(false);
      setFormData({ competitor_name: "", business_background: "", key_financial_stats: {} });
      fetchCompetitors();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add competitor", variant: "destructive" });
    }
  };

  const handleUpdateCompetitor = async () => {
    if (!selectedCompetitor) return;
    try {
      const { error } = await supabase.from('competition_master').update(formData).eq('id', selectedCompetitor.id);
      if (error) throw error;
      toast({ title: "Success", description: "Competitor updated successfully" });
      setIsEditDialogOpen(false);
      fetchCompetitors();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update competitor", variant: "destructive" });
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (userRole !== 'admin') {
      toast({ title: "Permission Denied", description: "Only admins can delete competitors", variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from('competition_master').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Competitor deleted successfully" });
      fetchCompetitors();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete competitor", variant: "destructive" });
    }
  };

  const handleAddSKU = async () => {
    if (!selectedCompetitor) return;
    try {
      const { error } = await supabase.from('competition_skus').insert([{ competitor_id: selectedCompetitor.id, ...skuForm }]);
      if (error) throw error;
      toast({ title: "Success", description: "SKU added successfully" });
      setIsSKUDialogOpen(false);
      setSKUForm({ sku_name: "", unit: "", is_active: true });
      fetchCompetitorDetails(selectedCompetitor.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to add SKU", variant: "destructive" });
    }
  };

  const handleAddContact = async () => {
    if (!selectedCompetitor) return;
    try {
      if (isEditingContact && contactForm.id) {
        const { error } = await supabase.from('competition_contacts').update(contactForm).eq('id', contactForm.id);
        if (error) throw error;
        toast({ title: "Success", description: "Contact updated successfully" });
      } else {
        const { error } = await supabase.from('competition_contacts').insert([{ competitor_id: selectedCompetitor.id, ...contactForm }]);
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
      fetchCompetitorDetails(selectedCompetitor.id);
    } catch (error) {
      toast({ title: "Error", description: isEditingContact ? "Failed to update contact" : "Failed to add contact", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold">Competition Master</h1>
          <p className="text-muted-foreground">Manage competitor information and intelligence</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Competitors</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Competitor</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Competitor</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Competitor Name</Label><Input value={formData.competitor_name} onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })} /></div>
                  <div><Label>Business Background</Label><Textarea value={formData.business_background} onChange={(e) => setFormData({ ...formData, business_background: e.target.value })} /></div>
                  <Button onClick={handleAddCompetitor} className="w-full">Add Competitor</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor Name</TableHead>
                <TableHead># SKUs</TableHead>
                <TableHead># Contacts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium hover:underline"
                      onClick={() => { setSelectedCompetitor(competitor); fetchCompetitorDetails(competitor.id); }}
                    >
                      {competitor.competitor_name}
                    </Button>
                  </TableCell>
                  <TableCell>{competitor.sku_count || 0}</TableCell>
                  <TableCell>{competitor.contact_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setSelectedCompetitor(competitor); setFormData({ competitor_name: competitor.competitor_name, business_background: competitor.business_background, key_financial_stats: competitor.key_financial_stats }); setIsEditDialogOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {userRole === 'admin' && <Button variant="outline" size="sm" onClick={() => handleDeleteCompetitor(competitor.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Competitor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Competitor Name</Label><Input value={formData.competitor_name} onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })} /></div>
            <div><Label>Business Background</Label><Textarea value={formData.business_background} onChange={(e) => setFormData({ ...formData, business_background: e.target.value })} /></div>
            <Button onClick={handleUpdateCompetitor} className="w-full">Update Competitor</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedCompetitor !== null && !isEditDialogOpen} onOpenChange={() => setSelectedCompetitor(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedCompetitor?.competitor_name} - Intelligence Hub</DialogTitle></DialogHeader>
          <Tabs defaultValue="skus" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="skus">SKUs</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="data">Competition Data</TabsTrigger>
              <TabsTrigger value="ai-summary"><Sparkles className="h-4 w-4 mr-1" />AI Summary</TabsTrigger>
              <TabsTrigger value="analytics"><BarChart className="h-4 w-4 mr-1" />Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="skus" className="space-y-4">
              <Dialog open={isSKUDialogOpen} onOpenChange={setIsSKUDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add SKU</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add SKU</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>SKU Name</Label><Input value={skuForm.sku_name} onChange={(e) => setSKUForm({ ...skuForm, sku_name: e.target.value })} /></div>
                    <div><Label>Unit</Label><Input value={skuForm.unit} onChange={(e) => setSKUForm({ ...skuForm, unit: e.target.value })} /></div>
                    <div className="flex items-center space-x-2">
                      <Switch checked={skuForm.is_active} onCheckedChange={(checked) => setSKUForm({ ...skuForm, is_active: checked })} />
                      <Label>Active</Label>
                    </div>
                    <Button onClick={handleAddSKU} className="w-full">Add SKU</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Demand</TableHead>
                    <TableHead>Observations</TableHead>
                    <TableHead>Avg Stock</TableHead>
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
                      <TableCell><Badge variant={sku.demand === 'High' ? 'destructive' : sku.demand === 'Medium' ? 'default' : 'secondary'}>{sku.demand || 'Not Analyzed'}</Badge></TableCell>
                      <TableCell>{sku.observations || 0}</TableCell>
                      <TableCell>{sku.avgStock || '0'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <Dialog open={isContactDialogOpen} onOpenChange={(open) => { setIsContactDialogOpen(open); if (!open) { setIsEditingContact(false); setContactForm({ id: "", contact_name: "", contact_phone: "", contact_email: "", designation: "", hq: "", region_covered: "", reporting_to: "", level: "", skill: "", competitor_since: new Date().getFullYear(), role: "", is_active: true }); } }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Contact</Button></DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{isEditingContact ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Contact Name</Label><Input value={contactForm.contact_name} onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })} /></div>
                    <div><Label>Phone</Label><Input value={contactForm.contact_phone} onChange={(e) => setContactForm({ ...contactForm, contact_phone: e.target.value })} /></div>
                    <div><Label>Email</Label><Input value={contactForm.contact_email} onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })} /></div>
                    <div><Label>Designation</Label><Input value={contactForm.designation} onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })} /></div>
                    <div><Label>HQ (Base Location)</Label><Input value={contactForm.hq} onChange={(e) => setContactForm({ ...contactForm, hq: e.target.value })} /></div>
                    <div><Label>Region Covered</Label><Input value={contactForm.region_covered} onChange={(e) => setContactForm({ ...contactForm, region_covered: e.target.value })} /></div>
                    <div><Label>Reporting To</Label><Input value={contactForm.reporting_to} onChange={(e) => setContactForm({ ...contactForm, reporting_to: e.target.value })} /></div>
                    <div>
                      <Label>Level</Label>
                      <Select value={contactForm.level} onValueChange={(value) => setContactForm({ ...contactForm, level: value })}>
                        <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Junior">Junior</SelectItem>
                          <SelectItem value="Middle">Middle</SelectItem>
                          <SelectItem value="Senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Skill</Label>
                      <Select value={contactForm.skill} onValueChange={(value) => setContactForm({ ...contactForm, skill: value })}>
                        <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Average">Average</SelectItem>
                          <SelectItem value="Not sure">Not sure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Competitor Since (Year)</Label><Input type="number" value={contactForm.competitor_since} onChange={(e) => setContactForm({ ...contactForm, competitor_since: parseInt(e.target.value) || new Date().getFullYear() })} /></div>
                    <div>
                      <Label>Role</Label>
                      <Select value={contactForm.role} onValueChange={(value) => setContactForm({ ...contactForm, role: value })}>
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Field Sales">Field Sales</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Product Management">Product Management</SelectItem>
                          <SelectItem value="Supply Chain">Supply Chain</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Leadership">Leadership</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch checked={contactForm.is_active} onCheckedChange={(checked) => setContactForm({ ...contactForm, is_active: checked })} />
                      <Label>Active</Label>
                    </div>
                    <div className="col-span-2">
                      <Button onClick={handleAddContact} className="w-full">{isEditingContact ? "Update Contact" : "Add Contact"}</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                          <DialogContent>
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
                          {userRole === 'admin' && <Button variant="outline" size="sm" onClick={async () => { if (confirm("Delete this contact?")) { await supabase.from('competition_contacts').delete().eq('id', contact.id); fetchCompetitorDetails(selectedCompetitor?.id || ''); toast({ title: "Success", description: "Contact deleted" }); } }}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="data"><CompetitionDataList data={competitionData} skus={skus} /></TabsContent>
            <TabsContent value="ai-summary"><CompetitionAISummary competitorId={selectedCompetitor?.id || ''} competitorName={selectedCompetitor?.competitor_name || ''} competitionData={competitionData} /></TabsContent>
            <TabsContent value="analytics"><CompetitionRetailerAnalytics competitionData={competitionData} skus={skus} /></TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Competitor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Competitor Name</Label><Input value={formData.competitor_name} onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })} /></div>
            <div><Label>Business Background</Label><Textarea value={formData.business_background} onChange={(e) => setFormData({ ...formData, business_background: e.target.value })} /></div>
            <Button onClick={handleUpdateCompetitor} className="w-full">Update Competitor</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedSKU && (
        <SKUDetailModal
          open={isSKUDetailOpen}
          onOpenChange={setIsSKUDetailOpen}
          skuId={selectedSKU.id}
          skuName={selectedSKU.name}
          competitorName={selectedCompetitor?.competitor_name || ''}
        />
      )}
    </div>
  );
}
