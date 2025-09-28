import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Plus, Edit, Trash2, Building2, Phone, Mail, MapPin, CreditCard, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email?: string;
  address?: string;
  status: string;
  credit_limit: number;
  outstanding_amount: number;
  gst_number?: string;
  parent_type?: 'super_stockist' | 'company';
  parent_id?: string;
  parent_name?: string;
  territory?: string;
  created_at: string;
}

interface DistributorListProps {
  onDistributorAdded?: () => void;
}

const DistributorList: React.FC<DistributorListProps> = ({ onDistributorAdded }) => {
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([]);
  const [superStockists, setSuperStockists] = useState<Distributor[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    gst_number: '',
    parent_type: '' as 'super_stockist' | 'company' | '',
    parent_id: '',
    territory_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = distributors.filter(distributor =>
      distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      distributor.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      distributor.phone.includes(searchTerm)
    );

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    setFilteredDistributors(filtered);
  }, [distributors, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [distributorsRes, territoriesRes] = await Promise.all([
        supabase
          .from('distributors')
          .select(`
            *,
            parent:distributors!parent_id(name),
            territory:territories(name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('territories')
          .select('id, name')
          .order('name')
      ]);

      if (distributorsRes.error) throw distributorsRes.error;
      if (territoriesRes.error) throw territoriesRes.error;

      const mappedDistributors = (distributorsRes.data || []).map(d => ({
        ...d,
        parent_name: d.parent?.name,
        territory: d.territory?.name,
        credit_limit: Number(d.credit_limit || 0),
        outstanding_amount: Number(d.outstanding_amount || 0),
        parent_type: d.parent_type as 'super_stockist' | 'company' | undefined
      }));

      setDistributors(mappedDistributors);
      setTerritories(territoriesRes.data || []);

      // Filter super stockists for parent lookup
      const superStockistList = mappedDistributors.filter(d => d.parent_type === null || d.parent_type === 'company');
      setSuperStockists(superStockistList);

    } catch (error) {
      console.error('Error loading distributors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load distributors',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDistributor = async () => {
    try {
      if (!formData.name || !formData.contact_person || !formData.phone) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const saveData = {
        ...formData,
        credit_limit: Number(formData.credit_limit || 0),
        parent_id: formData.parent_id || null,
        territory_id: formData.territory_id || null,
        status: 'active'
      };

      if (editingDistributor) {
        const { error } = await supabase
          .from('distributors')
          .update(saveData)
          .eq('id', editingDistributor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('distributors')
          .insert(saveData);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Distributor ${editingDistributor ? 'updated' : 'added'} successfully`
      });

      setShowAddModal(false);
      resetForm();
      loadData();
      onDistributorAdded?.();
    } catch (error) {
      console.error('Error saving distributor:', error);
      toast({
        title: 'Error',
        description: 'Failed to save distributor',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDistributor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this distributor?')) return;

    try {
      const { error } = await supabase
        .from('distributors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Distributor deleted successfully'
      });

      loadData();
    } catch (error) {
      console.error('Error deleting distributor:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete distributor',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: '',
      gst_number: '',
      parent_type: '',
      parent_id: '',
      territory_id: ''
    });
    setEditingDistributor(null);
  };

  const openEditModal = (distributor: Distributor) => {
    setEditingDistributor(distributor);
    setFormData({
      name: distributor.name,
      contact_person: distributor.contact_person,
      phone: distributor.phone,
      email: distributor.email || '',
      address: distributor.address || '',
      credit_limit: distributor.credit_limit.toString(),
      gst_number: distributor.gst_number || '',
      parent_type: distributor.parent_type || '',
      parent_id: distributor.parent_id || '',
      territory_id: ''
    });
    setShowAddModal(true);
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
          <h2 className="text-2xl font-bold">Distributors</h2>
          <p className="text-muted-foreground">Manage your distributor network</p>
        </div>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus size={16} className="mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDistributor ? 'Edit Distributor' : 'Add New Distributor'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Person *</label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="Contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Credit Limit (₹)</label>
                  <Input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                    placeholder="Credit limit"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">GST Number</label>
                  <Input
                    value={formData.gst_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_number: e.target.value }))}
                    placeholder="GST number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Parent Type</label>
                  <Select value={formData.parent_type} onValueChange={(val: 'super_stockist' | 'company') => setFormData(prev => ({ ...prev, parent_type: val, parent_id: '' }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_stockist">Super Stockist</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.parent_type && (
                  <div>
                    <label className="text-sm font-medium">Parent {formData.parent_type === 'super_stockist' ? 'Super Stockist' : 'Company'}</label>
                    <Select value={formData.parent_id} onValueChange={(val) => setFormData(prev => ({ ...prev, parent_id: val }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${formData.parent_type}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {superStockists.map(ss => (
                          <SelectItem key={ss.id} value={ss.id}>{ss.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Territory</label>
                <Select value={formData.territory_id} onValueChange={(val) => setFormData(prev => ({ ...prev, territory_id: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent>
                    {territories.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Complete address"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveDistributor}>
                  {editingDistributor ? 'Update' : 'Add'} Distributor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search by name, phone, address, beat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Distributors Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Distributors ({filteredDistributors.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDistributors.length === 0 ? (
              <div className="text-center py-8">
                <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No distributors found matching your search' : 'No distributors added yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Phone Number</div>
                  <div className="col-span-2">Address</div>
                  <div className="col-span-2">Credit Limit</div>
                  <div className="col-span-2">Parent</div>
                  <div className="col-span-1">Actions</div>
                </div>
                {filteredDistributors.map(distributor => (
                  <div key={distributor.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b">
                    <div className="col-span-3">
                      <div className="font-medium">{distributor.name}</div>
                      <div className="text-sm text-muted-foreground">{distributor.contact_person}</div>
                      {distributor.gst_number && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText size={12} />
                          {distributor.gst_number}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone size={12} />
                        {distributor.phone}
                      </div>
                      {distributor.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={12} />
                          {distributor.email}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-sm">
                      {distributor.address && (
                        <div className="flex items-start gap-1">
                          <MapPin size={12} className="mt-0.5" />
                          <span className="truncate">{distributor.address}</span>
                        </div>
                      )}
                      {distributor.territory && (
                        <Badge variant="outline" className="text-xs mt-1">{distributor.territory}</Badge>
                      )}
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-sm">
                        <CreditCard size={12} />
                        {formatCurrency(distributor.credit_limit)}
                      </div>
                      <div className="text-xs text-orange-600">
                        Outstanding: {formatCurrency(distributor.outstanding_amount)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      {distributor.parent_name ? (
                        <div>
                          <Badge variant="secondary" className="text-xs">
                            {distributor.parent_type === 'super_stockist' ? 'Super Stockist' : 'Company'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">{distributor.parent_name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Independent</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(distributor)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDistributor(distributor.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DistributorList;