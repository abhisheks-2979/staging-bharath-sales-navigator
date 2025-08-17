import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Calendar, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import { AddRetailerToVisitModal } from "@/components/AddRetailerToVisitModal";
import { MassEditBeatsModal } from "@/components/MassEditBeatsModal";
import { RetailerDetailModal } from "@/components/RetailerDetailModal";

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
  latitude?: number | null;
  longitude?: number | null;
  order_value?: number | null;
  notes?: string | null;
  parent_type?: string | null;
  parent_name?: string | null;
  location_tag?: string | null;
  retail_type?: string | null;
  potential?: string | null;
  competitors?: string[] | null;
  entity_type?: string | null;
}

export const MyRetailers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [search, setSearch] = useState("");
  const [potentialFilter, setPotentialFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [retailTypeFilter, setRetailTypeFilter] = useState<string | undefined>();
  const [beatFilter, setBeatFilter] = useState<string | undefined>();

  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [existingBeat, setExistingBeat] = useState<string | undefined>();
  const [newBeat, setNewBeat] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "",
    phone: "",
    address: "",
    entity_type: "retailer",
    beat_id: ""
  });

  const location = useLocation();
  type EditForm = {
    id: string;
    name: string;
    phone: string;
    address: string;
    category: string | null;
    priority: string | null;
    status: string | null;
    notes: string | null;
    parent_type: string | null;
    parent_name: string | null;
    location_tag: string | null;
    retail_type: string | null;
    potential: string | null;
    competitorsString?: string;
  };
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null);
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  
  // New state for enhanced functionality
  const [addToVisitModalOpen, setAddToVisitModalOpen] = useState(false);
  const [massEditModalOpen, setMassEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRetailerForVisit, setSelectedRetailerForVisit] = useState<Retailer | null>(null);
  const [selectedRetailerForDetail, setSelectedRetailerForDetail] = useState<Retailer | null>(null);

  useEffect(() => {
    document.title = "My Retailers | Manage and Assign Beats";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "My Retailers: search, filter, and assign retailers to beats.");
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = `${window.location.origin}/my-retailers`;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const loadRetailers = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("retailers")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRetailers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadRetailers();
  }, [user]);

  const categories = useMemo(() => {
    return [...new Set(retailers.map(r => r.category).filter(Boolean))].sort();
  }, [retailers]);
  
  const retailTypes = useMemo(() => {
    return [...new Set(retailers.map(r => r.retail_type).filter(Boolean))].sort();
  }, [retailers]);

  const filtered = useMemo(() => {
    let result = retailers.filter(r => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        r.name.toLowerCase().includes(searchLower) ||
        (r.phone || '').toLowerCase().includes(searchLower) ||
        r.address.toLowerCase().includes(searchLower) ||
        (r.category || '').toLowerCase().includes(searchLower) ||
        r.beat_id.toLowerCase().includes(searchLower);
      
      const matchesPotential = !potentialFilter || r.potential === potentialFilter;
      const matchesCategory = !categoryFilter || (r.category || '').toLowerCase().includes(categoryFilter.toLowerCase());
      const matchesRetailType = !retailTypeFilter || (r.retail_type || '').toLowerCase().includes(retailTypeFilter.toLowerCase());
      const matchesBeat = !beatFilter || r.beat_id === beatFilter;
      
      return matchesSearch && matchesPotential && matchesCategory && matchesRetailType && matchesBeat;
    });
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [retailers, search, potentialFilter, categoryFilter, retailTypeFilter, beatFilter]);

  const beats = useMemo(() => {
    return [...new Set(retailers.map(r => r.beat_id))].filter(Boolean).sort();
  }, [retailers]);

  const openEdit = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setEditForm({
      id: retailer.id,
      name: retailer.name,
      phone: retailer.phone || '',
      address: retailer.address,
      category: retailer.category,
      priority: retailer.priority,
      status: retailer.status,
      notes: retailer.notes,
      parent_type: retailer.parent_type,
      parent_name: retailer.parent_name,
      location_tag: retailer.location_tag,
      retail_type: retailer.retail_type,
      potential: retailer.potential,
      competitorsString: retailer.competitors ? retailer.competitors.join(', ') : ''
    });
    setEditDialogOpen(true);
  };

  const openRetailerDetail = (retailer: Retailer) => {
    setSelectedRetailerForDetail(retailer);
    setDetailModalOpen(true);
  };

  const openAddToVisit = (retailer: Retailer) => {
    setSelectedRetailerForVisit(retailer);
    setAddToVisitModalOpen(true);
  };

  const openMassEdit = () => {
    setMassEditModalOpen(true);
  };

  const confirmAssignBeat = async () => {
    if (!selectedRetailer) return;
    const chosenBeat = (existingBeat && existingBeat !== "__new__") ? existingBeat : newBeat.trim();
    if (!chosenBeat) {
      toast({ title: "Choose a beat", description: "Pick an existing beat or enter a new name." });
      return;
    }
    const { error } = await supabase
      .from("retailers")
      .update({ beat_id: chosenBeat })
      .eq("id", selectedRetailer.id)
      .eq("user_id", user?.id);
    if (error) {
      toast({ title: "Failed to assign beat", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assigned", description: `${selectedRetailer.name} → ${chosenBeat}` });
      setBeatDialogOpen(false);
      setSelectedRetailer(null);
      loadRetailers();
    }
  }; 

  const updateRetailer = async () => {
    if (!editForm) return;
    const { error } = await supabase
      .from("retailers")
      .update({
        name: editForm.name,
        phone: editForm.phone || null,
        address: editForm.address,
        category: editForm.category,
        priority: editForm.priority,
        status: editForm.status,
        notes: editForm.notes || null,
        parent_type: editForm.parent_type || null,
        parent_name: editForm.parent_name || null,
        location_tag: editForm.location_tag || null,
        retail_type: editForm.retail_type || null,
        potential: editForm.potential || null,
        competitors: editForm.competitorsString
          ? editForm.competitorsString.split(',').map(s => s.trim()).filter(Boolean)
          : null,
      })
      .eq("id", editForm.id)
      .eq("user_id", user?.id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: "Retailer updated successfully." });
      setEditDialogOpen(false);
      setEditForm(null);
      loadRetailers();
    }
  };

  const deleteRetailer = async (retailer: Retailer) => {
    if (!window.confirm(`Delete ${retailer.name}? This cannot be undone.`)) return;
    const { error } = await supabase
      .from("retailers")
      .delete()
      .eq("id", retailer.id)
      .eq("user_id", user?.id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: `${retailer.name} removed.` });
      loadRetailers();
    }
  };

  const saveNewEntity = async () => {
    if (!user) return;
    if (!newForm.name || !newForm.phone || !newForm.address) {
      toast({ title: "Missing Information", description: "Please fill in name, phone and address", variant: "destructive" });
      return;
    }
    const payload: any = {
      user_id: user.id,
      name: newForm.name,
      phone: newForm.phone,
      address: newForm.address,
      entity_type: newForm.entity_type,
      beat_id: newForm.beat_id || 'unassigned',
      status: 'active'
    };
    const { data, error } = await supabase.from('retailers').insert(payload).select('id').maybeSingle();
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Added', description: `${newForm.name} saved successfully.` });
    setAddOpen(false);
    setNewForm({ name: '', phone: '', address: '', entity_type: 'retailer', beat_id: '' });
    loadRetailers();
    if (data?.id) {
      // Open the newly created retailer for quick edits
      const created = (retailers || []).find(r => r.id === data.id);
      if (created) openEdit(created);
    }
  }; 

  useEffect(() => {
    const state = location.state as any;
    if (state?.openRetailerId && retailers.length) {
      const found = retailers.find((x) => x.id === state.openRetailerId);
      if (found) openEdit(found);
    }
  }, [location.state, retailers]);

  return (
    <Layout>
      <section className="container mx-auto p-4 space-y-4">
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-xl">My Retailers</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input placeholder="Search by name, phone, address, category, beat" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Button variant="secondary" asChild>
                <Link to="/add-retailer">
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Link>
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <Button onClick={openMassEdit} variant="outline" size="sm" className="flex items-center gap-1">
                <Users size={16} />
                Mass Edit Beats
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Potential</label>
                <Select value={potentialFilter} onValueChange={(v) => setPotentialFilter(v === "all" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === "all" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Retailer Type</label>
                <Select value={retailTypeFilter} onValueChange={(v) => setRetailTypeFilter(v === "all" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {retailTypes.map(rt => (
                      <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Beat</label>
                <Select value={beatFilter} onValueChange={(v) => setBeatFilter(v === "all" ? undefined : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {beats.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Beat</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const shortAddress = r.address.length > 30 ? r.address.substring(0, 30) + '...' : r.address;
                    const isAddressExpanded = expandedAddress === r.id;
                    
                    const shortBeat = r.beat_id && r.beat_id.length > 15 ? r.beat_id.substring(0, 15) + '...' : r.beat_id;
                    const isBeatExpanded = expandedBeat === r.id;
                    
                    return (
                      <TableRow key={r.id}>
                        <TableCell 
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => openRetailerDetail(r)}
                          title="Click to view details"
                        >
                          {r.name}
                        </TableCell>
                        <TableCell>{r.phone || '-'}</TableCell>
                        <TableCell 
                          className="max-w-[200px] cursor-pointer hover:text-primary"
                          onClick={() => setExpandedAddress(isAddressExpanded ? null : r.id)}
                          title="Click to expand/collapse address"
                        >
                          {isAddressExpanded ? r.address : shortAddress}
                        </TableCell>
                        <TableCell 
                          className="max-w-[150px] cursor-pointer hover:text-primary"
                          onClick={() => setExpandedBeat(isBeatExpanded ? null : r.id)}
                          title="Click to expand/collapse beat"
                        >
                          {isBeatExpanded ? r.beat_id : shortBeat}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => openAddToVisit(r)} 
                              className="h-8 w-8 p-0"
                              title="Add to visit"
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(r)} className="h-8 w-8 p-0">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">{loading ? 'Loading...' : 'No retailers found'}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Retailer to Visit Modal */}
        <AddRetailerToVisitModal
          isOpen={addToVisitModalOpen}
          onClose={() => setAddToVisitModalOpen(false)}
          retailer={selectedRetailerForVisit}
          onVisitCreated={() => {
            setAddToVisitModalOpen(false);
            setSelectedRetailerForVisit(null);
          }}
        />

        {/* Mass Edit Beats Modal */}
        <MassEditBeatsModal
          isOpen={massEditModalOpen}
          onClose={() => setMassEditModalOpen(false)}
          retailers={retailers}
          beats={beats}
          onSuccess={() => {
            loadRetailers();
            setMassEditModalOpen(false);
          }}
        />

        {/* Retailer Detail Modal */}
        <RetailerDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          retailer={selectedRetailerForDetail}
          onSuccess={() => {
            loadRetailers();
            setDetailModalOpen(false);
            setSelectedRetailerForDetail(null);
          }}
        />
      </section>
    </Layout>
  );
};

export default MyRetailers;
