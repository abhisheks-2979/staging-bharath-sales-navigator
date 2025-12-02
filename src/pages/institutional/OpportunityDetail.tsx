import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ArrowLeft, Target, Building2, Calendar, DollarSign,
  Edit, Save, X, FileText, TrendingUp, Plus, Package
} from "lucide-react";

interface Opportunity {
  id: string;
  opportunity_name: string;
  account_id: string;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  closed_date: string | null;
  description: string | null;
  next_step: string | null;
  lead_source: string | null;
  inst_accounts: { account_name: string } | null;
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  quote_date: string;
}

interface OrderCommitment {
  id: string;
  commitment_number: string;
  status: string;
  total_planned_value: number;
  commitment_date: string;
}

const stages = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-gray-100 text-gray-700', probability: 10 },
  { value: 'qualification', label: 'Qualification', color: 'bg-blue-100 text-blue-700', probability: 20 },
  { value: 'needs_analysis', label: 'Needs Analysis', color: 'bg-cyan-100 text-cyan-700', probability: 40 },
  { value: 'proposal', label: 'Proposal', color: 'bg-purple-100 text-purple-700', probability: 60 },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700', probability: 80 },
  { value: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-700', probability: 100 },
  { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700', probability: 0 },
];

export default function OpportunityDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orderCommitments, setOrderCommitments] = useState<OrderCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Opportunity>>({});

  useEffect(() => {
    if (id) {
      fetchOpportunity();
      fetchRelatedRecords();
    }
  }, [id]);

  const fetchOpportunity = async () => {
    try {
      const { data, error } = await supabase
        .from('inst_opportunities')
        .select('*, inst_accounts(account_name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOpportunity(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      toast.error('Failed to fetch opportunity');
      navigate('/institutional-sales/opportunities');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedRecords = async () => {
    const [quotesRes, commitmentsRes] = await Promise.all([
      supabase.from('inst_quotes').select('id, quote_number, status, total_amount, quote_date').eq('opportunity_id', id).order('created_at', { ascending: false }),
      supabase.from('inst_order_commitments').select('id, commitment_number, status, total_planned_value, commitment_date').eq('opportunity_id', id).order('created_at', { ascending: false }),
    ]);
    setQuotes(quotesRes.data || []);
    setOrderCommitments(commitmentsRes.data || []);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('inst_opportunities')
        .update({
          opportunity_name: formData.opportunity_name,
          stage: formData.stage,
          amount: formData.amount,
          probability: formData.probability,
          expected_close_date: formData.expected_close_date,
          description: formData.description,
          next_step: formData.next_step,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Opportunity updated');
      setOpportunity({ ...opportunity, ...formData } as Opportunity);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast.error('Failed to update opportunity');
    }
  };

  const getStageInfo = (stage: string) => stages.find(s => s.value === stage) || stages[0];

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  if (loading) {
    return <Layout><div className="p-4 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  if (!opportunity) return null;

  const stageInfo = getStageInfo(opportunity.stage);

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales/opportunities')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {opportunity.opportunity_name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {opportunity.inst_accounts?.account_name}
              <span className={`px-2 py-0.5 rounded-full ${stageInfo.color}`}>{stageInfo.label}</span>
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setFormData(opportunity); }}>
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

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{formatCurrency(opportunity.amount || 0)}</p>
              <p className="text-xs text-muted-foreground">Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{opportunity.probability}%</p>
              <p className="text-xs text-muted-foreground">Probability</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">
                {opportunity.expected_close_date ? format(new Date(opportunity.expected_close_date), 'MMM dd') : '-'}
              </p>
              <p className="text-xs text-muted-foreground">Close Date</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="quotes" className="flex-1">Quotes ({quotes.length})</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">Orders ({orderCommitments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Opportunity Name</Label>
                      <Input value={formData.opportunity_name || ''} onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Stage</Label>
                        <Select value={formData.stage} onValueChange={(v) => {
                          const info = stages.find(s => s.value === v);
                          setFormData({ ...formData, stage: v, probability: info?.probability || 10 });
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {stages.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Probability (%)</Label>
                        <Input type="number" min="0" max="100" value={formData.probability || ''} onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input type="number" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Close Date</Label>
                        <Input type="date" value={formData.expected_close_date || ''} onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Step</Label>
                      <Input value={formData.next_step || ''} onChange={(e) => setFormData({ ...formData, next_step: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {opportunity.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-sm">{opportunity.description}</p>
                      </div>
                    )}
                    {opportunity.next_step && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Next Step</p>
                        <p className="text-sm font-medium text-primary">{opportunity.next_step}</p>
                      </div>
                    )}
                    {opportunity.lead_source && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Lead Source</p>
                        <p className="text-sm">{opportunity.lead_source}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quotes" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate(`/institutional-sales/quotes?opportunity=${id}&account=${opportunity.account_id}`)}>
                <Plus className="h-4 w-4 mr-1" /> Create Quote
              </Button>
            </div>
            {quotes.length === 0 ? (
              <Card><CardContent className="p-4 text-center text-muted-foreground">No quotes yet</CardContent></Card>
            ) : (
              quotes.map((quote) => (
                <Card key={quote.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/institutional-sales/quotes/${quote.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{quote.quote_number}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{quote.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(quote.total_amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => navigate(`/institutional-sales/order-commitments?opportunity=${id}`)}>
                <Plus className="h-4 w-4 mr-1" /> Create Order
              </Button>
            </div>
            {orderCommitments.length === 0 ? (
              <Card><CardContent className="p-4 text-center text-muted-foreground">No order commitments yet</CardContent></Card>
            ) : (
              orderCommitments.map((order) => (
                <Card key={order.id} className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/institutional-sales/order-commitments/${order.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-medium">{order.commitment_number}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{order.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(order.commitment_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(order.total_planned_value)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}