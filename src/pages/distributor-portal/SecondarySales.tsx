import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Search, 
  Package, 
  MapPin, 
  Phone,
  Store,
  Calendar,
  IndianRupee,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Building2,
  LogOut,
  ShieldCheck,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, isToday, isYesterday } from 'date-fns';

interface DistributorUser {
  id: string;
  full_name: string;
  role: string;
  distributor_id: string;
  distributors?: { name: string };
  is_impersonated?: boolean;
}

interface SecondaryOrder {
  id: string;
  retailer_id: string;
  retailer_name: string;
  order_date: string | null;
  created_at: string;
  total_amount: number;
  status: string;
  credit_paid_amount?: number;
  retailer?: {
    address: string;
    phone: string;
    beat_name: string;
    beat_id: string;
  };
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  rate: number;
  unit: string;
  total: number;
}

const SecondarySales = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<DistributorUser | null>(null);
  const [orders, setOrders] = useState<SecondaryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBeat, setSelectedBeat] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [beats, setBeats] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SecondaryOrder | null>(null);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string>('');
  const [amountCollected, setAmountCollected] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('distributor_user');
    if (!storedUser) {
      navigate('/distributor-portal/login');
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);
    loadOrders(userData.distributor_id);
  }, [navigate]);

  const loadOrders = async (distributorId: string) => {
    try {
      setLoading(true);
      
      // Get retailers mapped to this distributor
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name, address, phone, beat_name, beat_id')
        .eq('distributor_id', distributorId);

      if (!retailers || retailers.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const retailerIds = retailers.map(r => r.id);
      const retailerMap = new Map(retailers.map(r => [r.id, r]));

      // Get unique beats
      const uniqueBeats = [...new Set(retailers.filter(r => r.beat_name).map(r => ({ 
        id: r.beat_id || r.beat_name, 
        name: r.beat_name 
      })))];
      setBeats(uniqueBeats.filter((b, i, arr) => arr.findIndex(x => x.name === b.name) === i));

      // Get orders from these retailers (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .in('retailer_id', retailerIds)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch order items for all orders
      const orderIds = ordersData?.map(o => o.id) || [];
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      const itemsMap = new Map<string, OrderItem[]>();
      itemsData?.forEach(item => {
        const existing = itemsMap.get(item.order_id) || [];
        existing.push(item);
        itemsMap.set(item.order_id, existing);
      });

      // Combine data
      const enrichedOrders = ordersData?.map(order => ({
        ...order,
        retailer: retailerMap.get(order.retailer_id),
        items: itemsMap.get(order.id) || [],
      })) || [];

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load secondary orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.retailer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.retailer?.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBeat = selectedBeat === 'all' || order.retailer?.beat_name === selectedBeat;
    
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'pending' && order.status === 'confirmed') ||
      (selectedStatus === 'delivered' && order.status === 'delivered') ||
      (selectedStatus === 'partial' && order.status === 'partial_delivery') ||
      (selectedStatus === 'cancelled' && order.status === 'cancelled');
    
    return matchesSearch && matchesBeat && matchesStatus;
  });

  // Group orders by beat
  const groupedByBeat = filteredOrders.reduce((acc, order) => {
    const beat = order.retailer?.beat_name || 'Unassigned';
    if (!acc[beat]) {
      acc[beat] = [];
    }
    acc[beat].push(order);
    return acc;
  }, {} as Record<string, SecondaryOrder[]>);

  const deductInventory = async (orderItems: OrderItem[]) => {
    const distributorId = user?.distributor_id;
    if (!distributorId || !orderItems.length) return;

    for (const item of orderItems) {
      // Find matching inventory by product name (since we don't have product_id in order_items)
      const { data: inventoryItems } = await supabase
        .from('distributor_inventory')
        .select('*')
        .eq('distributor_id', distributorId)
        .ilike('product_name', item.product_name);

      if (inventoryItems && inventoryItems.length > 0) {
        const inv = inventoryItems[0];
        const newQty = Math.max(0, inv.quantity - item.quantity);
        const newAvailable = Math.max(0, (inv.available_quantity || 0) - item.quantity);
        const newValue = newQty * (inv.unit_cost || 0);

        await supabase
          .from('distributor_inventory')
          .update({
            quantity: newQty,
            available_quantity: newAvailable,
            total_value: newValue,
            last_issued_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', inv.id);
      }
    }
  };

  const handleUpdateDelivery = async () => {
    if (!selectedOrder || !deliveryStatus) return;

    setUpdating(true);
    try {
      const updates: any = { status: deliveryStatus };
      
      if (deliveryStatus === 'delivered' || deliveryStatus === 'partial_delivery') {
        updates.credit_paid_amount = parseFloat(amountCollected) || 0;
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Deduct inventory when delivered (not for cancelled)
      if ((deliveryStatus === 'delivered' || deliveryStatus === 'partial_delivery') && 
          selectedOrder.status === 'confirmed' && selectedOrder.items) {
        await deductInventory(selectedOrder.items);
      }

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: deliveryStatus, credit_paid_amount: updates.credit_paid_amount } 
          : o
      ));

      toast.success('Delivery status updated & inventory adjusted');
      setShowDeliveryDialog(false);
      resetDeliveryForm();
    } catch (error) {
      console.error('Error updating delivery:', error);
      toast.error('Failed to update delivery status');
    } finally {
      setUpdating(false);
    }
  };

  const resetDeliveryForm = () => {
    setSelectedOrder(null);
    setDeliveryStatus('');
    setAmountCollected('');
    setDeliveryNotes('');
  };

  const openDeliveryDialog = (order: SecondaryOrder) => {
    setSelectedOrder(order);
    setDeliveryStatus(order.status);
    setAmountCollected(order.credit_paid_amount?.toString() || order.total_amount?.toString() || '');
    setShowDeliveryDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      confirmed: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
      delivered: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Delivered' },
      partial_delivery: { color: 'bg-blue-100 text-blue-700', icon: Truck, label: 'Partial' },
      cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Cancelled' },
    };
    const cfg = config[status] || config.confirmed;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd MMM yyyy');
  };

  const handleLogout = async () => {
    const isImpersonated = user?.is_impersonated;
    if (isImpersonated) {
      localStorage.removeItem('distributor_user');
      localStorage.removeItem('distributor_id');
      sessionStorage.removeItem('admin_impersonation');
      window.close();
      return;
    }
    await supabase.auth.signOut();
    localStorage.removeItem('distributor_user');
    localStorage.removeItem('distributor_id');
    navigate('/distributor-portal/login');
  };

  const isImpersonated = user?.is_impersonated;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Impersonation Banner */}
      {isImpersonated && (
        <div className="sticky top-0 z-[60] bg-amber-500 text-white px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">
                Admin Viewing Mode: {user?.full_name}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="h-7 text-white hover:bg-amber-600"
            >
              <X className="w-4 h-4 mr-1" />
              Exit View
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`sticky ${isImpersonated ? 'top-[40px]' : 'top-0'} z-50 bg-card border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">Secondary Sales</h1>
              <p className="text-xs text-muted-foreground">
                Orders from field sales visits
              </p>
            </div>
          </div>
          {!isImpersonated && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by retailer or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedBeat} onValueChange={setSelectedBeat}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by beat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Beats</SelectItem>
              {beats.map(beat => (
                <SelectItem key={beat.id} value={beat.name}>{beat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => navigate('/distributor-portal/packing-list')}
          >
            <Package className="w-4 h-4 mr-2" />
            Packing List
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold">{orders.filter(o => o.status === 'confirmed').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-lg font-bold">{orders.filter(o => o.status === 'delivered').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Partial</p>
                <p className="text-lg font-bold">{orders.filter(o => o.status === 'partial_delivery').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-lg font-bold">
                  ₹{orders.filter(o => o.status === 'confirmed').reduce((sum, o) => sum + (o.total_amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Orders Grouped by Beat */}
        {Object.keys(groupedByBeat).length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No secondary orders found</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByBeat).map(([beat, beatOrders]) => (
              <Card key={beat}>
                <CardHeader className="py-3 px-4 bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm font-medium">{beat}</CardTitle>
                    </div>
                    <Badge variant="secondary">{beatOrders.length} orders</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 divide-y">
                  {beatOrders.map(order => (
                    <div key={order.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{order.retailer_name}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {order.retailer?.address || 'No address'}
                            </span>
                            {order.retailer?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {order.retailer.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {getDateLabel(order.created_at)}
                            </span>
                          </div>
                          
                          {/* Order Items */}
                          {order.items && order.items.length > 0 && (
                            <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Items:</p>
                              <div className="space-y-1">
                                {order.items.slice(0, 3).map(item => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.product_name}</span>
                                    <span className="text-muted-foreground">
                                      {item.quantity} {item.unit} × ₹{item.rate}
                                    </span>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{order.items.length - 3} more items
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-right space-y-2">
                          <p className="text-lg font-bold text-primary">
                            ₹{order.total_amount?.toLocaleString('en-IN') || '0'}
                          </p>
                          <Button
                            size="sm"
                            variant={order.status === 'confirmed' ? 'default' : 'outline'}
                            onClick={() => openDeliveryDialog(order)}
                          >
                            <Truck className="w-3 h-3 mr-1" />
                            {order.status === 'confirmed' ? 'Deliver' : 'Update'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delivery Status Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              {selectedOrder?.retailer_name} - ₹{selectedOrder?.total_amount?.toLocaleString('en-IN')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Status</label>
              <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="partial_delivery">Partial Delivery</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(deliveryStatus === 'delivered' || deliveryStatus === 'partial_delivery') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount Collected (₹)</label>
                <Input
                  type="number"
                  value={amountCollected}
                  onChange={(e) => setAmountCollected(e.target.value)}
                  placeholder="Enter amount collected"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any delivery notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDelivery} disabled={!deliveryStatus || updating}>
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SecondarySales;
