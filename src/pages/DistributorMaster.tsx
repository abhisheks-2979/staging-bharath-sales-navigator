import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Building2, Phone, Mail, MapPin, Search, Edit, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { moveToRecycleBin } from '@/utils/recycleBinUtils';

interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  skills: string[];
  competitors: string[] | null;
  region_pincodes: string[];
  is_approved: boolean;
  stockist_status: string | null;
  created_at: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

const DistributorMaster = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('distributors');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorType, setVendorType] = useState<'distributor' | 'super_stockist'>('distributor');

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    state: '',
    skills: [] as string[],
    competitors: [] as string[],
    region_pincodes: [] as string[],
    stockist_status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [vendorsRes, categoriesRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
      ]);

      if (vendorsRes.error) throw vendorsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setVendors(vendorsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_phone?.includes(searchTerm);
    
    // Filter by type based on stockist_status or competitors field
    const isDistributor = !vendor.competitors || vendor.competitors.length === 0;
    const isSuperStockist = vendor.competitors && vendor.competitors.length > 0;
    
    if (activeTab === 'distributors') {
      return matchesSearch && isDistributor;
    } else {
      return matchesSearch && isSuperStockist;
    }
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const saveData = {
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        skills: formData.skills,
        competitors: vendorType === 'super_stockist' ? formData.competitors : [],
        region_pincodes: formData.region_pincodes,
        stockist_status: formData.stockist_status,
        is_approved: true
      };

      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update(saveData)
          .eq('id', editingVendor.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: `${vendorType === 'distributor' ? 'Distributor' : 'Super Stockist'} updated successfully`
        });
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert({
            ...saveData,
            created_by: user.id
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: `${vendorType === 'distributor' ? 'Distributor' : 'Super Stockist'} added successfully`
        });
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) return;

    try {
      await moveToRecycleBin({
        tableName: 'vendors',
        recordId: vendor.id,
        recordData: vendor,
        moduleName: activeTab === 'distributors' ? 'Distributors' : 'Super Stockists',
        recordName: vendor.name
      });

      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendor.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Moved to recycle bin'
      });

      loadData();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete',
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
      competitors: [],
      region_pincodes: [],
      stockist_status: 'active'
    });
    setEditingVendor(null);
  };

  const openAddModal = (type: 'distributor' | 'super_stockist') => {
    resetForm();
    setVendorType(type);
    setShowModal(true);
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    const type = vendor.competitors && vendor.competitors.length > 0 ? 'super_stockist' : 'distributor';
    setVendorType(type);
    setFormData({
      name: vendor.name,
      contact_name: vendor.contact_name || '',
      contact_phone: vendor.contact_phone || '',
      contact_email: vendor.contact_email || '',
      city: vendor.city || '',
      state: vendor.state || '',
      skills: vendor.skills || [],
      competitors: vendor.competitors || [],
      region_pincodes: vendor.region_pincodes || [],
      stockist_status: vendor.stockist_status || 'active'
    });
    setShowModal(true);
  };

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleCompetitorToggle = (competitor: string) => {
    setFormData(prev => ({
      ...prev,
      competitors: prev.competitors.includes(competitor)
        ? prev.competitors.filter(c => c !== competitor)
        : [...prev.competitors, competitor]
    }));
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground p-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="sm"
            className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Distributor Master</h1>
            <p className="text-primary-foreground/80 text-sm">Manage distributors and super stockists</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="distributors" className="flex items-center gap-2">
              <Building2 size={16} />
              Distributors
            </TabsTrigger>
            <TabsTrigger value="super_stockists" className="flex items-center gap-2">
              <Users size={16} />
              Super Stockists
            </TabsTrigger>
          </TabsList>

          {/* Search and Add */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => openAddModal(activeTab === 'distributors' ? 'distributor' : 'super_stockist')}>
              <Plus size={16} className="mr-2" />
              Add {activeTab === 'distributors' ? 'Distributor' : 'Super Stockist'}
            </Button>
          </div>

          <TabsContent value="distributors" className="space-y-4 mt-4">
            {filteredVendors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No distributors found</p>
                </CardContent>
              </Card>
            ) : (
              filteredVendors.map(vendor => (
                <VendorCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  onEdit={() => openEditModal(vendor)} 
                  onDelete={() => handleDelete(vendor)}
                  type="distributor"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="super_stockists" className="space-y-4 mt-4">
            {filteredVendors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No super stockists found</p>
                </CardContent>
              </Card>
            ) : (
              filteredVendors.map(vendor => (
                <VendorCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  onEdit={() => openEditModal(vendor)} 
                  onDelete={() => handleDelete(vendor)}
                  type="super_stockist"
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? 'Edit' : 'Add'} {vendorType === 'distributor' ? 'Distributor' : 'Super Stockist'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
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

            {vendorType === 'super_stockist' && (
              <div>
                <label className="text-sm font-medium">Competitors/Brands They Support</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.competitors.includes(category.name)}
                        onChange={() => handleCompetitorToggle(category.name)}
                        className="rounded"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Region Pincodes (comma separated)</label>
              <Input
                value={formData.region_pincodes.join(', ')}
                onChange={(e) => {
                  const pincodes = e.target.value.split(',').map(p => p.trim()).filter(p => p);
                  setFormData(prev => ({ ...prev, region_pincodes: pincodes }));
                }}
                placeholder="e.g., 560001, 560002, 560003"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingVendor ? 'Update' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Vendor Card Component
const VendorCard = ({ 
  vendor, 
  onEdit, 
  onDelete,
  type 
}: { 
  vendor: Vendor; 
  onEdit: () => void; 
  onDelete: () => void;
  type: 'distributor' | 'super_stockist';
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold truncate">{vendor.name}</h3>
              <Badge variant={vendor.is_approved ? "default" : "secondary"}>
                {vendor.is_approved ? "Active" : "Pending"}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
              {vendor.contact_name && (
                <div className="flex items-center gap-2 truncate">
                  <Building2 size={14} className="flex-shrink-0" />
                  <span className="truncate">{vendor.contact_name}</span>
                </div>
              )}
              {vendor.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="flex-shrink-0" />
                  <a href={`tel:${vendor.contact_phone}`} className="hover:text-primary">{vendor.contact_phone}</a>
                </div>
              )}
              {vendor.contact_email && (
                <div className="flex items-center gap-2 truncate">
                  <Mail size={14} className="flex-shrink-0" />
                  <span className="truncate">{vendor.contact_email}</span>
                </div>
              )}
              {(vendor.city || vendor.state) && (
                <div className="flex items-center gap-2 truncate">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span className="truncate">{[vendor.city, vendor.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
            </div>

            {vendor.skills && vendor.skills.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Product Categories:</p>
                <div className="flex flex-wrap gap-1">
                  {vendor.skills.slice(0, 4).map(skill => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {vendor.skills.length > 4 && (
                    <Badge variant="outline" className="text-xs">+{vendor.skills.length - 4}</Badge>
                  )}
                </div>
              </div>
            )}

            {type === 'super_stockist' && vendor.competitors && vendor.competitors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Competitors/Brands:</p>
                <div className="flex flex-wrap gap-1">
                  {vendor.competitors.slice(0, 3).map(comp => (
                    <Badge key={comp} variant="secondary" className="text-xs">
                      {comp}
                    </Badge>
                  ))}
                  {vendor.competitors.length > 3 && (
                    <Badge variant="secondary" className="text-xs">+{vendor.competitors.length - 3}</Badge>
                  )}
                </div>
              </div>
            )}

            {vendor.region_pincodes && vendor.region_pincodes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Pincodes: {vendor.region_pincodes.slice(0, 5).join(', ')}
                  {vendor.region_pincodes.length > 5 && ` +${vendor.region_pincodes.length - 5} more`}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit size={14} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DistributorMaster;
