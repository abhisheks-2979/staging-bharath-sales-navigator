import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Tags } from "lucide-react";
import { Link } from "react-router-dom";
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
}

export const MyRetailers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<string | undefined>();
  const [beatFilter, setBeatFilter] = useState<string | undefined>();

  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [existingBeat, setExistingBeat] = useState<string | undefined>();
  const [newBeat, setNewBeat] = useState("");

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
      .select("id,name,address,phone,category,priority,status,beat_id,created_at")
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
      return matchesSearch && matchesPriority && matchesBeat;
    });
  }, [retailers, search, priority, beatFilter]);

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

  return (
    <main className="min-h-screen bg-background">
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
              <Button asChild variant="secondary">
                <Link to="/add-retailer">
                  <Plus className="mr-2 h-4 w-4" /> Add Retailer
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Beat</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.phone || '-'}</TableCell>
                      <TableCell className="max-w-[280px] truncate" title={r.address}>{r.address}</TableCell>
                      <TableCell className="capitalize">{(r.priority || 'medium')}</TableCell>
                      <TableCell>{r.beat_id}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openBeatDialog(r)}>
                          <Tags className="mr-2 h-4 w-4" /> Add to Beat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">{loading ? 'Loading...' : 'No retailers found'}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
      </section>
    </main>
  );
};

export default MyRetailers;
