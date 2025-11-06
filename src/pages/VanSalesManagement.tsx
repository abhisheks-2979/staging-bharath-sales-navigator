import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Plus, Edit, Trash2, Package, RotateCcw, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { VanMorningInventory } from '@/components/VanMorningInventory';
import { VanReturnStock } from '@/components/VanReturnStock';
import { VanClosingStock } from '@/components/VanClosingStock';
import { VanStockView } from '@/components/VanStockView';

interface Van {
  id: string;
  registration_number: string;
  make_model: string;
  purchase_date?: string;
  rc_book_url?: string;
  rc_expiry_date?: string;
  insurance_url?: string;
  insurance_expiry_date?: string;
  pollution_cert_url?: string;
  pollution_expiry_date?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_address?: string;
  driver_id_proof_url?: string;
  is_active: boolean;
}

export default function VanSalesManagement() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);
  const [morningInventoryOpen, setMorningInventoryOpen] = useState(false);
  const [returnStockOpen, setReturnStockOpen] = useState(false);
  const [closingStockOpen, setClosingStockOpen] = useState(false);
  const [selectedDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    registration_number: '',
    make_model: '',
    purchase_date: '',
    rc_expiry_date: '',
    insurance_expiry_date: '',
    pollution_expiry_date: '',
    driver_name: '',
    driver_phone: '',
    driver_address: '',
  });

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    loadSettings();
    loadVans();
  }, [userRole, navigate]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('van_sales_settings')
      .select('is_enabled')
      .single();
    
    if (error) {
      console.error('Error loading settings:', error);
    } else if (data) {
      setIsEnabled(data.is_enabled);
    }
    setLoading(false);
  };

  const loadVans = async () => {
    const { data, error } = await supabase
      .from('vans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading vans:', error);
      toast.error('Failed to load vans');
    } else {
      setVans(data || []);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    const { error } = await supabase
      .from('van_sales_settings')
      .update({ is_enabled: enabled })
      .eq('id', (await supabase.from('van_sales_settings').select('id').single()).data?.id);
    
    if (error) {
      toast.error('Failed to update settings');
    } else {
      setIsEnabled(enabled);
      toast.success(`Van Sales ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  const handleSubmit = async () => {
    if (!formData.registration_number || !formData.make_model) {
      toast.error('Please fill in required fields');
      return;
    }

    const payload = {
      ...formData,
      is_active: true,
    };

    if (editingVan) {
      const { error } = await supabase
        .from('vans')
        .update(payload)
        .eq('id', editingVan.id);
      
      if (error) {
        toast.error('Failed to update van');
      } else {
        toast.success('Van updated successfully');
        setShowAddModal(false);
        setEditingVan(null);
        loadVans();
      }
    } else {
      const { error } = await supabase
        .from('vans')
        .insert([payload]);
      
      if (error) {
        toast.error('Failed to add van');
      } else {
        toast.success('Van added successfully');
        setShowAddModal(false);
        loadVans();
      }
    }

    setFormData({
      registration_number: '',
      make_model: '',
      purchase_date: '',
      rc_expiry_date: '',
      insurance_expiry_date: '',
      pollution_expiry_date: '',
      driver_name: '',
      driver_phone: '',
      driver_address: '',
    });
  };

  const handleEdit = (van: Van) => {
    setEditingVan(van);
    setFormData({
      registration_number: van.registration_number,
      make_model: van.make_model,
      purchase_date: van.purchase_date || '',
      rc_expiry_date: van.rc_expiry_date || '',
      insurance_expiry_date: van.insurance_expiry_date || '',
      pollution_expiry_date: van.pollution_expiry_date || '',
      driver_name: van.driver_name || '',
      driver_phone: van.driver_phone || '',
      driver_address: van.driver_address || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this van?')) return;

    const { error } = await supabase
      .from('vans')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete van');
    } else {
      toast.success('Van deleted successfully');
      loadVans();
    }
  };

  if (loading) return <Layout><div className="p-8">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Van Sales Management</h1>
            <p className="text-muted-foreground mt-1">Manage van fleet and sales operations</p>
          </div>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Van Sales Feature</h3>
              <p className="text-sm text-muted-foreground">Enable or disable van sales module for all users</p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </Card>

        {isEnabled && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Van Inventory & Stock Management</CardTitle>
              <CardDescription>Live tracking with morning GRN, returns, and closing stock</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="stock">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="stock">Stock in Van</TabsTrigger>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="morning">Morning GRN</TabsTrigger>
                  <TabsTrigger value="returns">Returns</TabsTrigger>
                  <TabsTrigger value="closing">Closing Stock</TabsTrigger>
                </TabsList>
                <TabsContent value="stock" className="mt-4">
                  <VanStockView selectedDate={selectedDate} />
                </TabsContent>
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Button onClick={() => setMorningInventoryOpen(true)} className="h-24 flex-col gap-2">
                      <Package className="h-8 w-8" />
                      <span>Morning Inventory</span>
                    </Button>
                    <Button onClick={() => setReturnStockOpen(true)} variant="outline" className="h-24 flex-col gap-2">
                      <RotateCcw className="h-8 w-8" />
                      <span>Return Stock</span>
                    </Button>
                    <Button onClick={() => setClosingStockOpen(true)} variant="outline" className="h-24 flex-col gap-2">
                      <ClipboardList className="h-8 w-8" />
                      <span>Closing Stock</span>
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="morning">
                  <Button onClick={() => setMorningInventoryOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Morning Inventory</Button>
                </TabsContent>
                <TabsContent value="returns">
                  <Button onClick={() => setReturnStockOpen(true)}><Plus className="mr-2 h-4 w-4" />Record Returns</Button>
                </TabsContent>
                <TabsContent value="closing">
                  <Button onClick={() => setClosingStockOpen(true)}><ClipboardList className="mr-2 h-4 w-4" />View Closing Stock</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <VanMorningInventory open={morningInventoryOpen} onOpenChange={setMorningInventoryOpen} selectedDate={selectedDate} />
        <VanReturnStock open={returnStockOpen} onOpenChange={setReturnStockOpen} selectedDate={selectedDate} />
        <VanClosingStock open={closingStockOpen} onOpenChange={setClosingStockOpen} selectedDate={selectedDate} />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Van Database</h2>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingVan(null);
                setFormData({
                  registration_number: '',
                  make_model: '',
                  purchase_date: '',
                  rc_expiry_date: '',
                  insurance_expiry_date: '',
                  pollution_expiry_date: '',
                  driver_name: '',
                  driver_phone: '',
                  driver_address: '',
                });
              }}>
                <Plus className="mr-2 h-4 w-4" /> Add Van
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVan ? 'Edit Van' : 'Add New Van'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="registration_number">Registration Number *</Label>
                  <Input
                    id="registration_number"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="e.g., MH-12-AB-1234"
                  />
                </div>
                <div>
                  <Label htmlFor="make_model">Make / Model *</Label>
                  <Input
                    id="make_model"
                    value={formData.make_model}
                    onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
                    placeholder="e.g., Tata Ace"
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="rc_expiry_date">RC Book Expiry Date</Label>
                  <Input
                    id="rc_expiry_date"
                    type="date"
                    value={formData.rc_expiry_date}
                    onChange={(e) => setFormData({ ...formData, rc_expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="insurance_expiry_date">Insurance Expiry Date</Label>
                  <Input
                    id="insurance_expiry_date"
                    type="date"
                    value={formData.insurance_expiry_date}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pollution_expiry_date">Pollution Certificate Expiry</Label>
                  <Input
                    id="pollution_expiry_date"
                    type="date"
                    value={formData.pollution_expiry_date}
                    onChange={(e) => setFormData({ ...formData, pollution_expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="driver_name">Driver Name</Label>
                  <Input
                    id="driver_name"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    placeholder="Driver's full name"
                  />
                </div>
                <div>
                  <Label htmlFor="driver_phone">Driver Phone</Label>
                  <Input
                    id="driver_phone"
                    value={formData.driver_phone}
                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                    placeholder="Driver's contact number"
                  />
                </div>
                <div>
                  <Label htmlFor="driver_address">Driver Address</Label>
                  <Textarea
                    id="driver_address"
                    value={formData.driver_address}
                    onChange={(e) => setFormData({ ...formData, driver_address: e.target.value })}
                    placeholder="Driver's address"
                    rows={3}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingVan ? 'Update Van' : 'Add Van'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vans.map((van) => (
            <Card key={van.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{van.registration_number}</h3>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(van)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(van.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Model:</span> {van.make_model}</p>
                {van.driver_name && (
                  <p><span className="text-muted-foreground">Driver:</span> {van.driver_name}</p>
                )}
                {van.driver_phone && (
                  <p><span className="text-muted-foreground">Phone:</span> {van.driver_phone}</p>
                )}
                {van.rc_expiry_date && (
                  <p><span className="text-muted-foreground">RC Expiry:</span> {new Date(van.rc_expiry_date).toLocaleDateString()}</p>
                )}
                {van.insurance_expiry_date && (
                  <p><span className="text-muted-foreground">Insurance Expiry:</span> {new Date(van.insurance_expiry_date).toLocaleDateString()}</p>
                )}
                <div className="pt-2">
                  <span className={`px-2 py-1 rounded text-xs ${van.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {van.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {vans.length === 0 && (
          <Card className="p-8 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No vans added yet. Click "Add Van" to get started.</p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
