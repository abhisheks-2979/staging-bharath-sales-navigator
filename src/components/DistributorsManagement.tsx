import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDistributor, setNewDistributor] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    territory: '',
    credit_limit: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDistributors();
  }, []);

  const loadDistributors = async () => {
    try {
      // For now, we'll use mock data since distributors table doesn't exist yet
      // In a real implementation, you would fetch from Supabase
      const mockDistributors: Distributor[] = [
        {
          id: '1',
          name: 'Metro Distributors Pvt Ltd',
          contact_person: 'Rajesh Kumar',
          phone: '+91 9876543210',
          email: 'rajesh@metrodist.com',
          address: 'Plot 15, Industrial Area, Gurgaon',
          territory: 'North Zone',
          status: 'active',
          credit_limit: 500000,
          outstanding_amount: 125000,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'South India Supplies',
          contact_person: 'Priya Sharma',
          phone: '+91 9123456789',
          email: 'priya@sisupplies.com',
          address: '42, Commercial Street, Bangalore',
          territory: 'South Zone',
          status: 'active',
          credit_limit: 300000,
          outstanding_amount: 75000,
          created_at: new Date().toISOString()
        }
      ];
      setDistributors(mockDistributors);
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
      // For now, just add to local state
      // In a real implementation, you would insert into Supabase
      const distributor: Distributor = {
        id: Date.now().toString(),
        name: newDistributor.name,
        contact_person: newDistributor.contact_person,
        phone: newDistributor.phone,
        email: newDistributor.email,
        address: newDistributor.address,
        territory: newDistributor.territory,
        status: 'active',
        credit_limit: parseFloat(newDistributor.credit_limit) || 0,
        outstanding_amount: 0,
        created_at: new Date().toISOString()
      };

      setDistributors([...distributors, distributor]);
      setNewDistributor({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        territory: '',
        credit_limit: ''
      });
      setShowAddForm(false);
      
      toast({
        title: "Success",
        description: "Distributor added successfully",
      });
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
                <Input
                  id="territory"
                  value={newDistributor.territory}
                  onChange={(e) => setNewDistributor({ ...newDistributor, territory: e.target.value })}
                  placeholder="e.g., North Zone"
                />
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