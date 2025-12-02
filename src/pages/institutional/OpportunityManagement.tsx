import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, Search, Target, Building2, Calendar, 
  DollarSign, MoreVertical, TrendingUp, FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Opportunity {
  id: string;
  opportunity_name: string;
  account_id: string;
  stage: string;
  amount: number;
  probability: number;
  expected_close_date: string | null;
  description: string | null;
  next_step: string | null;
  created_at: string;
  inst_accounts: {
    account_name: string;
  } | null;
}

interface Account {
  id: string;
  account_name: string;
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

export default function OpportunityManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountIdFromUrl = searchParams.get('account');
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    opportunity_name: "",
    account_id: accountIdFromUrl || "",
    stage: "prospecting",
    amount: "",
    probability: "10",
    expected_close_date: "",
    description: "",
    next_step: "",
  });

  useEffect(() => {
    fetchOpportunities();
    fetchAccounts();
  }, [stageFilter, accountIdFromUrl]);

  const fetchOpportunities = async () => {
    try {
      let query = supabase
        .from('inst_opportunities')
        .select('*, inst_accounts(account_name)')
        .order('created_at', { ascending: false });

      if (stageFilter !== 'all') {
        query = query.eq('stage', stageFilter);
      }

      if (accountIdFromUrl) {
        query = query.eq('account_id', accountIdFromUrl);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast.error('Failed to fetch opportunities');
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

  const handleCreate = async () => {
    if (!formData.opportunity_name || !formData.account_id) {
      toast.error('Opportunity name and account are required');
      return;
    }

    try {
      const { error } = await supabase.from('inst_opportunities').insert({
        opportunity_name: formData.opportunity_name,
        account_id: formData.account_id,
        stage: formData.stage,
        amount: parseFloat(formData.amount) || 0,
        probability: parseInt(formData.probability) || 10,
        expected_close_date: formData.expected_close_date || null,
        description: formData.description || null,
        next_step: formData.next_step || null,
        owner_id: user?.id,
      });

      if (error) throw error;
      toast.success('Opportunity created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchOpportunities();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast.error('Failed to create opportunity');
    }
  };

  const resetForm = () => {
    setFormData({
      opportunity_name: "",
      account_id: accountIdFromUrl || "",
      stage: "prospecting",
      amount: "",
      probability: "10",
      expected_close_date: "",
      description: "",
      next_step: "",
    });
  };

  const handleStageChange = async (oppId: string, newStage: string) => {
    try {
      const stageInfo = stages.find(s => s.value === newStage);
      const updates: any = { 
        stage: newStage, 
        probability: stageInfo?.probability || 10,
        updated_at: new Date().toISOString() 
      };

      if (newStage === 'closed_won' || newStage === 'closed_lost') {
        updates.closed_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('inst_opportunities')
        .update(updates)
        .eq('id', oppId);

      if (error) throw error;
      toast.success('Stage updated');
      fetchOpportunities();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  };

  const filteredOpportunities = opportunities.filter(opp =>
    opp.opportunity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opp.inst_accounts?.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStageInfo = (stage: string) => {
    return stages.find(s => s.value === stage) || stages[0];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalPipelineValue = opportunities.reduce((sum, opp) => {
    if (opp.stage !== 'closed_lost') {
      return sum + (opp.amount || 0);
    }
    return sum;
  }, 0);

  const weightedPipelineValue = opportunities.reduce((sum, opp) => {
    if (opp.stage !== 'closed_lost' && opp.stage !== 'closed_won') {
      return sum + ((opp.amount || 0) * (opp.probability || 0) / 100);
    }
    return sum;
  }, 0);

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Opportunities</h1>
            <p className="text-xs text-muted-foreground">
              Pipeline: {formatCurrency(totalPipelineValue)} • Weighted: {formatCurrency(weightedPipelineValue)}
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Opportunity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Opportunity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Opportunity Name *</Label>
                  <Input
                    value={formData.opportunity_name}
                    onChange={(e) => setFormData({ ...formData, opportunity_name: e.target.value })}
                    placeholder="e.g., Annual Supply Contract"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account *</Label>
                  <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select 
                      value={formData.stage} 
                      onValueChange={(v) => {
                        const stageInfo = stages.find(s => s.value === v);
                        setFormData({ 
                          ...formData, 
                          stage: v,
                          probability: stageInfo?.probability.toString() || "10"
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Probability (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Close Date</Label>
                    <Input
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Opportunity details..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Next Step</Label>
                  <Input
                    value={formData.next_step}
                    onChange={(e) => setFormData({ ...formData, next_step: e.target.value })}
                    placeholder="What's the next action?"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">Create Opportunity</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Opportunities List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No opportunities found. Create your first opportunity!
            </div>
          ) : (
            filteredOpportunities.map((opp) => {
              const stageInfo = getStageInfo(opp.stage);
              return (
                <Card key={opp.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-foreground">{opp.opportunity_name}</h3>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {opp.inst_accounts?.account_name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${stageInfo.color}`}>
                            {stageInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(opp.amount || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {opp.probability}% probability
                          </span>
                          {opp.expected_close_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Close: {format(new Date(opp.expected_close_date), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                        {opp.next_step && (
                          <p className="mt-2 text-xs text-primary font-medium">
                            Next: {opp.next_step}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {stages.map((stage) => (
                            <DropdownMenuItem 
                              key={stage.value}
                              onClick={() => handleStageChange(opp.id, stage.value)}
                              disabled={opp.stage === stage.value}
                            >
                              Move to {stage.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem onClick={() => navigate(`/institutional-sales/quotes?opportunity=${opp.id}`)}>
                            <FileText className="h-4 w-4 mr-2" /> Create Quote
                          </DropdownMenuItem>
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
