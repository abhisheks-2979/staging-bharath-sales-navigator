import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { moveToRecycleBin } from '@/utils/recycleBinUtils';
import { Truck, Plus, Edit, Trash2, Package, RotateCcw, ClipboardList, ChevronDown, ChevronRight, ShoppingCart, TrendingDown } from 'lucide-react';
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
  is_active: boolean;
}

interface VanStockSummary {
  van_id: string;
  van_registration: string;
  van_model: string;
  user_name: string;
  user_id: string;
  stock_date: string;
  total_stock: number;
  total_ordered: number;
  total_returned: number;
  closing_stock: number;
  start_km: number;
  end_km: number;
}

export default function VanSalesManagement() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);
  const [morningInventoryOpen, setMorningInventoryOpen] = useState(false);
  const [returnStockOpen, setReturnStockOpen] = useState(false);
  const [closingStockOpen, setClosingStockOpen] = useState(false);
  const [selectedDate] = useState(new Date());
  const [vanStockSummaries, setVanStockSummaries] = useState<VanStockSummary[]>([]);
  const [expandedVans, setExpandedVans] = useState<Set<string>>(new Set());
  
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
    loadVans();
    loadVanStockSummaries();
  }, [userRole, navigate]);

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
    setLoading(false);
  };

  const loadVanStockSummaries = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Get all van_stock records for today with user info
      const { data: stockData, error: stockError } = await supabase
        .from('van_stock')
        .select(`
          id,
          van_id,
          user_id,
          stock_date,
          start_km,
          end_km,
          vans (
            registration_number,
            make_model
          ),
          profiles:user_id (
            full_name
          )
        `)
        .eq('stock_date', dateStr);

      if (stockError) throw stockError;

      // Get stock items for each van_stock
      const summaries: VanStockSummary[] = [];
      
      for (const stock of stockData || []) {
        // Get stock items
        const { data: items } = await supabase
          .from('van_stock_items')
          .select('start_qty, ordered_qty, returned_qty, left_qty')
          .eq('van_stock_id', stock.id);

        const totalStock = items?.reduce((sum, item) => sum + (item.start_qty || 0), 0) || 0;
        const totalOrdered = items?.reduce((sum, item) => sum + (item.ordered_qty || 0), 0) || 0;
        const totalReturned = items?.reduce((sum, item) => sum + (item.returned_qty || 0), 0) || 0;
        const closingStock = items?.reduce((sum, item) => sum + (item.left_qty || 0), 0) || 0;

        summaries.push({
          van_id: stock.van_id,
          van_registration: (stock.vans as any)?.registration_number || 'Unknown',
          van_model: (stock.vans as any)?.make_model || '',
          user_name: (stock.profiles as any)?.full_name || 'Unknown User',
          user_id: stock.user_id,
          stock_date: stock.stock_date,
          total_stock: totalStock,
          total_ordered: totalOrdered,
          total_returned: totalReturned,
          closing_stock: closingStock,
          start_km: stock.start_km || 0,
          end_km: stock.end_km || 0
        });
      }

      setVanStockSummaries(summaries);
    } catch (error) {
      console.error('Error loading van stock summaries:', error);
    }
  };

  const toggleVanExpanded = (vanId: string) => {
    setExpandedVans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vanId)) {
        newSet.delete(vanId);
      } else {
        newSet.add(vanId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (!formData.registration_number || !formData.make_model) {
      toast.error('Please enter Van Registration Number and Make/Model');
      return;
    }

    const payload = {
      ...formData,
      purchase_date: formData.purchase_date || null,
      rc_expiry_date: formData.rc_expiry_date || null,
      insurance_expiry_date: formData.insurance_expiry_date || null,
      pollution_expiry_date: formData.pollution_expiry_date || null,
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
    if (!confirm('Are you sure you want to move this van to recycle bin?')) return;

    const vanData = vans.find(v => v.id === id);
    if (vanData) {
      await moveToRecycleBin({
        tableName: 'vans',
        recordId: id,
        recordData: vanData,
        moduleName: 'Vans',
        recordName: vanData.registration_number
      });
    }

    const { error } = await supabase
      .from('vans')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete van');
    } else {
      toast.success('Van moved to recycle bin');
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

        {/* Van Database - Moved to TOP */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Van Database</CardTitle>
                <CardDescription>Manage your van fleet</CardDescription>
              </div>
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
          </CardHeader>
          <CardContent>
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
              <div className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No vans added yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first van to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Van Inventory & Stock Management - Shows user-selected vans */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Van Inventory & Stock Management</CardTitle>
            <CardDescription>
              Vans selected by users today ({selectedDate.toLocaleDateString()}) - Click to expand details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vanStockSummaries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No van stock records for today</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Users will appear here when they select a van in My Visits
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {vanStockSummaries.map((summary) => (
                  <Collapsible
                    key={`${summary.van_id}-${summary.user_id}`}
                    open={expandedVans.has(`${summary.van_id}-${summary.user_id}`)}
                    onOpenChange={() => toggleVanExpanded(`${summary.van_id}-${summary.user_id}`)}
                  >
                    <CollapsibleTrigger asChild>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Truck className="h-5 w-5 text-primary" />
                              <div>
                                <p className="font-semibold">{summary.van_registration}</p>
                                <p className="text-sm text-muted-foreground">{summary.van_model} • {summary.user_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right text-sm">
                                <p className="text-muted-foreground">Stock: <span className="font-semibold text-foreground">{summary.total_stock}</span></p>
                              </div>
                              {expandedVans.has(`${summary.van_id}-${summary.user_id}`) ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2 border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Package className="h-4 w-4 text-blue-600" />
                                <span className="text-xs text-muted-foreground">Stock in Van</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-600">{summary.total_stock}</p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <ShoppingCart className="h-4 w-4 text-amber-600" />
                                <span className="text-xs text-muted-foreground">Retailers Order Qty</span>
                              </div>
                              <p className="text-2xl font-bold text-amber-600">{summary.total_ordered}</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <RotateCcw className="h-4 w-4 text-purple-600" />
                                <span className="text-xs text-muted-foreground">Returned Qty</span>
                              </div>
                              <p className="text-2xl font-bold text-purple-600">{summary.total_returned}</p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingDown className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-muted-foreground">Closing GRN (Left in Van)</span>
                              </div>
                              <p className="text-2xl font-bold text-green-600">{summary.closing_stock}</p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex gap-4">
                                <span className="text-muted-foreground">Start KM: <span className="font-semibold text-foreground">{summary.start_km}</span></span>
                                <span className="text-muted-foreground">End KM: <span className="font-semibold text-foreground">{summary.end_km}</span></span>
                                <span className="text-muted-foreground">Total KM: <span className="font-semibold text-primary">{summary.end_km - summary.start_km}</span></span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Management Tools */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Stock Management Tools</CardTitle>
            <CardDescription>Quick access to inventory operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => setMorningInventoryOpen(true)} variant="outline" className="h-24 flex-col gap-2">
                <Package className="h-8 w-8" />
                <span>Morning GRN</span>
              </Button>
              <Button onClick={() => setReturnStockOpen(true)} variant="outline" className="h-24 flex-col gap-2">
                <RotateCcw className="h-8 w-8" />
                <span>Return Stock</span>
              </Button>
              <Button onClick={() => setClosingStockOpen(true)} variant="outline" className="h-24 flex-col gap-2">
                <ClipboardList className="h-8 w-8" />
                <span>Closing Stock</span>
              </Button>
              <Card className="h-24 flex flex-col items-center justify-center bg-muted/50">
                <VanStockView selectedDate={selectedDate} />
              </Card>
            </div>
          </CardContent>
        </Card>

        <VanMorningInventory open={morningInventoryOpen} onOpenChange={setMorningInventoryOpen} selectedDate={selectedDate} />
        <VanReturnStock open={returnStockOpen} onOpenChange={setReturnStockOpen} selectedDate={selectedDate} />
        <VanClosingStock open={closingStockOpen} onOpenChange={setClosingStockOpen} selectedDate={selectedDate} />
      </div>
    </Layout>
  );
}
