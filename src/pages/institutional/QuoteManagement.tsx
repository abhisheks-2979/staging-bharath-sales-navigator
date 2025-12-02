import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, Search, FileText, Building2, Calendar, 
  DollarSign, MoreVertical, Send, CheckCircle, XCircle, Package
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Quote {
  id: string;
  quote_number: string;
  account_id: string;
  opportunity_id: string | null;
  quote_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  inst_accounts: {
    account_name: string;
  } | null;
  inst_opportunities: {
    opportunity_name: string;
  } | null;
}

interface Account {
  id: string;
  account_name: string;
}

interface Opportunity {
  id: string;
  opportunity_name: string;
  account_id: string;
}

const statuses = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-700' },
];

export default function QuoteManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountIdFromUrl = searchParams.get('account');
  const opportunityIdFromUrl = searchParams.get('opportunity');
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    account_id: accountIdFromUrl || "",
    opportunity_id: opportunityIdFromUrl || "",
    valid_until: "",
  });

  useEffect(() => {
    fetchQuotes();
    fetchAccounts();
    fetchOpportunities();
  }, [statusFilter, accountIdFromUrl]);

  const fetchQuotes = async () => {
    try {
      let query = supabase
        .from('inst_quotes')
        .select('*, inst_accounts(account_name), inst_opportunities(opportunity_name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (accountIdFromUrl) {
        query = query.eq('account_id', accountIdFromUrl);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await supabase
        .from('inst_accounts')
        .select('id, account_name')
        .eq('is_active', true)
        .order('account_name');
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      let query = supabase
        .from('inst_opportunities')
        .select('id, opportunity_name, account_id')
        .not('stage', 'in', '(closed_won,closed_lost)')
        .order('opportunity_name');

      if (formData.account_id) {
        query = query.eq('account_id', formData.account_id);
      }

      const { data } = await query;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  useEffect(() => {
    if (formData.account_id) {
      fetchOpportunities();
    }
  }, [formData.account_id]);

  const generateQuoteNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `QT${year}${month}${random}`;
  };

  const handleCreate = async () => {
    if (!formData.account_id) {
      toast.error('Account is required');
      return;
    }

    try {
      const quoteNumber = generateQuoteNumber();
      const { data, error } = await supabase.from('inst_quotes').insert({
        quote_number: quoteNumber,
        account_id: formData.account_id,
        opportunity_id: formData.opportunity_id || null,
        valid_until: formData.valid_until || null,
        created_by: user?.id,
        status: 'draft',
      }).select().single();

      if (error) throw error;
      toast.success('Quote created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchQuotes();
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Failed to create quote');
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: accountIdFromUrl || "",
      opportunity_id: opportunityIdFromUrl || "",
      valid_until: "",
    });
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('inst_quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', quoteId);

      if (error) throw error;
      toast.success('Status updated');
      fetchQuotes();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredQuotes = quotes.filter(quote =>
    quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.inst_accounts?.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusInfo = (status: string) => {
    return statuses.find(s => s.value === status) || statuses[0];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Quotes</h1>
            <p className="text-xs text-muted-foreground">{quotes.length} quotes</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Quote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v, opportunity_id: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opportunity (Optional)</Label>
                  <Select value={formData.opportunity_id} onValueChange={(v) => setFormData({ ...formData, opportunity_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select opportunity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No opportunity</SelectItem>
                      {opportunities
                        .filter(opp => !formData.account_id || opp.account_id === formData.account_id)
                        .map((opp) => (
                          <SelectItem key={opp.id} value={opp.id}>
                            {opp.opportunity_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valid Until</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">Create Quote</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search quotes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quotes List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quotes found. Create your first quote!
            </div>
          ) : (
            filteredQuotes.map((quote) => {
              const statusInfo = getStatusInfo(quote.status);
              return (
                <Card 
                  key={quote.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/institutional-sales/quotes/${quote.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-foreground">{quote.quote_number}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {quote.inst_accounts?.account_name}
                          </span>
                          {quote.inst_opportunities && (
                            <span className="text-sm text-muted-foreground">
                              • {quote.inst_opportunities.opportunity_name}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(quote.quote_date), 'MMM dd, yyyy')}
                          </span>
                          {quote.valid_until && (
                            <span className="flex items-center gap-1">
                              Valid until: {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(quote.total_amount)}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {quote.status === 'draft' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(quote.id, 'sent');
                            }}>
                              <Send className="h-4 w-4 mr-2" /> Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {quote.status === 'sent' && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(quote.id, 'accepted');
                              }}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Accepted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(quote.id, 'rejected');
                              }}>
                                <XCircle className="h-4 w-4 mr-2" /> Mark as Rejected
                              </DropdownMenuItem>
                            </>
                          )}
                          {quote.status === 'accepted' && (
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/institutional-sales/order-commitments?quote=${quote.id}`);
                            }}>
                              <Package className="h-4 w-4 mr-2" /> Create Order Commitment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
