import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, Wallet, Calendar, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Collection {
  id: string;
  collection_number: string;
  invoice_id: string;
  account_id: string;
  amount: number;
  payment_method: string | null;
  collection_date: string;
  cheque_number: string | null;
  bank_name: string | null;
  reference_number: string | null;
  status: string | null;
  notes: string | null;
  collected_by: string | null;
  created_at: string;
  account?: { account_name: string } | null;
  invoice?: { invoice_number: string } | null;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
];

const statuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Refunded', color: 'bg-gray-100 text-gray-600' },
];

const Collections = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchCollections();
  }, [statusFilter]);

  const fetchCollections = async () => {
    try {
      let query = supabase
        .from('inst_collections')
        .select(`
          *,
          account:inst_accounts(account_name),
          invoice:inst_invoices(invoice_number)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const filteredCollections = collections.filter(collection =>
    collection.collection_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find(m => m.value === method)?.label || method;
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
              <h1 className="text-2xl font-bold">Collections</h1>
              <p className="text-muted-foreground text-sm">{filteredCollections.length} collections</p>
            </div>
          </div>
          <Button onClick={() => toast.info('Record collection against an invoice')}>
            <Plus className="h-4 w-4 mr-2" />
            Record Collection
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections..."
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
        ) : filteredCollections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No collections found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredCollections.map(collection => {
              const statusInfo = getStatusInfo(collection.status);
              return (
                <Card key={collection.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{collection.collection_number}</span>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                        {collection.account && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {collection.account.account_name}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            {getPaymentMethodLabel(collection.payment_method)}
                          </div>
                          {collection.invoice && (
                            <span>Invoice: {collection.invoice.invoice_number}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600">{formatCurrency(collection.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(collection.collection_date), 'dd MMM yyyy')}
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

export default Collections;
