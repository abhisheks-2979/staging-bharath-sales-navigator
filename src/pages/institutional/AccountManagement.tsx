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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, Search, Building2, Phone, Mail, 
  MapPin, Globe, MoreVertical, Users, Target, FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gst_number: string | null;
  credit_limit: number;
  payment_terms: number;
  is_active: boolean;
  created_at: string;
}

const accountTypes = ['institutional', 'corporate', 'government', 'hospitality', 'retail'];
const industries = ['Education', 'Healthcare', 'Government', 'Corporate', 'Hospitality', 'Retail', 'Manufacturing', 'Other'];

export default function AccountManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    account_name: "",
    account_type: "institutional",
    industry: "",
    billing_address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    gst_number: "",
    credit_limit: "",
    payment_terms: "30",
  });

  useEffect(() => {
    fetchAccounts();
  }, [typeFilter]);

  const fetchAccounts = async () => {
    try {
      let query = supabase
        .from('inst_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('account_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.account_name) {
      toast.error('Account name is required');
      return;
    }

    try {
      const { error } = await supabase.from('inst_accounts').insert({
        account_name: formData.account_name,
        account_type: formData.account_type,
        industry: formData.industry || null,
        billing_address: formData.billing_address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        gst_number: formData.gst_number || null,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        payment_terms: parseInt(formData.payment_terms) || 30,
        account_owner: user?.id,
      });

      if (error) throw error;
      toast.success('Account created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
    }
  };

  const resetForm = () => {
    setFormData({
      account_name: "",
      account_type: "institutional",
      industry: "",
      billing_address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      website: "",
      gst_number: "",
      credit_limit: "",
      payment_terms: "30",
    });
  };

  const filteredAccounts = accounts.filter(account =>
    account.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Accounts</h1>
            <p className="text-xs text-muted-foreground">{accounts.length} active accounts</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label>Account Name *</Label>
                    <Input
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="Company/Organization name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select value={formData.industry} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
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
                  <Label>Billing Address</Label>
                  <Textarea
                    value={formData.billing_address}
                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                    placeholder="Full address"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
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
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Pincode"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                      placeholder="GSTIN"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Credit Limit (₹)</Label>
                    <Input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms (days)</Label>
                    <Input
                      type="number"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">Create Account</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {accountTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accounts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accounts found. Create your first account!
            </div>
          ) : (
            filteredAccounts.map((account) => (
              <Card 
                key={account.id} 
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/institutional-sales/accounts/${account.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{account.account_name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {account.account_type}
                        </span>
                      </div>
                      {account.industry && (
                        <p className="text-sm text-muted-foreground mb-2">{account.industry}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {account.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {account.phone}
                          </span>
                        )}
                        {account.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {account.email}
                          </span>
                        )}
                        {(account.city || account.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {[account.city, account.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                        {account.website && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" /> {account.website}
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/institutional-sales/contacts?account=${account.id}`);
                        }}>
                          <Users className="h-4 w-4 mr-2" /> View Contacts
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/institutional-sales/opportunities?account=${account.id}`);
                        }}>
                          <Target className="h-4 w-4 mr-2" /> View Opportunities
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/institutional-sales/quotes?account=${account.id}`);
                        }}>
                          <FileText className="h-4 w-4 mr-2" /> View Quotes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {account.credit_limit > 0 && (
                    <div className="mt-2 pt-2 border-t flex items-center gap-4 text-xs">
                      <span>
                        <span className="text-muted-foreground">Credit Limit: </span>
                        <span className="font-medium">₹{account.credit_limit.toLocaleString('en-IN')}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Payment Terms: </span>
                        <span className="font-medium">{account.payment_terms} days</span>
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
