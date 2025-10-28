import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, FileDown, Search } from 'lucide-react';
import TerritoryDetailsModal from './TerritoryDetailsModal';
import TerritoryDashboard from './TerritoryDashboard';
import { format } from 'date-fns';

interface Territory {
  id: string;
  name: string;
  region: string;
  zone?: string;
  pincode_ranges: string[];
  assigned_user_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const TerritoriesManagement = () => {
  const [territories, setTerritories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  
  const [territoryName, setTerritoryName] = useState('');
  const [region, setRegion] = useState('');
  const [zone, setZone] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [description, setDescription] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadTerritories();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, username');
    setUsers(data || []);
  };

  const loadTerritories = async () => {
    const { data } = await supabase
      .from('territories')
      .select('*')
      .order('created_at', { ascending: false });

    const territoriesWithStats = await Promise.all(
      (data || []).map(async (territory) => {
        let assigned_user_name = 'Unassigned';
        if (territory.assigned_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', territory.assigned_user_id)
            .single();
          assigned_user_name = profile?.full_name || 'Unassigned';
        }

        const { count: retailersCount } = await supabase
          .from('retailers')
          .select('*', { count: 'exact', head: true });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const { data: ordersData } = await supabase
          .from('orders')
          .select('total_amount')
          .gte('created_at', startOfMonth.toISOString());

        return {
          ...territory,
          assigned_user_name,
          total_retailers: retailersCount || 0,
          total_sales: ordersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
        };
      })
    );

    setTerritories(territoriesWithStats);
    setLoading(false);
  };

  const handleAddTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    const pincodeArray = pincodes.split(',').map(p => p.trim()).filter(p => p.length > 0);

    const { error } = await supabase.from('territories').insert({
      name: territoryName,
      region,
      zone: zone || null,
      pincode_ranges: pincodeArray,
      assigned_user_id: assignedUserId || null,
      description: description || null,
    });

    if (!error) {
      toast.success('Territory added successfully!');
      setShowForm(false);
      loadTerritories();
    }
  };

  const filteredTerritories = territories.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = filterUser === 'all' || t.assigned_user_id === filterUser;
    return matchesSearch && matchesUser;
  });

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Territories Management</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} /> Add Territory
        </Button>
      </div>

      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="list">Territory List</TabsTrigger>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-6">
        {showForm && (
          <Card>
            <CardHeader><CardTitle>Add New Territory</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddTerritory} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Territory Name *</Label><Input value={territoryName} onChange={(e) => setTerritoryName(e.target.value)} required /></div>
                  <div><Label>Region *</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} required /></div>
                  <div><Label>Zone</Label><Input value={zone} onChange={(e) => setZone(e.target.value)} /></div>
                  <div><Label>Assign User</Label>
                    <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.username}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>PIN Codes *</Label><Input value={pincodes} onChange={(e) => setPincodes(e.target.value)} placeholder="110001, 110002" required /></div>
                <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><Label>Search</Label><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <div><Label>Filter by User</Label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Users</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Territory</TableHead>
                  <TableHead>PIN Codes</TableHead>
                  <TableHead>Assigned User</TableHead>
                  <TableHead className="text-right">Retailers</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTerritories.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><div className="flex gap-1">{t.pincode_ranges?.slice(0, 2).map((p, i) => <Badge key={i} variant="secondary">{p}</Badge>)}</div></TableCell>
                    <TableCell>{t.assigned_user_name}</TableCell>
                    <TableCell className="text-right">{t.total_retailers}</TableCell>
                    <TableCell className="text-right">₹{t.total_sales.toFixed(2)}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => { setSelectedTerritory(t); setDetailsModalOpen(true); }}>Details</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dashboard"><TerritoryDashboard /></TabsContent>

      <TerritoryDetailsModal open={detailsModalOpen} onOpenChange={setDetailsModalOpen} territory={selectedTerritory} />
    </Tabs>
  );
};

export default TerritoriesManagement;
