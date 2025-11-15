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
import { Plus, Edit, Trash2, ArrowLeft, Users, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Competitor {
  id: string;
  competitor_name: string;
  business_background: string;
  key_financial_stats: any;
  created_at: string;
}

interface CompetitorSKU {
  id: string;
  competitor_id: string;
  sku_name: string;
  unit: string;
}

interface CompetitorContact {
  id: string;
  competitor_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  designation: string;
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

  // Form states
  const [formData, setFormData] = useState({
    competitor_name: "",
    business_background: "",
    key_financial_stats: {}
  });

  const [skuForm, setSKUForm] = useState({
    sku_name: "",
    unit: ""
  });

  const [contactForm, setContactForm] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    designation: ""
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
      setCompetitors(data || []);
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

  const fetchCompetitorDetails = async (competitorId: string) => {
    try {
      const [skusRes, contactsRes, dataRes] = await Promise.all([
        supabase.from('competition_skus').select('*').eq('competitor_id', competitorId),
        supabase.from('competition_contacts').select('*').eq('competitor_id', competitorId),
        supabase.from('competition_data')
          .select(`
            *,
            retailers(name),
            visits(visit_date)
          `)
          .eq('competitor_id', competitorId)
          .order('created_at', { ascending: false })
      ]);

      if (skusRes.error) throw skusRes.error;
      if (contactsRes.error) throw contactsRes.error;
      if (dataRes.error) throw dataRes.error;

      setSKUs(skusRes.data || []);
      setContacts(contactsRes.data || []);
      setCompetitionData(dataRes.data || []);
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
      const { error } = await supabase
        .from('competition_master')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Competitor added successfully"
      });

      setIsAddDialogOpen(false);
      setFormData({ competitor_name: "", business_background: "", key_financial_stats: {} });
      fetchCompetitors();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to add competitor",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCompetitor = async () => {
    if (!selectedCompetitor) return;

    try {
      const { error } = await supabase
        .from('competition_master')
        .update(formData)
        .eq('id', selectedCompetitor.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Competitor updated successfully"
      });

      setIsEditDialogOpen(false);
      setSelectedCompetitor(null);
      setFormData({ competitor_name: "", business_background: "", key_financial_stats: {} });
      fetchCompetitors();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to update competitor",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competitor?')) return;

    try {
      const { error } = await supabase
        .from('competition_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Competitor deleted successfully"
      });

      fetchCompetitors();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to delete competitor",
        variant: "destructive"
      });
    }
  };

  const handleAddSKU = async () => {
    if (!selectedCompetitor) return;

    try {
      const { error } = await supabase
        .from('competition_skus')
        .insert([{ ...skuForm, competitor_id: selectedCompetitor.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "SKU added successfully"
      });

      setIsSKUDialogOpen(false);
      setSKUForm({ sku_name: "", unit: "" });
      fetchCompetitorDetails(selectedCompetitor.id);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to add SKU",
        variant: "destructive"
      });
    }
  };

  const handleAddContact = async () => {
    if (!selectedCompetitor) return;

    try {
      const { error } = await supabase
        .from('competition_contacts')
        .insert([{ ...contactForm, competitor_id: selectedCompetitor.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully"
      });

      setIsContactDialogOpen(false);
      setContactForm({ contact_name: "", contact_phone: "", contact_email: "", designation: "" });
      fetchCompetitorDetails(selectedCompetitor.id);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    setFormData({
      competitor_name: competitor.competitor_name,
      business_background: competitor.business_background || "",
      key_financial_stats: competitor.key_financial_stats || {}
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsDialog = (competitor: Competitor) => {
    setSelectedCompetitor(competitor);
    fetchCompetitorDetails(competitor.id);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Competition Master</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Competitors</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Competitor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Competitor Name</Label>
                  <Input
                    value={formData.competitor_name}
                    onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Business Background</Label>
                  <Textarea
                    value={formData.business_background}
                    onChange={(e) => setFormData({ ...formData, business_background: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddCompetitor} className="w-full">Add Competitor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor Name</TableHead>
                <TableHead>Business Background</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell className="font-medium">{competitor.competitor_name}</TableCell>
                  <TableCell>{competitor.business_background || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsDialog(competitor)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(competitor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompetitor(competitor.id)}
                        disabled={userRole !== 'admin'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Competitor Name</Label>
              <Input
                value={formData.competitor_name}
                onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Business Background</Label>
              <Textarea
                value={formData.business_background}
                onChange={(e) => setFormData({ ...formData, business_background: e.target.value })}
              />
            </div>
            <Button onClick={handleUpdateCompetitor} className="w-full">Update Competitor</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={selectedCompetitor !== null && !isEditDialogOpen} onOpenChange={() => setSelectedCompetitor(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedCompetitor?.competitor_name} - Details</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="skus">
            <TabsList>
              <TabsTrigger value="skus">SKUs</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
              <TabsTrigger value="data">Competition Data</TabsTrigger>
            </TabsList>
            <TabsContent value="skus">
              <div className="space-y-4">
                <Dialog open={isSKUDialogOpen} onOpenChange={setIsSKUDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add SKU
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add SKU</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>SKU Name</Label>
                        <Input
                          value={skuForm.sku_name}
                          onChange={(e) => setSKUForm({ ...skuForm, sku_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={skuForm.unit}
                          onChange={(e) => setSKUForm({ ...skuForm, unit: e.target.value })}
                        />
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skus.map((sku) => (
                      <TableRow key={sku.id}>
                        <TableCell>{sku.sku_name}</TableCell>
                        <TableCell>{sku.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="contacts">
              <div className="space-y-4">
                <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={contactForm.contact_name}
                          onChange={(e) => setContactForm({ ...contactForm, contact_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={contactForm.contact_phone}
                          onChange={(e) => setContactForm({ ...contactForm, contact_phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={contactForm.contact_email}
                          onChange={(e) => setContactForm({ ...contactForm, contact_email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <Input
                          value={contactForm.designation}
                          onChange={(e) => setContactForm({ ...contactForm, designation: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleAddContact} className="w-full">Add Contact</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Designation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>{contact.contact_name}</TableCell>
                        <TableCell>{contact.contact_phone}</TableCell>
                        <TableCell>{contact.contact_email}</TableCell>
                        <TableCell>{contact.designation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="data">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Competition Intelligence
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    All competition data captured from visits
                  </p>
                </div>
                
                {competitionData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No competition data captured yet
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {competitionData.map((data) => (
                      <Card key={data.id}>
                        <CardContent className="pt-6">
                          <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {skus.find(s => s.id === data.sku_id)?.sku_name || 'Unknown SKU'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {data.retailers?.name} • {data.visits?.visit_date ? new Date(data.visits.visit_date).toLocaleDateString() : new Date(data.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {data.needs_attention && (
                                  <Badge variant="destructive">Needs Attention</Badge>
                                )}
                                {data.impact_level && (
                                  <Badge variant={
                                    data.impact_level === 'high' ? 'destructive' :
                                    data.impact_level === 'medium' ? 'default' : 'secondary'
                                  }>
                                    {data.impact_level} Impact
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Stock Quantity</p>
                                <p className="font-medium">{data.stock_quantity} {data.unit}</p>
                              </div>
                              {data.insight && (
                                <div>
                                  <p className="text-muted-foreground">Insight</p>
                                  <p className="font-medium capitalize">{data.insight.replace('_', ' ')}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {data.photo_urls && data.photo_urls.length > 0 && (
                                <Badge variant="outline">
                                  {data.photo_urls.length} Photo{data.photo_urls.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                              {data.voice_note_urls && data.voice_note_urls.length > 0 && (
                                <Badge variant="outline">
                                  {data.voice_note_urls.length} Voice Note{data.voice_note_urls.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
