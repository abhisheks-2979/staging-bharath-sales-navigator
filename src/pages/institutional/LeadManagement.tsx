import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { 
  ArrowLeft, Plus, Search, Filter, Phone, Mail, 
  Building2, MapPin, MoreVertical, UserCheck, Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Lead {
  id: string;
  lead_name: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  lead_source: string;
  lead_status: string;
  annual_potential_value: number;
  industry_type: string | null;
  notes: string | null;
  created_at: string;
}

const leadSources = ['direct', 'referral', 'website', 'cold_call', 'exhibition', 'advertisement'];
const leadStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost'];
const industries = ['Education', 'Healthcare', 'Government', 'Corporate', 'Hospitality', 'Retail', 'Manufacturing', 'Other'];

export default function LeadManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    lead_name: "",
    company_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    lead_source: "direct",
    industry_type: "",
    annual_potential_value: "",
    notes: "",
  });

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      let query = supabase
        .from('inst_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('lead_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.lead_name || !formData.company_name) {
      toast.error('Lead name and company are required');
      return;
    }

    try {
      const { error } = await supabase.from('inst_leads').insert({
        lead_name: formData.lead_name,
        company_name: formData.company_name,
        email: formData.email || null,
        phone: formData.phone || null,
        city: formData.city || null,
        state: formData.state || null,
        lead_source: formData.lead_source,
        industry_type: formData.industry_type || null,
        annual_potential_value: parseFloat(formData.annual_potential_value) || 0,
        notes: formData.notes || null,
        created_by: user?.id,
        assigned_to: user?.id,
      });

      if (error) throw error;
      toast.success('Lead created successfully');
      setIsCreateOpen(false);
      setFormData({
        lead_name: "",
        company_name: "",
        email: "",
        phone: "",
        city: "",
        state: "",
        lead_source: "direct",
        industry_type: "",
        annual_potential_value: "",
        notes: "",
      });
      fetchLeads();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error('Failed to create lead');
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('inst_leads')
        .update({ lead_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) throw error;
      toast.success('Status updated');
      fetchLeads();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleConvertToAccount = async (lead: Lead) => {
    try {
      // Create account from lead
      const { data: account, error: accountError } = await supabase
        .from('inst_accounts')
        .insert({
          account_name: lead.company_name,
          industry: lead.industry_type,
          city: lead.city,
          state: lead.state,
          phone: lead.phone,
          email: lead.email,
          account_owner: user?.id,
        })
        .select()
        .single();

      if (accountError) throw accountError;

      // Create contact from lead
      await supabase.from('inst_contacts').insert({
        account_id: account.id,
        first_name: lead.lead_name.split(' ')[0],
        last_name: lead.lead_name.split(' ').slice(1).join(' ') || '',
        email: lead.email,
        phone: lead.phone,
        is_primary_contact: true,
      });

      // Update lead as converted
      await supabase
        .from('inst_leads')
        .update({ 
          lead_status: 'converted', 
          converted_account_id: account.id,
          updated_at: new Date().toISOString() 
        })
        .eq('id', lead.id);

      toast.success('Lead converted to account successfully');
      navigate(`/institutional-sales/accounts`);
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('Failed to convert lead');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to move this lead to recycle bin?')) return;

    try {
      const leadData = leads.find(l => l.id === leadId);
      if (leadData) {
        await moveToRecycleBin({
          tableName: 'inst_leads',
          recordId: leadId,
          recordData: leadData,
          moduleName: 'Institutional Leads',
          recordName: leadData.lead_name
        });
      }
      
      const { error } = await supabase.from('inst_leads').delete().eq('id', leadId);
      if (error) throw error;
      toast.success('Lead moved to recycle bin');
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'contacted': return 'bg-yellow-100 text-yellow-700';
      case 'qualified': return 'bg-green-100 text-green-700';
      case 'proposal': return 'bg-purple-100 text-purple-700';
      case 'negotiation': return 'bg-orange-100 text-orange-700';
      case 'converted': return 'bg-emerald-100 text-emerald-700';
      case 'lost': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
            <h1 className="text-xl font-bold text-foreground">Leads</h1>
            <p className="text-xs text-muted-foreground">{leads.length} total leads</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Lead Name *</Label>
                    <Input
                      value={formData.lead_name}
                      onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="Company name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Lead Source</Label>
                    <Select value={formData.lead_source} onValueChange={(v) => setFormData({ ...formData, lead_source: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={formData.industry_type} onValueChange={(v) => setFormData({ ...formData, industry_type: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Annual Potential Value (₹)</Label>
                  <Input
                    type="number"
                    value={formData.annual_potential_value}
                    onChange={(e) => setFormData({ ...formData, annual_potential_value: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">Create Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {leadStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads found. Create your first lead!
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <Card key={lead.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{lead.lead_name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(lead.lead_status)}`}>
                          {lead.lead_status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <Building2 className="h-3.5 w-3.5" />
                        {lead.company_name}
                        {lead.industry_type && <span className="text-xs">• {lead.industry_type}</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-primary">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </a>
                        )}
                        {(lead.city || lead.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {[lead.city, lead.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'contacted')}>
                          Mark as Contacted
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'qualified')}>
                          Mark as Qualified
                        </DropdownMenuItem>
                        {lead.lead_status !== 'converted' && (
                          <DropdownMenuItem onClick={() => handleConvertToAccount(lead)}>
                            <UserCheck className="h-4 w-4 mr-2" /> Convert to Account
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {lead.annual_potential_value > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Potential Value: </span>
                      <span className="text-sm font-medium text-primary">
                        ₹{lead.annual_potential_value.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
