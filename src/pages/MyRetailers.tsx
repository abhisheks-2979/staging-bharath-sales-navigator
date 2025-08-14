import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Tags, Pencil, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";

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
  const [priority, setPriority] = useState<string | undefined>();
  const [beatFilter, setBeatFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

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
  .select("id,name,address,phone,category,priority,status,beat_id,created_at,last_visit_date,latitude,longitude,order_value,notes,parent_type,parent_name,location_tag,retail_type,potential,competitors,entity_type")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setRetailers((data as any) || []);
  };

  useEffect(() => {
    loadRetailers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const beats = useMemo(() => {
    const set = new Set<string>();
    retailers.forEach(r => r.beat_id && set.add(r.beat_id));
    return Array.from(set);
  }, [retailers]);

const filtered = useMemo(() => {
    return retailers.filter(r => {
      const s = search.toLowerCase();
      const matchesSearch = !s || [r.name, r.phone || "", r.address, r.category || "", r.beat_id || ""].some(v => v.toLowerCase().includes(s));
      const matchesPriority = !priority || (r.priority || "").toLowerCase() === priority;
      const matchesBeat = !beatFilter || r.beat_id === beatFilter;
      const matchesType = !typeFilter || (r.entity_type || 'retailer') === typeFilter;
      return matchesSearch && matchesPriority && matchesBeat && matchesType;
    });
  }, [retailers, search, priority, beatFilter, typeFilter]);

  const openBeatDialog = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setExistingBeat(undefined);
    setNewBeat("");
    setBeatDialogOpen(true);
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

const openEdit = (retailer: Retailer) => {
  setSelectedRetailer(retailer);
  setEditForm({
    id: retailer.id,
    name: retailer.name,
    phone: retailer.phone || "",
    address: retailer.address,
    category: retailer.category,
    priority: retailer.priority,
    status: retailer.status,
    notes: retailer.notes || null,
    parent_type: retailer.parent_type || null,
    parent_name: retailer.parent_name || null,
    location_tag: retailer.location_tag || null,
    retail_type: retailer.retail_type || null,
    potential: retailer.potential || null,
    competitorsString: (retailer.competitors || []).join(", "),
  });
  setEditDialogOpen(true);
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
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v === "all" ? undefined : v)}>
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
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "all" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="super_stockist">Super Stockist</SelectItem>
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
                  <TableHead className="text-right">Action</TableHead>
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
                      <TableCell className="font-medium">{r.name}</TableCell>
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
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)} className="h-8 w-8 p-0">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteRetailer(r)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filtered.map(r => {
              const shortAddress = r.address.length > 25 ? r.address.substring(0, 25) + '...' : r.address;
              const isAddressExpanded = expandedAddress === r.id;
              
              const shortBeat = r.beat_id && r.beat_id.length > 12 ? r.beat_id.substring(0, 12) + '...' : r.beat_id;
              const isBeatExpanded = expandedBeat === r.id;
              
              return (
                <Card key={r.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-lg">{r.name}</h3>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)} className="h-8 w-8 p-0">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteRetailer(r)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="font-medium">{r.phone || '-'}</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Address:</span>
                        <span 
                          className="font-medium text-right cursor-pointer hover:text-primary max-w-[60%]"
                          onClick={() => setExpandedAddress(isAddressExpanded ? null : r.id)}
                          title="Click to expand/collapse address"
                        >
                          {isAddressExpanded ? r.address : shortAddress}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">Beat:</span>
                        <span 
                          className="font-medium text-right cursor-pointer hover:text-primary max-w-[60%]"
                          onClick={() => setExpandedBeat(isBeatExpanded ? null : r.id)}
                          title="Click to expand/collapse beat"
                        >
                          {isBeatExpanded ? r.beat_id : shortBeat}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {loading ? 'Loading...' : 'No retailers found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={beatDialogOpen} onOpenChange={setBeatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to a Beat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Choose existing beat</label>
              <Select value={existingBeat} onValueChange={setExistingBeat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a beat" />
                </SelectTrigger>
                <SelectContent>
                  {beats.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                  <SelectItem value="__new__">Create new…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(existingBeat === "__new__" || (!existingBeat && newBeat)) && (
              <div>
                <label className="text-xs text-muted-foreground">New beat name</label>
                <Input placeholder="Enter beat name" value={newBeat} onChange={(e) => setNewBeat(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBeatDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmAssignBeat}>Assign</Button>
          </DialogFooter>
        </DialogContent>
</Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Address</label>
              <Input value={newForm.address} onChange={(e) => setNewForm({ ...newForm, address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={newForm.entity_type} onValueChange={(v) => setNewForm({ ...newForm, entity_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retailer">Retailer</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="super_stockist">Super Stockist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Beat (optional)</label>
              <Input placeholder="unassigned by default" value={newForm.beat_id} onChange={(e) => setNewForm({ ...newForm, beat_id: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveNewEntity}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>View / Edit Retailer</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3"
                 style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Address</label>
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <Input value={editForm.category || ''} onChange={(e) => setEditForm({ ...editForm, category: e.target.value || null })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <Select value={editForm.priority || undefined} onValueChange={(v) => setEditForm({ ...editForm, priority: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={editForm.status || undefined} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
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
              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Parent Type</label>
                  <Input value={editForm.parent_type || ''} onChange={(e) => setEditForm({ ...editForm, parent_type: e.target.value || null })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Parent Name</label>
                  <Input value={editForm.parent_name || ''} onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value || null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Location Tag</label>
                  <Input value={editForm.location_tag || ''} onChange={(e) => setEditForm({ ...editForm, location_tag: e.target.value || null })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Retail Type</label>
                  <Input value={editForm.retail_type || ''} onChange={(e) => setEditForm({ ...editForm, retail_type: e.target.value || null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Potential</label>
                  <Select value={editForm.potential || undefined} onValueChange={(v) => setEditForm({ ...editForm, potential: v })}>
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
                <div>
                  <label className="text-xs text-muted-foreground">Competitors (comma separated)</label>
                  <Input value={editForm.competitorsString || ''} onChange={(e) => setEditForm({ ...editForm, competitorsString: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value || null })} />
              </div>
              <div className="pt-2 text-xs text-muted-foreground grid grid-cols-2 gap-2">
                <div><span className="font-medium text-foreground">Beat:</span> {selectedRetailer?.beat_id || '—'}</div>
                <div><span className="font-medium text-foreground">Created:</span> {selectedRetailer ? new Date(selectedRetailer.created_at).toLocaleString() : '—'}</div>
                {selectedRetailer?.last_visit_date && (
                  <div className="col-span-2"><span className="font-medium text-foreground">Last Visit:</span> {new Date(selectedRetailer.last_visit_date).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="secondary" onClick={() => setEditDialogOpen(false)}>Close</Button>
            <Button onClick={updateRetailer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  </Layout>
);
};

export default MyRetailers;
