import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VendorRow {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  skills: string[];
  region_pincodes: string[];
  is_approved: boolean;
}

const Vendors = () => {
  const { userRole } = useAuth();
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // form
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [skills, setSkills] = useState("");
  const [pincodes, setPincodes] = useState("");
  const [isApproved, setIsApproved] = useState(true);

  useEffect(() => { document.title = 'Vendors'; }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vendors')
      .select('id, name, contact_name, contact_phone, contact_email, skills, region_pincodes, is_approved')
      .order('name');
    setVendors((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createVendor = async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Not authenticated');
      const payload: any = {
        name,
        contact_name: contactName || null,
        contact_phone: contactPhone || null,
        contact_email: contactEmail || null,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        region_pincodes: pincodes ? pincodes.split(',').map(s => s.trim()).filter(Boolean) : [],
        is_approved: isApproved,
        created_by: uid,
      };
      const { error } = await supabase.from('vendors').insert(payload);
      if (error) throw error;
      toast({ title: 'Vendor added', description: 'Vendor created successfully.' });
      setOpen(false);
      setName(""); setContactName(""); setContactPhone(""); setContactEmail(""); setSkills(""); setPincodes(""); setIsApproved(true);
      load();
    } catch (err: any) {
      toast({ title: 'Create failed', description: err.message || 'Try again.', variant: 'destructive' });
    }
  };

  const toggleApproval = async (id: string, value: boolean) => {
    try {
      if (userRole !== 'admin') return;
      const { error } = await supabase.from('vendors').update({ is_approved: value }).eq('id', id);
      if (error) throw error;
      setVendors(prev => prev.map(v => v.id === id ? { ...v, is_approved: value } as any : v));
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Try again.', variant: 'destructive' });
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Vendors</h1>
          {userRole === 'admin' && (
            <Button onClick={() => setOpen(true)}>Add Vendor</Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approved Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Pincodes</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && vendors.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No vendors found</TableCell></TableRow>
                )}
                {vendors.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{v.contact_name || '-'}</div>
                      <div>{v.contact_phone || v.contact_email || '-'}</div>
                    </TableCell>
                    <TableCell className="text-sm">{v.skills?.join(', ') || '-'}</TableCell>
                    <TableCell className="text-sm">{v.region_pincodes?.join(', ') || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={v.is_approved} onCheckedChange={(val) => toggleApproval(v.id, val)} disabled={userRole !== 'admin'} />
                        <span className="text-sm text-muted-foreground">{v.is_approved ? 'Yes' : 'No'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Contact Name</Label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Skills (comma-separated)</Label>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Glow sign, wall paint, vinyl" />
              </div>
              <div className="space-y-1">
                <Label>Pincodes (comma-separated)</Label>
                <Input value={pincodes} onChange={(e) => setPincodes(e.target.value)} placeholder="560001,560002" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={isApproved} onCheckedChange={setIsApproved} />
                <Label>Approved</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createVendor}>Create Vendor</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Vendors;
