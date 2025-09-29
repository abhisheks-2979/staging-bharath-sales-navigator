import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Edit, Trash2, Building2, Phone, Mail, MapPin, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SuperStockist {
  id: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  city?: string;
  state?: string;
  competitors: string[];
  region_pincodes: string[];
  is_approved: boolean;
  created_at: string;
}

interface SuperStockistListProps {
  onSuperStockistAdded?: () => void;
}

const SuperStockistList: React.FC<SuperStockistListProps> = ({ onSuperStockistAdded }) => {
  const [superStockists, setSuperStockists] = useState<SuperStockist[]>([]);
  const [filteredSuperStockists, setFilteredSuperStockists] = useState<SuperStockist[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSuperStockist, setEditingSuperStockist] = useState<SuperStockist | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    state: '',
    competitors: [] as string[],
    region_pincodes: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = superStockists.filter(ss =>
      ss.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ss.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ss.contact_phone?.includes(searchTerm) ||
      ss.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (statusFilter !== 'all') {
      const isApproved = statusFilter === 'approved';
      filtered = filtered.filter(ss => ss.is_approved === isApproved);
    }

    setFilteredSuperStockists(filtered);
  }, [superStockists, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [superStockistsRes, categoriesRes] = await Promise.all([
        supabase.rpc('get_public_vendors'),
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
      ]);

      if (superStockistsRes.error) throw superStockistsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setSuperStockists(superStockistsRes.data?.map(ss => ({
        ...ss,
        competitors: ss.skills || [] // Use skills as fallback since competitors field is not in secure function
      })) || []);
      setCategories(categoriesRes.data || []);

    } catch (error) {
      console.error('Error loading super stockists:', error);
      toast({
        title: 'Error',
        description: 'Failed to load super stockists',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSuperStockist = async () => {
    try {
      if (!formData.name) {
        toast({
          title: 'Error',
          description: 'Please fill in the name field',
          variant: 'destructive'
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const saveData = {
        ...formData,
        skills: formData.competitors, // Keep both for compatibility
        is_approved: true
      };

      if (editingSuperStockist) {
        const { error } = await supabase
          .from('vendors')
          .update(saveData)
          .eq('id', editingSuperStockist.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert({
            ...saveData,
            created_by: user.id
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Super Stockist ${editingSuperStockist ? 'updated' : 'added'} successfully`
      });

      setShowAddModal(false);
      resetForm();
      loadData();
      onSuperStockistAdded?.();
    } catch (error) {
      console.error('Error saving super stockist:', error);
      toast({
        title: 'Error',
        description: 'Failed to save super stockist',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSuperStockist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this super stockist?')) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Super Stockist deleted successfully'
      });

      loadData();
    } catch (error) {
      console.error('Error deleting super stockist:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete super stockist',
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
      competitors: [],
      region_pincodes: []
    });
    setEditingSuperStockist(null);
  };

  const openEditModal = (superStockist: SuperStockist) => {
    setEditingSuperStockist(superStockist);
    setFormData({
      name: superStockist.name,
      contact_name: superStockist.contact_name || '',
      contact_phone: superStockist.contact_phone || '',
      contact_email: superStockist.contact_email || '',
      city: superStockist.city || '',
      state: superStockist.state || '',
      competitors: superStockist.competitors || [],
      region_pincodes: superStockist.region_pincodes || []
    });
    setShowAddModal(true);
  };

  const handleCompetitorToggle = (competitor: string) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.includes(competitor)
        ? prev.competitors.filter(c => c !== competitor)
        : [...prev.competitors, competitor]
    }));
  };

  const handlePincodeChange = (value: string) => {
    const pincodes = value.split(',').map(p => p.trim()).filter(p => p);
    setFormData(prev => ({ ...prev, region_pincodes: pincodes }));
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
          <h2 className="text-2xl font-bold">Super Stockists</h2>
          <p className="text-muted-foreground">Manage your super stockist network</p>
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
                {editingSuperStockist ? 'Edit Super Stockist' : 'Add New Super Stockist'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Super Stockist Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter super stockist name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Contact Person</label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">State</label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Top 3 Competitors or Brands they support</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {categories.map(category => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.competitors.includes(category.name)}
                        onCheckedChange={() => handleCompetitorToggle(category.name)}
                      />
                      <span className="text-sm">{category.name}</span>
                    </div>
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
                <Button onClick={handleSaveSuperStockist}>
                  {editingSuperStockist ? 'Update' : 'Add'} Super Stockist
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
            placeholder="Search by name, phone, city..."
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
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Super Stockists Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Super Stockists ({filteredSuperStockists.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSuperStockists.length === 0 ? (
              <div className="text-center py-8">
                <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No super stockists found matching your search' : 'No super stockists added yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground border-b pb-2">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-3">Competitors/Brands</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Actions</div>
                </div>
                {filteredSuperStockists.map(superStockist => (
                  <div key={superStockist.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b">
                    <div className="col-span-3">
                      <div className="font-medium">{superStockist.name}</div>
                      {superStockist.contact_name && (
                        <div className="text-sm text-muted-foreground">{superStockist.contact_name}</div>
                      )}
                    </div>
                    <div className="col-span-2">
                      {superStockist.contact_phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone size={12} />
                          {superStockist.contact_phone}
                        </div>
                      )}
                      {superStockist.contact_email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={12} />
                          {superStockist.contact_email}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-sm">
                      {(superStockist.city || superStockist.state) && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          {[superStockist.city, superStockist.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {superStockist.region_pincodes.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Pincodes: {superStockist.region_pincodes.slice(0, 3).join(', ')}
                          {superStockist.region_pincodes.length > 3 && '...'}
                        </div>
                      )}
                    </div>
                    <div className="col-span-3">
                      {superStockist.competitors.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {superStockist.competitors.slice(0, 2).map(competitor => (
                            <Badge key={competitor} variant="outline" className="text-xs flex items-center gap-1">
                              <Target size={10} />
                              {competitor}
                            </Badge>
                          ))}
                          {superStockist.competitors.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{superStockist.competitors.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No competitors listed</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Badge variant={superStockist.is_approved ? "default" : "secondary"}>
                        {superStockist.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </div>
                    <div className="col-span-1">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(superStockist)}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSuperStockist(superStockist.id)}>
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

export default SuperStockistList;