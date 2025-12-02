import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, Users, Target, FileText, Package, 
  DollarSign, TrendingUp, ArrowRight, Briefcase,
  UserPlus, Receipt, CreditCard
} from "lucide-react";

interface DashboardMetrics {
  totalLeads: number;
  totalAccounts: number;
  totalOpportunities: number;
  pipelineValue: number;
  openQuotes: number;
  pendingCollections: number;
}

const quickNavItems = [
  { icon: UserPlus, label: "Leads", href: "/institutional-sales/leads", color: "from-blue-500 to-blue-600" },
  { icon: Building2, label: "Accounts", href: "/institutional-sales/accounts", color: "from-emerald-500 to-emerald-600" },
  { icon: Users, label: "Contacts", href: "/institutional-sales/contacts", color: "from-purple-500 to-purple-600" },
  { icon: Target, label: "Opportunities", href: "/institutional-sales/opportunities", color: "from-orange-500 to-orange-600" },
  { icon: FileText, label: "Quotes", href: "/institutional-sales/quotes", color: "from-pink-500 to-pink-600" },
  { icon: Package, label: "Order Commitments", href: "/institutional-sales/order-commitments", color: "from-cyan-500 to-cyan-600" },
  { icon: Receipt, label: "Invoices", href: "/institutional-sales/invoices", color: "from-amber-500 to-amber-600" },
  { icon: CreditCard, label: "Collections", href: "/institutional-sales/collections", color: "from-indigo-500 to-indigo-600" },
  { icon: Briefcase, label: "Products", href: "/institutional-sales/products", color: "from-teal-500 to-teal-600" },
  { icon: DollarSign, label: "Price Books", href: "/institutional-sales/price-books", color: "from-rose-500 to-rose-600" },
];

export default function InstitutionalSalesDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalLeads: 0,
    totalAccounts: 0,
    totalOpportunities: 0,
    pipelineValue: 0,
    openQuotes: 0,
    pendingCollections: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [leadsRes, accountsRes, oppsRes, quotesRes, invoicesRes] = await Promise.all([
        supabase.from('inst_leads').select('id', { count: 'exact', head: true }),
        supabase.from('inst_accounts').select('id', { count: 'exact', head: true }),
        supabase.from('inst_opportunities').select('amount'),
        supabase.from('inst_quotes').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.from('inst_invoices').select('balance_amount').gt('balance_amount', 0),
      ]);

      const pipelineValue = oppsRes.data?.reduce((sum, opp) => sum + (opp.amount || 0), 0) || 0;
      const pendingCollections = invoicesRes.data?.reduce((sum, inv) => sum + (inv.balance_amount || 0), 0) || 0;

      setMetrics({
        totalLeads: leadsRes.count || 0,
        totalAccounts: accountsRes.count || 0,
        totalOpportunities: oppsRes.data?.length || 0,
        pipelineValue,
        openQuotes: quotesRes.count || 0,
        pendingCollections,
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Institutional Sales</h1>
            <p className="text-sm text-muted-foreground">Manage B2B accounts, opportunities & orders</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active Leads</p>
                  <p className="text-xl font-bold text-foreground">{metrics.totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                  <p className="text-xl font-bold text-foreground">{metrics.totalAccounts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pipeline Value</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(metrics.pipelineValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Opportunities</p>
                  <p className="text-xl font-bold text-foreground">{metrics.totalOpportunities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/20">
                  <FileText className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Open Quotes</p>
                  <p className="text-xl font-bold text-foreground">{metrics.openQuotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <CreditCard className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Collections</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(metrics.pendingCollections)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Quick Access</h2>
          <div className="grid grid-cols-5 gap-3">
            {quickNavItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-muted/50"
                onClick={() => navigate(item.href)}
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                  <item.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Recent Activity Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent Leads */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Leads</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/institutional-sales/leads')}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RecentLeadsList />
            </CardContent>
          </Card>

          {/* Recent Opportunities */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/institutional-sales/opportunities')}>
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RecentOpportunitiesList />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function RecentLeadsList() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from('inst_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setLeads(data || []);
    };
    fetchLeads();
  }, []);

  if (leads.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No leads yet</p>;
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div key={lead.id} className="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <p className="text-sm font-medium">{lead.lead_name}</p>
            <p className="text-xs text-muted-foreground">{lead.company_name}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            lead.lead_status === 'new' ? 'bg-blue-100 text-blue-700' :
            lead.lead_status === 'qualified' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {lead.lead_status}
          </span>
        </div>
      ))}
    </div>
  );
}

function RecentOpportunitiesList() {
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    const fetchOpportunities = async () => {
      const { data } = await supabase
        .from('inst_opportunities')
        .select('*, inst_accounts(account_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      setOpportunities(data || []);
    };
    fetchOpportunities();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (opportunities.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No opportunities yet</p>;
  }

  return (
    <div className="space-y-2">
      {opportunities.map((opp) => (
        <div key={opp.id} className="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <p className="text-sm font-medium">{opp.opportunity_name}</p>
            <p className="text-xs text-muted-foreground">{opp.inst_accounts?.account_name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{formatCurrency(opp.amount || 0)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              opp.stage === 'closed_won' ? 'bg-green-100 text-green-700' :
              opp.stage === 'negotiation' ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {opp.stage}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
