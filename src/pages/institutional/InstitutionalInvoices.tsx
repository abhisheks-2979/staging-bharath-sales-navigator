import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, FileText, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  invoice_number: string;
  account_id: string | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  account?: { account_name: string } | null;
}

const statuses = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800' },
  { value: 'partial', label: 'Partial', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-800' },
  { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
];

const InstitutionalInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      let query = supabase
        .from('inst_invoices')
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
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.account?.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
              <h1 className="text-2xl font-bold">Invoices</h1>
              <p className="text-muted-foreground text-sm">{filteredInvoices.length} invoices</p>
            </div>
          </div>
          <Button onClick={() => toast.info('Create invoice from an order commitment')}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
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
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map(invoice => {
              const statusInfo = getStatusInfo(invoice.status);
              return (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{invoice.invoice_number}</span>
                          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        </div>
                        {invoice.account && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {invoice.account.account_name}
                          </div>
                        )}
                        {invoice.due_date && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Due: {format(new Date(invoice.due_date), 'dd MMM yyyy')}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(invoice.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(invoice.invoice_date), 'dd MMM yyyy')}
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

export default InstitutionalInvoices;
