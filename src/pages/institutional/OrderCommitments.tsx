import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Package, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OrderCommitment {
  id: string;
  commitment_number: string;
  quote_id: string | null;
  account_id: string;
  commitment_date: string;
  delivery_start_date: string | null;
  delivery_end_date: string | null;
  status: string | null;
  notes: string | null;
  total_planned_value: number | null;
  total_actual_value: number | null;
  created_at: string;
  account?: { account_name: string } | null;
}

const statuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_production', label: 'In Production', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const OrderCommitments = () => {
  const navigate = useNavigate();
  const [commitments, setCommitments] = useState<OrderCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchCommitments();
  }, [statusFilter]);

  const fetchCommitments = async () => {
    try {
      let query = supabase
        .from('inst_order_commitments')
        .select(`
          *,
          account:inst_accounts(account_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommitments(data || []);
    } catch (error) {
      console.error('Error fetching commitments:', error);
      toast.error('Failed to load order commitments');
    } finally {
      setLoading(false);
    }
  };

  const filteredCommitments = commitments.filter(commitment =>
    commitment.commitment_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    commitment.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Order Commitments</h1>
              <p className="text-muted-foreground text-sm">{filteredCommitments.length} commitments</p>
            </div>
          </div>
          <Button onClick={() => toast.info('Create commitment from a quote')}>
            <Plus className="h-4 w-4 mr-2" />
            New Commitment
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commitments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All
            </Button>
            {statuses.map(status => (
              <Button
                key={status.value}
                variant={statusFilter === status.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status.value)}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredCommitments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No order commitments found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCommitments.map(commitment => {
              const statusInfo = getStatusInfo(commitment.status);
              return (
                <Card key={commitment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{commitment.commitment_number}</span>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                        {commitment.account && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {commitment.account.account_name}
                          </div>
                        )}
                        {commitment.delivery_start_date && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Delivery: {format(new Date(commitment.delivery_start_date), 'dd MMM yyyy')}
                            {commitment.delivery_end_date && ` - ${format(new Date(commitment.delivery_end_date), 'dd MMM')}`}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(commitment.total_planned_value || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(commitment.commitment_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrderCommitments;
