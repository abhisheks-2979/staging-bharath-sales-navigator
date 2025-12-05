import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, Plus, Building2, Search, Edit, Trash2, Phone, Mail, MapPin, 
  FileText, Upload, Settings2, CreditCard, X, Check
} from 'lucide-react';
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
  territory_id?: string;
  created_at: string;
  beat_ids?: string[];
  beat_names?: string[];
}

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

interface Beat {
  id: string;
  beat_name: string;
  beat_id: string;
}

const DistributorMapping = () => {
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('distributors');
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [superStockists, setSuperStockists] = useState<SuperStockist[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [beatFilter, setBeatFilter] = useState('all');
  
  // Modals
  const [showAddDistributorModal, setShowAddDistributorModal] = useState(false);
  const [showAddStockistModal, setShowAddStockistModal] = useState(false);
  const [showMassEditModal, setShowMassEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Selected items
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [selectedStockist, setSelectedStockist] = useState<SuperStockist | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'distributor' | 'stockist'; id: string; name: string } | null>(null);
  
  // Form states
  const [distributorForm, setDistributorForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: '',
    gst_number: '',
    parent_type: '' as 'super_stockist' | 'company' | '',
    parent_id: '',
    territory_id: '',
    beat_ids: [] as string[]
  });
  
  const [stockistForm, setStockistForm] = useState({
    name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    city: '',
    state: '',
    competitors: [] as string[],
    region_pincodes: [] as string[]
  });
  
  const [massEditBeatIds, setMassEditBeatIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [distributorsRes, stockistsRes, beatsRes, territoriesRes, categoriesRes] = await Promise.all([
        supabase
          .from('distributors')
          .select(`
            *,
            parent:distributors!parent_id(name),
            territory:territories(name)
          `)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_public_vendors'),
        supabase
          .from('beats')
          .select('id, beat_name, beat_id')
          .eq('is_active', true)
          .order('beat_name'),
        supabase
          .from('territories')
          .select('id, name')
          .order('name'),
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
      ]);

      if (distributorsRes.error) throw distributorsRes.error;
      
      // Load beat mappings for distributors
      const distributorIds = (distributorsRes.data || []).map(d => d.id);
      let beatMappings: any[] = [];
      
      if (distributorIds.length > 0) {
        const { data: mappingsData } = await supabase
          .from('distributor_beat_mappings')
          .select('distributor_id, beat_id, beats(beat_name)')
          .in('distributor_id', distributorIds);
        beatMappings = mappingsData || [];
      }

      const mappedDistributors = (distributorsRes.data || []).map(d => {
        const distributorMappings = beatMappings.filter(m => m.distributor_id === d.id);
        return {
          ...d,
          parent_name: d.parent?.name,
          territory: d.territory?.name,
          credit_limit: Number(d.credit_limit || 0),
          outstanding_amount: Number(d.outstanding_amount || 0),
          parent_type: d.parent_type as 'super_stockist' | 'company' | undefined,
          beat_ids: distributorMappings.map(m => m.beat_id),
          beat_names: distributorMappings.map(m => m.beats?.beat_name).filter(Boolean)
        };
      });

      setDistributors(mappedDistributors);
      setSuperStockists(stockistsRes.data?.map(ss => ({
        ...ss,
        competitors: ss.skills || []
      })) || []);
      setBeats(beatsRes.data || []);
      setTerritories(territoriesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter distributors
  const filteredDistributors = distributors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesBeat = beatFilter === 'all' || d.beat_ids?.includes(beatFilter);
    return matchesSearch && matchesStatus && matchesBeat;
  });

  // Filter super stockists
  const filteredStockists = superStockists.filter(ss => {
    const matchesSearch = ss.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ss.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ss.contact_phone?.includes(searchTerm) ||
      ss.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && ss.is_approved) ||
      (statusFilter === 'inactive' && !ss.is_approved);
    return matchesSearch && matchesStatus;
  });

  const handleSaveDistributor = async () => {
    try {
      if (!distributorForm.name || !distributorForm.contact_person || !distributorForm.phone) {
        toast({
          title: 'Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        });
        return;
      }

      const saveData = {
        name: distributorForm.name,
        contact_person: distributorForm.contact_person,
        phone: distributorForm.phone,
        email: distributorForm.email || null,
        address: distributorForm.address || null,
        credit_limit: Number(distributorForm.credit_limit || 0),
        gst_number: distributorForm.gst_number || null,
        parent_type: distributorForm.parent_type || null,
        parent_id: distributorForm.parent_id || null,
        territory_id: distributorForm.territory_id || null,
        status: 'active'
      };

      let distributorId: string;

      if (selectedDistributor && isEditing) {
        const { error } = await supabase
          .from('distributors')
          .update(saveData)
          .eq('id', selectedDistributor.id);
        if (error) throw error;
        distributorId = selectedDistributor.id;
      } else {
        const { data, error } = await supabase
          .from('distributors')
          .insert(saveData)
          .select()
          .single();
        if (error) throw error;
        distributorId = data.id;
      }

      // Update beat mappings
      await supabase
        .from('distributor_beat_mappings')
        .delete()
        .eq('distributor_id', distributorId);

      if (distributorForm.beat_ids.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const beatMappings = distributorForm.beat_ids.map(beatId => ({
          distributor_id: distributorId,
          beat_id: beatId,
          created_by: user?.id
        }));
        
        const { error: mappingError } = await supabase
          .from('distributor_beat_mappings')
          .insert(beatMappings);
        if (mappingError) throw mappingError;
      }

      toast({
        title: 'Success',
        description: `Distributor ${isEditing ? 'updated' : 'added'} successfully`
      });

      setShowAddDistributorModal(false);
      setShowViewModal(false);
      resetDistributorForm();
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

  const handleSaveStockist = async () => {
    try {
      if (!stockistForm.name) {
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
        name: stockistForm.name,
        contact_name: stockistForm.contact_name || null,
        contact_phone: stockistForm.contact_phone || null,
        contact_email: stockistForm.contact_email || null,
        city: stockistForm.city || null,
        state: stockistForm.state || null,
        skills: stockistForm.competitors,
        region_pincodes: stockistForm.region_pincodes,
        is_approved: true
      };

      if (selectedStockist && isEditing) {
        const { error } = await supabase
          .from('vendors')
          .update(saveData)
          .eq('id', selectedStockist.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert({ ...saveData, created_by: user.id });
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Super Stockist ${isEditing ? 'updated' : 'added'} successfully`
      });

      setShowAddStockistModal(false);
      setShowViewModal(false);
      resetStockistForm();
      loadData();
    } catch (error) {
      console.error('Error saving stockist:', error);
      toast({
        title: 'Error',
        description: 'Failed to save super stockist',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'distributor') {
        const { error } = await supabase
          .from('distributors')
          .delete()
          .eq('id', deleteTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vendors')
          .delete()
          .eq('id', deleteTarget.id);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `${deleteTarget.type === 'distributor' ? 'Distributor' : 'Super Stockist'} deleted successfully`
      });

      setShowDeleteDialog(false);
      setShowViewModal(false);
      setDeleteTarget(null);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete',
        variant: 'destructive'
      });
    }
  };

  const handleMassEditSave = async () => {
    try {
      if (selectedIds.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one distributor',
          variant: 'destructive'
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Delete existing mappings for selected distributors
      await supabase
        .from('distributor_beat_mappings')
        .delete()
        .in('distributor_id', selectedIds);

      // Insert new mappings
      if (massEditBeatIds.length > 0) {
        const newMappings = selectedIds.flatMap(distributorId =>
          massEditBeatIds.map(beatId => ({
            distributor_id: distributorId,
            beat_id: beatId,
            created_by: user?.id
          }))
        );

        const { error } = await supabase
          .from('distributor_beat_mappings')
          .insert(newMappings);
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Beat mappings updated for ${selectedIds.length} distributor(s)`
      });

      setShowMassEditModal(false);
      setSelectedIds([]);
      setMassEditBeatIds([]);
      loadData();
    } catch (error) {
      console.error('Error in mass edit:', error);
      toast({
        title: 'Error',
        description: 'Failed to update beat mappings',
        variant: 'destructive'
      });
    }
  };

  const resetDistributorForm = () => {
    setDistributorForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: '',
      gst_number: '',
      parent_type: '',
      parent_id: '',
      territory_id: '',
      beat_ids: []
    });
    setSelectedDistributor(null);
    setIsEditing(false);
  };

  const resetStockistForm = () => {
    setStockistForm({
      name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      city: '',
      state: '',
      competitors: [],
      region_pincodes: []
    });
    setSelectedStockist(null);
    setIsEditing(false);
  };

  const openDistributorView = (distributor: Distributor) => {
    setSelectedDistributor(distributor);
    setDistributorForm({
      name: distributor.name,
      contact_person: distributor.contact_person,
      phone: distributor.phone,
      email: distributor.email || '',
      address: distributor.address || '',
      credit_limit: distributor.credit_limit.toString(),
      gst_number: distributor.gst_number || '',
      parent_type: distributor.parent_type || '',
      parent_id: distributor.parent_id || '',
      territory_id: distributor.territory_id || '',
      beat_ids: distributor.beat_ids || []
    });
    setIsEditing(false);
    setShowViewModal(true);
  };

  const openStockistView = (stockist: SuperStockist) => {
    setSelectedStockist(stockist);
    setStockistForm({
      name: stockist.name,
      contact_name: stockist.contact_name || '',
      contact_phone: stockist.contact_phone || '',
      contact_email: stockist.contact_email || '',
      city: stockist.city || '',
      state: stockist.state || '',
      competitors: stockist.competitors || [],
      region_pincodes: stockist.region_pincodes || []
    });
    setIsEditing(false);
    setShowViewModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDistributors.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDistributors.map(d => d.id));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="relative p-4 sm:p-6">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl sm:text-3xl font-bold">Distributor and Stockist Master</h1>
                <p className="text-primary-foreground/80 text-sm sm:text-base mt-1">
                  Manage your distributor and stockist network
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  resetDistributorForm();
                  setShowAddDistributorModal(true);
                }}
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
              >
                <Plus size={16} className="mr-2" />
                Add Distributor
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Search by name, phone, address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {activeTab === 'distributors' && (
                  <>
                    <Select value={beatFilter} onValueChange={setBeatFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Beat" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Beats</SelectItem>
                        {beats.map(beat => (
                          <SelectItem key={beat.id} value={beat.id}>{beat.beat_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedIds.length > 0 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowMassEditModal(true)}
                        className="gap-2"
                      >
                        <Settings2 size={16} />
                        Mass Edit ({selectedIds.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="distributors">Distributors ({filteredDistributors.length})</TabsTrigger>
            <TabsTrigger value="stockists">Super Stockists ({filteredStockists.length})</TabsTrigger>
          </TabsList>

          {/* Distributors Tab */}
          <TabsContent value="distributors" className="space-y-4 mt-4">
            {filteredDistributors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No distributors found matching your search' : 'No distributors added yet'}
                  </p>
                  <Button onClick={() => { resetDistributorForm(); setShowAddDistributorModal(true); }} className="mt-4">
                    <Plus size={16} className="mr-2" />
                    Add First Distributor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {/* Header row with select all */}
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={selectedIds.length === filteredDistributors.length && filteredDistributors.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
                
                {filteredDistributors.map(distributor => (
                  <Card 
                    key={distributor.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.includes(distributor.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(prev => [...prev, distributor.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== distributor.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div 
                          className="flex-1"
                          onClick={() => openDistributorView(distributor)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">{distributor.name}</h3>
                              <p className="text-sm text-muted-foreground">{distributor.contact_person}</p>
                            </div>
                            <Badge variant={distributor.status === 'active' ? 'default' : 'secondary'}>
                              {distributor.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone size={14} />
                              {distributor.phone}
                            </div>
                            {distributor.address && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin size={14} />
                                <span className="truncate">{distributor.address}</span>
                              </div>
                            )}
                            {distributor.credit_limit > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <CreditCard size={14} />
                                {formatCurrency(distributor.credit_limit)}
                              </div>
                            )}
                          </div>
                          {distributor.beat_names && distributor.beat_names.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {distributor.beat_names.map((beat, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {beat}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Super Stockists Tab */}
          <TabsContent value="stockists" className="space-y-4 mt-4">
            <div className="flex justify-end mb-2">
              <Button onClick={() => { resetStockistForm(); setShowAddStockistModal(true); }}>
                <Plus size={16} className="mr-2" />
                Add Super Stockist
              </Button>
            </div>
            
            {filteredStockists.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No super stockists found matching your search' : 'No super stockists added yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredStockists.map(stockist => (
                  <Card 
                    key={stockist.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openStockistView(stockist)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{stockist.name}</h3>
                          {stockist.contact_name && (
                            <p className="text-sm text-muted-foreground">{stockist.contact_name}</p>
                          )}
                        </div>
                        <Badge variant={stockist.is_approved ? 'default' : 'secondary'}>
                          {stockist.is_approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm">
                        {stockist.contact_phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone size={14} />
                            {stockist.contact_phone}
                          </div>
                        )}
                        {(stockist.city || stockist.state) && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin size={14} />
                            {[stockist.city, stockist.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                      {stockist.competitors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {stockist.competitors.slice(0, 3).map((competitor, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {competitor}
                            </Badge>
                          ))}
                          {stockist.competitors.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{stockist.competitors.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Distributor Modal */}
      <Dialog open={showAddDistributorModal} onOpenChange={setShowAddDistributorModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Distributor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Company Name *</label>
                <Input
                  value={distributorForm.name}
                  onChange={(e) => setDistributorForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Contact Person *</label>
                <Input
                  value={distributorForm.contact_person}
                  onChange={(e) => setDistributorForm(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Contact person name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Phone *</label>
                <Input
                  value={distributorForm.phone}
                  onChange={(e) => setDistributorForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={distributorForm.email}
                  onChange={(e) => setDistributorForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Credit Limit (₹)</label>
                <Input
                  type="number"
                  value={distributorForm.credit_limit}
                  onChange={(e) => setDistributorForm(prev => ({ ...prev, credit_limit: e.target.value }))}
                  placeholder="Credit limit"
                />
              </div>
              <div>
                <label className="text-sm font-medium">GST Number</label>
                <Input
                  value={distributorForm.gst_number}
                  onChange={(e) => setDistributorForm(prev => ({ ...prev, gst_number: e.target.value }))}
                  placeholder="GST number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Parent Type</label>
                <Select 
                  value={distributorForm.parent_type} 
                  onValueChange={(val: 'super_stockist' | 'company') => setDistributorForm(prev => ({ ...prev, parent_type: val, parent_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_stockist">Super Stockist</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {distributorForm.parent_type === 'super_stockist' && (
                <div>
                  <label className="text-sm font-medium">Select Super Stockist</label>
                  <Select value={distributorForm.parent_id} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, parent_id: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select super stockist" />
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
              <Select value={distributorForm.territory_id} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, territory_id: val }))}>
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
              <label className="text-sm font-medium">Assign to Beats</label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {beats.map(beat => (
                  <div key={beat.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={distributorForm.beat_ids.includes(beat.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDistributorForm(prev => ({ ...prev, beat_ids: [...prev.beat_ids, beat.id] }));
                        } else {
                          setDistributorForm(prev => ({ ...prev, beat_ids: prev.beat_ids.filter(id => id !== beat.id) }));
                        }
                      }}
                    />
                    <span className="text-sm">{beat.beat_name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={distributorForm.address}
                onChange={(e) => setDistributorForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Complete address"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDistributorModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDistributor}>
                Add Distributor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Super Stockist Modal */}
      <Dialog open={showAddStockistModal} onOpenChange={setShowAddStockistModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Super Stockist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Super Stockist Name *</label>
              <Input
                value={stockistForm.name}
                onChange={(e) => setStockistForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Contact Person</label>
                <Input
                  value={stockistForm.contact_name}
                  onChange={(e) => setStockistForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={stockistForm.contact_phone}
                  onChange={(e) => setStockistForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={stockistForm.contact_email}
                  onChange={(e) => setStockistForm(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="Email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  value={stockistForm.city}
                  onChange={(e) => setStockistForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">State</label>
              <Input
                value={stockistForm.state}
                onChange={(e) => setStockistForm(prev => ({ ...prev, state: e.target.value }))}
                placeholder="State"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Top 3 Competitors or Brands</label>
              <div className="grid grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={stockistForm.competitors.includes(category.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStockistForm(prev => ({ ...prev, competitors: [...prev.competitors, category.name] }));
                        } else {
                          setStockistForm(prev => ({ ...prev, competitors: prev.competitors.filter(c => c !== category.name) }));
                        }
                      }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Region Pincodes</label>
              <Input
                value={stockistForm.region_pincodes.join(', ')}
                onChange={(e) => {
                  const pincodes = e.target.value.split(',').map(p => p.trim()).filter(p => p);
                  setStockistForm(prev => ({ ...prev, region_pincodes: pincodes }));
                }}
                placeholder="Enter pincodes separated by commas"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddStockistModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStockist}>
                Add Super Stockist
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDistributor ? 'Distributor Details' : 'Super Stockist Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDistributor ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  {isEditing ? (
                    <Input
                      value={distributorForm.name}
                      onChange={(e) => setDistributorForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{distributorForm.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                  {isEditing ? (
                    <Input
                      value={distributorForm.contact_person}
                      onChange={(e) => setDistributorForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{distributorForm.contact_person}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  {isEditing ? (
                    <Input
                      value={distributorForm.phone}
                      onChange={(e) => setDistributorForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{distributorForm.phone}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  {isEditing ? (
                    <Input
                      value={distributorForm.email}
                      onChange={(e) => setDistributorForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{distributorForm.email || '-'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Credit Limit</label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={distributorForm.credit_limit}
                      onChange={(e) => setDistributorForm(prev => ({ ...prev, credit_limit: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{formatCurrency(Number(distributorForm.credit_limit || 0))}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">GST Number</label>
                  {isEditing ? (
                    <Input
                      value={distributorForm.gst_number}
                      onChange={(e) => setDistributorForm(prev => ({ ...prev, gst_number: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{distributorForm.gst_number || '-'}</p>
                  )}
                </div>
              </div>

              {isEditing && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Parent Type</label>
                      <Select 
                        value={distributorForm.parent_type} 
                        onValueChange={(val: 'super_stockist' | 'company') => setDistributorForm(prev => ({ ...prev, parent_type: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_stockist">Super Stockist</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Territory</label>
                      <Select value={distributorForm.territory_id} onValueChange={(val) => setDistributorForm(prev => ({ ...prev, territory_id: val }))}>
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
                  </div>

                  <div>
                    <label className="text-sm font-medium">Assign to Beats</label>
                    <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                      {beats.map(beat => (
                        <div key={beat.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={distributorForm.beat_ids.includes(beat.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setDistributorForm(prev => ({ ...prev, beat_ids: [...prev.beat_ids, beat.id] }));
                              } else {
                                setDistributorForm(prev => ({ ...prev, beat_ids: prev.beat_ids.filter(id => id !== beat.id) }));
                              }
                            }}
                          />
                          <span className="text-sm">{beat.beat_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!isEditing && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Parent</label>
                    <p className="font-medium">{selectedDistributor.parent_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned Beats</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedDistributor.beat_names && selectedDistributor.beat_names.length > 0 ? (
                        selectedDistributor.beat_names.map((beat, idx) => (
                          <Badge key={idx} variant="outline">{beat}</Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No beats assigned</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                {isEditing ? (
                  <Input
                    value={distributorForm.address}
                    onChange={(e) => setDistributorForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                ) : (
                  <p className="font-medium">{distributorForm.address || '-'}</p>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setDeleteTarget({ type: 'distributor', id: selectedDistributor.id, name: selectedDistributor.name });
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button onClick={handleSaveDistributor}>Save Changes</Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : selectedStockist ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  {isEditing ? (
                    <Input
                      value={stockistForm.name}
                      onChange={(e) => setStockistForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{stockistForm.name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
                  {isEditing ? (
                    <Input
                      value={stockistForm.contact_name}
                      onChange={(e) => setStockistForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{stockistForm.contact_name || '-'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  {isEditing ? (
                    <Input
                      value={stockistForm.contact_phone}
                      onChange={(e) => setStockistForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{stockistForm.contact_phone || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  {isEditing ? (
                    <Input
                      value={stockistForm.contact_email}
                      onChange={(e) => setStockistForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{stockistForm.contact_email || '-'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  {isEditing ? (
                    <Input
                      value={stockistForm.city}
                      onChange={(e) => setStockistForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{stockistForm.city || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">State</label>
                  {isEditing ? (
                    <Input
                      value={stockistForm.state}
                      onChange={(e) => setStockistForm(prev => ({ ...prev, state: e.target.value }))}
                    />
                  ) : (
                    <p className="font-medium">{stockistForm.state || '-'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Competitors/Brands</label>
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={stockistForm.competitors.includes(category.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStockistForm(prev => ({ ...prev, competitors: [...prev.competitors, category.name] }));
                            } else {
                              setStockistForm(prev => ({ ...prev, competitors: prev.competitors.filter(c => c !== category.name) }));
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stockistForm.competitors.length > 0 ? (
                      stockistForm.competitors.map((c, idx) => (
                        <Badge key={idx} variant="outline">{c}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setDeleteTarget({ type: 'stockist', id: selectedStockist.id, name: selectedStockist.name });
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </Button>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button onClick={handleSaveStockist}>Save Changes</Button>
                    </>
                  ) : (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit size={16} className="mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Mass Edit Modal */}
      <Dialog open={showMassEditModal} onOpenChange={setShowMassEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mass Edit - Assign Beats</DialogTitle>
            <DialogDescription>
              Assign beats to {selectedIds.length} selected distributor(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Beats to Assign</label>
              <ScrollArea className="h-64 border rounded-md p-3 mt-2">
                {beats.map(beat => (
                  <div key={beat.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      checked={massEditBeatIds.includes(beat.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setMassEditBeatIds(prev => [...prev, beat.id]);
                        } else {
                          setMassEditBeatIds(prev => prev.filter(id => id !== beat.id));
                        }
                      }}
                    />
                    <span className="text-sm">{beat.beat_name}</span>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowMassEditModal(false);
                setMassEditBeatIds([]);
              }}>
                Cancel
              </Button>
              <Button onClick={handleMassEditSave}>
                Apply to {selectedIds.length} Distributor(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setDeleteTarget(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DistributorMapping;
