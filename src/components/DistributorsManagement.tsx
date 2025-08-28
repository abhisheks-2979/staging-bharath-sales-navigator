import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  territory: string;
  status: 'active' | 'inactive';
  credit_limit: number;
  outstanding_amount: number;
  created_at: string;
}

const DistributorsManagement = () => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDistributor, setNewDistributor] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    territoryId: '',
    credit_limit: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDistributors();
  }, []);

  const loadDistributors = async () => {
    try {
      // Load distributors from Supabase
      const { data: distributorsData, error } = await supabase
        .from('distributors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Load territories to map names
      const { data: territoriesData, error: terrErr } = await supabase
        .from('territories')
        .select('id,name');
      if (terrErr) throw terrErr;

      setTerritories((territoriesData || []) as any);
      const territoryMap = new Map((territoriesData || []).map((t: any) => [t.id, t.name]));

      const normalized: Distributor[] = (distributorsData || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        contact_person: d.contact_person,
        phone: d.phone,
        email: d.email ?? '',
        address: d.address ?? '',
        territory: territoryMap.get(d.territory_id) || '',
        status: (d.status as 'active' | 'inactive') ?? 'active',
        credit_limit: Number(d.credit_limit || 0),
        outstanding_amount: Number(d.outstanding_amount || 0),
        created_at: d.created_at,
      }));

      setDistributors(normalized);
    } catch (error) {
      console.error('Error loading distributors:', error);
      toast({
        title: "Error",
        description: "Failed to load distributors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDistributor = async () => {
    if (!newDistributor.name || !newDistributor.contact_person || !newDistributor.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('distributors')
        .insert({
          name: newDistributor.name,
          contact_person: newDistributor.contact_person,
          phone: newDistributor.phone,
          email: newDistributor.email || null,
          address: newDistributor.address || null,
          territory_id: newDistributor.territoryId || null,
          credit_limit: Number(newDistributor.credit_limit || 0),
          status: 'active'
        })
        .select('*')
        .single();
      if (error) throw error;

      const territoryName = territories.find(t => t.id === data?.territory_id)?.name || '';
      const distributor: Distributor = {
        id: data.id,
        name: data.name,
        contact_person: data.contact_person,
        phone: data.phone,
        email: data.email ?? '',
        address: data.address ?? '',
        territory: territoryName,
        status: (data.status as 'active' | 'inactive') ?? 'active',
        credit_limit: Number(data.credit_limit || 0),
        outstanding_amount: Number(data.outstanding_amount || 0),
        created_at: data.created_at
      };

      setDistributors([distributor, ...distributors]);
      setNewDistributor({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        territoryId: '',
        credit_limit: ''
      });
      setShowAddForm(false);
      toast({ title: "Success", description: "Distributor added successfully" });
    } catch (error) {
      console.error('Error adding distributor:', error);
      toast({
        title: "Error",
        description: "Failed to add distributor",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Distributor Management</h2>
          <p className="text-muted-foreground">Manage your distributor network and relationships</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Add Distributor
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Distributor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={newDistributor.name}
                  onChange={(e) => setNewDistributor({ ...newDistributor, name: e.target.value })}
                  placeholder="e.g., ABC Distributors Pvt Ltd"
                />
              </div>
              <div>
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  value={newDistributor.contact_person}
                  onChange={(e) => setNewDistributor({ ...newDistributor, contact_person: e.target.value })}
                  placeholder="e.g., John Doe"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={newDistributor.phone}
                  onChange={(e) => setNewDistributor({ ...newDistributor, phone: e.target.value })}
                  placeholder="e.g., +91 9876543210"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newDistributor.email}
                  onChange={(e) => setNewDistributor({ ...newDistributor, email: e.target.value })}
                  placeholder="e.g., contact@distributor.com"
                />
              </div>
              <div>
                <Label htmlFor="territory">Territory</Label>
                <Select
                  value={newDistributor.territoryId}
                  onValueChange={(val) => setNewDistributor({ ...newDistributor, territoryId: val })}
                >
                  <SelectTrigger id="territory">
                    <SelectValue placeholder="Select a territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {territories.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={newDistributor.credit_limit}
                  onChange={(e) => setNewDistributor({ ...newDistributor, credit_limit: e.target.value })}
                  placeholder="e.g., 500000"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newDistributor.address}
                onChange={(e) => setNewDistributor({ ...newDistributor, address: e.target.value })}
                placeholder="Complete business address"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddDistributor}>Add Distributor</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {distributors.map((distributor) => (
          <Card key={distributor.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  {distributor.name}
                </div>
                <Badge variant={distributor.status === 'active' ? 'default' : 'secondary'}>
                  {distributor.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Contact Person</p>
                <p className="font-medium">{distributor.contact_person}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-muted-foreground" />
                  <span>{distributor.phone}</span>
                </div>
                {distributor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-muted-foreground" />
                    <span>{distributor.email}</span>
                  </div>
                )}
                {distributor.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={14} className="text-muted-foreground" />
                    <span>{distributor.address}</span>
                  </div>
                )}
              </div>

              {distributor.territory && (
                <div>
                  <p className="text-sm text-muted-foreground">Territory</p>
                  <Badge variant="outline">{distributor.territory}</Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Credit Limit</p>
                  <p className="font-medium text-sm">{formatCurrency(distributor.credit_limit)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="font-medium text-sm text-orange-600">{formatCurrency(distributor.outstanding_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DistributorsManagement;