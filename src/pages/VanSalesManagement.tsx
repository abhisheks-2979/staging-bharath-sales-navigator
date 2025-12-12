import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { moveToRecycleBin } from '@/utils/recycleBinUtils';
import { Truck, Plus, Edit, Trash2, Package, RotateCcw, ChevronDown, ChevronRight, ShoppingCart, TrendingDown, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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
  assigned_user_id?: string;
  assigned_user_name?: string;
}

interface UserOption {
  id: string;
  full_name: string;
}

interface VanStockSummary {
  id: string;
  van_id: string;
  van_registration: string;
  van_model: string;
  user_name: string;
  user_id: string;
  beat_name: string;
  stock_date: string;
  total_stock: number;
  total_ordered: number;
  total_returned: number;
  closing_stock: number;
  start_km: number;
  end_km: number;
  items: VanStockItem[];
}

interface VanStockItem {
  id: string;
  product_id: string;
  product_name: string;
  unit: string;
  start_qty: number;
  ordered_qty: number;
  returned_qty: number;
  left_qty: number;
  price_without_gst: number;
}

export default function VanSalesManagement() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [vans, setVans] = useState<Van[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);
  // No date filter - show all van stock data for admin
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
    assigned_user_id: '',
  });

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    loadVans();
    loadUsers();
    loadVanStockSummaries();
  }, [userRole, navigate]);

  // Real-time subscription for van_stock and van_stock_items changes
  useEffect(() => {
    const channel = supabase
      .channel('van-stock-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'van_stock' },
        () => loadVanStockSummaries()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'van_stock_items' },
        () => loadVanStockSummaries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadVans = async () => {
    // Fetch vans - assigned_user_id may not exist yet if migration pending
    const { data, error } = await supabase
      .from('vans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading vans:', error);
      toast.error('Failed to load vans');
      setLoading(false);
      return;
    }
    
    // Get assigned user names if assigned_user_id exists
    const vansWithUsers = await Promise.all((data || []).map(async (van) => {
      let assigned_user_name = null;
      if ((van as any).assigned_user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', (van as any).assigned_user_id)
          .maybeSingle();
        assigned_user_name = profile?.full_name || null;
      }
      return {
        ...van,
        assigned_user_id: (van as any).assigned_user_id || null,
        assigned_user_name
      };
    }));
    
    setVans(vansWithUsers);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    
    if (error) {
      console.error('Error loading users:', error);
    } else {
      setUsers(data || []);
    }
  };

  const loadVanStockSummaries = async () => {
    try {
      // Get ALL van_stock records with user info, van info - no date filter for admin view
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
        .order('stock_date', { ascending: false });

      if (stockError) throw stockError;
      
      console.log('Loaded van_stock records:', stockData?.length);

      // Get products for price lookup
      const { data: products } = await supabase
        .from('products')
        .select('id, rate');
      
      const productPriceMap: Record<string, number> = {};
      products?.forEach(p => {
        productPriceMap[p.id] = p.rate || 0;
      });

      // Get stock items for each van_stock
      const summaries: VanStockSummary[] = [];
      
      for (const stock of stockData || []) {
        // Get stock items with full details
        const { data: items } = await supabase
          .from('van_stock_items')
          .select('id, product_id, product_name, unit, start_qty, ordered_qty, returned_qty, left_qty')
          .eq('van_stock_id', stock.id);

        // Get beat name from beat_plans for this user and date
        const { data: beatPlan } = await supabase
          .from('beat_plans')
          .select('beat_name')
          .eq('user_id', stock.user_id)
          .eq('plan_date', stock.stock_date)
          .maybeSingle();

        const stockItems: VanStockItem[] = (items || []).map((item: any) => {
          const priceWithGST = productPriceMap[item.product_id] || 0;
          const priceWithoutGST = priceWithGST / 1.05; // Remove 5% GST
          return {
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            unit: item.unit,
            start_qty: item.start_qty || 0,
            ordered_qty: item.ordered_qty || 0,
            returned_qty: item.returned_qty || 0,
            left_qty: (item.start_qty || 0) - (item.ordered_qty || 0) + (item.returned_qty || 0),
            price_without_gst: priceWithoutGST
          };
        });

        const totalStock = stockItems.reduce((sum, item) => sum + item.start_qty, 0);
        const totalOrdered = stockItems.reduce((sum, item) => sum + item.ordered_qty, 0);
        const totalReturned = stockItems.reduce((sum, item) => sum + item.returned_qty, 0);
        const closingStock = stockItems.reduce((sum, item) => sum + item.left_qty, 0);

        summaries.push({
          id: stock.id,
          van_id: stock.van_id,
          van_registration: (stock.vans as any)?.registration_number || 'Unknown',
          van_model: (stock.vans as any)?.make_model || '',
          user_name: (stock.profiles as any)?.full_name || 'Unknown User',
          user_id: stock.user_id,
          beat_name: beatPlan?.beat_name || 'No Beat',
          stock_date: stock.stock_date,
          total_stock: totalStock,
          total_ordered: totalOrdered,
          total_returned: totalReturned,
          closing_stock: closingStock,
          start_km: stock.start_km || 0,
          end_km: stock.end_km || 0,
          items: stockItems
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
      assigned_user_id: formData.assigned_user_id || null,
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
      assigned_user_id: '',
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
      assigned_user_id: van.assigned_user_id || '',
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
                      assigned_user_id: '',
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
                    <div>
                      <Label htmlFor="assigned_user">Assign to User</Label>
                      <Select
                        value={formData.assigned_user_id}
                        onValueChange={(value) => setFormData({ ...formData, assigned_user_id: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No user assigned</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || 'Unnamed User'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This van will be pre-selected for the assigned user in Van Stock
                      </p>
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
                    {van.assigned_user_name && (
                      <p className="flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground">Assigned to:</span> 
                        <span className="font-medium text-primary">{van.assigned_user_name}</span>
                      </p>
                    )}
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

        {/* Van Inventory & Stock Management - Shows all users' van stock */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Van Inventory & Stock Management</CardTitle>
            <CardDescription>
              All users' van stock - Real-time updates from My Visits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vanStockSummaries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No van stock records found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Users will appear here when they add van stock in My Visits
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
                                <p className="font-semibold">{summary.user_name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Van: {summary.van_registration} ({summary.van_model}) • Beat: {summary.beat_name}
                                </p>
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
                          {/* Summary Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                                <span className="text-xs text-muted-foreground">Ordered Qty</span>
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
                                <span className="text-xs text-muted-foreground">Left in Van</span>
                              </div>
                              <p className="text-2xl font-bold text-green-600">{summary.closing_stock}</p>
                            </div>
                          </div>

                          {/* KM Tracking */}
                          <div className="flex items-center gap-4 text-sm mb-4 p-2 bg-muted/50 rounded">
                            <span className="text-muted-foreground">Start KM: <span className="font-semibold text-foreground">{summary.start_km}</span></span>
                            <span className="text-muted-foreground">End KM: <span className="font-semibold text-foreground">{summary.end_km || '-'}</span></span>
                            <span className="text-muted-foreground">Total KM: <span className="font-semibold text-primary">{summary.end_km > 0 ? summary.end_km - summary.start_km : '-'}</span></span>
                          </div>

                          {/* Product Details */}
                          <div className="border-t pt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4" /> Product Details
                            </h4>
                            {summary.items.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No products in this van stock</p>
                            ) : (
                              <div className="space-y-2">
                                {summary.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex-1">
                                      <p className="font-medium">{item.product_name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        ₹{item.price_without_gst.toFixed(2)} (excl. GST) • {item.unit}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="text-right">
                                        <p className="text-lg font-bold">{item.start_qty}</p>
                                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                                      </div>
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
      </div>
    </Layout>
  );
}
