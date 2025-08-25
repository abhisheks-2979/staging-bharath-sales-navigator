import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Building2, Phone, Mail, MapPin, Search, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Distributor {
  id: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  city?: string;
  state?: string;
  skills: string[];
  region_pincodes: string[];
  is_approved: boolean;
  created_at: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

const DistributorMaster = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [filteredDistributors, setFilteredDistributors] = useState<Distributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    state: '',
    skills: [] as string[],
    region_pincodes: [] as string[]
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = distributors.filter(distributor =>
      distributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      distributor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      distributor.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDistributors(filtered);
  }, [distributors, searchTerm]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [distributorsRes, categoriesRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('*')
          .order('name'),
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
      ]);

      if (distributorsRes.error) throw distributorsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setDistributors(distributorsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load distributors',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDistributor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (editingDistributor) {
        // Update existing distributor
        const { error } = await supabase
          .from('vendors')
          .update({
            ...formData,
            is_approved: true // Auto-approve for now
          })
          .eq('id', editingDistributor.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Distributor updated successfully'
        });
      } else {
        // Add new distributor
        const { error } = await supabase
          .from('vendors')
          .insert({
            ...formData,
            created_by: user.id,
            is_approved: true // Auto-approve for now
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Distributor added successfully'
        });
      }

      setShowAddModal(false);
      setEditingDistributor(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving distributor:', error);
      toast({
        title: 'Error',
        description: 'Failed to save distributor',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDistributor = async (distributorId: string) => {
    if (!confirm('Are you sure you want to delete this distributor?')) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', distributorId);

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
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      city: '',
      state: '',
      skills: [],
      region_pincodes: []
    });
  };

  const openEditModal = (distributor: Distributor) => {
    setEditingDistributor(distributor);
    setFormData({
      name: distributor.name,
      contact_name: distributor.contact_name || '',
      contact_phone: distributor.contact_phone || '',
      contact_email: distributor.contact_email || '',
      city: distributor.city || '',
      state: distributor.state || '',
      skills: distributor.skills || [],
      region_pincodes: distributor.region_pincodes || []
    });
    setShowAddModal(true);
  };

  const handleSkillToggle = (categoryName: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(categoryName)
        ? prev.skills.filter(s => s !== categoryName)
        : [...prev.skills, categoryName]
    }));
  };

  const handlePincodeChange = (value: string) => {
    const pincodes = value.split(',').map(p => p.trim()).filter(p => p);
    setFormData(prev => ({ ...prev, region_pincodes: pincodes }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Distributor Master</h1>
            <p className="text-muted-foreground">Manage your distributor database</p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search distributors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
          
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingDistributor(null); }}>
                <Plus size={16} className="mr-2" />
                Add Distributor
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
                    <label className="text-sm font-medium">Distributor Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter distributor name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact Person</label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Contact person name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="Contact phone"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={formData.contact_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="Contact email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Product Categories</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.skills.includes(category.name)}
                          onChange={() => handleSkillToggle(category.name)}
                          className="rounded"
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Region Pincodes</label>
                  <Input
                    value={formData.region_pincodes.join(', ')}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Enter pincodes separated by commas"
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

        {/* Distributors List */}
        <div className="grid gap-4">
          {filteredDistributors.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No distributors found matching your search' : 'No distributors added yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredDistributors.map(distributor => (
              <Card key={distributor.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{distributor.name}</h3>
                        <Badge variant={distributor.is_approved ? "default" : "secondary"}>
                          {distributor.is_approved ? "Approved" : "Pending"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        {distributor.contact_name && (
                          <div className="flex items-center gap-2">
                            <Building2 size={14} />
                            <span>{distributor.contact_name}</span>
                          </div>
                        )}
                        {distributor.contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} />
                            <span>{distributor.contact_phone}</span>
                          </div>
                        )}
                        {distributor.contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} />
                            <span>{distributor.contact_email}</span>
                          </div>
                        )}
                        {(distributor.city || distributor.state) && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{[distributor.city, distributor.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {distributor.skills.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Product Categories:</p>
                          <div className="flex flex-wrap gap-1">
                            {distributor.skills.map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {distributor.region_pincodes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Region Pincodes:</p>
                          <p className="text-xs">{distributor.region_pincodes.join(', ')}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(distributor)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDistributor(distributor.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DistributorMaster;