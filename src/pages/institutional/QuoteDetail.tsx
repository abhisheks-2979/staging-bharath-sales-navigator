import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ArrowLeft, FileText, Building2, Calendar, DollarSign,
  Edit, Save, X, Send, CheckCircle, XCircle, Package
} from "lucide-react";

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
  terms_and_conditions: string | null;
  notes: string | null;
  inst_accounts: { account_name: string } | null;
  inst_opportunities: { opportunity_name: string } | null;
}

interface QuoteItem {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  line_total: number;
}

const statuses = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-700' },
];

export default function QuoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Quote>>({});

  useEffect(() => {
    if (id) {
      fetchQuote();
      fetchItems();
    }
  }, [id]);

  const fetchQuote = async () => {
    try {
      const { data, error } = await supabase
        .from('inst_quotes')
        .select('*, inst_accounts(account_name), inst_opportunities(opportunity_name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuote(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Failed to fetch quote');
      navigate('/institutional-sales/quotes');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    const { data } = await supabase.from('inst_quote_line_items').select('*').eq('quote_id', id).order('sort_order');
    setItems(data || []);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('inst_quotes')
        .update({
          valid_until: formData.valid_until,
          terms_and_conditions: formData.terms_and_conditions,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Quote updated');
      setQuote({ ...quote, ...formData } as Quote);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Failed to update quote');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('inst_quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated');
      setQuote({ ...quote, status: newStatus } as Quote);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusInfo = (status: string) => statuses.find(s => s.value === status) || statuses[0];
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  if (loading) {
    return <Layout><div className="p-4 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  if (!quote) return null;

  const statusInfo = getStatusInfo(quote.status);

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {quote.quote_number}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {quote.inst_accounts?.account_name}
              <span className={`px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setFormData(quote); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </div>

        {/* Status Actions */}
        {quote.status === 'draft' && (
          <Card>
            <CardContent className="p-3 flex justify-center">
              <Button size="sm" onClick={() => handleStatusChange('sent')}>
                <Send className="h-4 w-4 mr-1" /> Mark as Sent
              </Button>
            </CardContent>
          </Card>
        )}
        {quote.status === 'sent' && (
          <Card>
            <CardContent className="p-3 flex justify-center gap-3">
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('accepted')} className="text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('rejected')} className="text-red-600">
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </CardContent>
          </Card>
        )}
        {quote.status === 'accepted' && (
          <Card>
            <CardContent className="p-3 flex justify-center">
              <Button size="sm" onClick={() => navigate(`/institutional-sales/order-commitments?quote=${quote.id}&account=${quote.account_id}`)}>
                <Package className="h-4 w-4 mr-1" /> Create Order Commitment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold">{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</p>
              <p className="text-xs text-muted-foreground">Quote Date</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{formatCurrency(quote.total_amount)}</p>
              <p className="text-xs text-muted-foreground">Total Amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="items" className="flex-1">Items ({items.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Valid Until</Label>
                      <Input
                        type="date"
                        value={formData.valid_until || ''}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Terms & Conditions</Label>
                      <Textarea
                        value={formData.terms_and_conditions || ''}
                        onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {quote.inst_opportunities && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Opportunity</p>
                        <p className="text-sm font-medium">{quote.inst_opportunities.opportunity_name}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Quote Date</p>
                        <p className="text-sm">{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Valid Until</p>
                        <p className="text-sm">{quote.valid_until ? format(new Date(quote.valid_until), 'MMM dd, yyyy') : '-'}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(quote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span>-{formatCurrency(quote.discount_amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>{formatCurrency(quote.tax_amount)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-2">
                        <span>Total</span>
                        <span>{formatCurrency(quote.total_amount)}</span>
                      </div>
                    </div>
                    {quote.terms_and_conditions && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Terms & Conditions</p>
                        <p className="text-sm whitespace-pre-wrap">{quote.terms_and_conditions}</p>
                      </div>
                    )}
                    {quote.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{quote.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            {items.length === 0 ? (
              <Card><CardContent className="p-4 text-center text-muted-foreground">No items added yet</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.description || 'Item'}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.line_total)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}