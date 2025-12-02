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
import { 
  ArrowLeft, Building2, Phone, Mail, MapPin, Globe, 
  Edit, Save, X, Users, Target, FileText, Receipt
} from "lucide-react";

interface Account {
  id: string;
  account_name: string;
  account_type: string;
  industry: string | null;
  billing_address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  gst_number: string | null;
  pan_number: string | null;
  credit_limit: number;
  payment_terms: number;
  is_active: boolean;
}

const accountTypes = ['institutional', 'corporate', 'government', 'hospitality', 'retail'];
const industries = ['Education', 'Healthcare', 'Government', 'Corporate', 'Hospitality', 'Retail', 'Manufacturing', 'Other'];

export default function AccountDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>({});
  const [contactsCount, setContactsCount] = useState(0);
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);
  const [quotesCount, setQuotesCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchAccount();
      fetchRelatedCounts();
    }
  }, [id]);

  const fetchAccount = async () => {
    try {
      const { data, error } = await supabase
        .from('inst_accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAccount(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching account:', error);
      toast.error('Failed to fetch account');
      navigate('/institutional-sales/accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedCounts = async () => {
    const [contacts, opportunities, quotes] = await Promise.all([
      supabase.from('inst_contacts').select('id', { count: 'exact', head: true }).eq('account_id', id),
      supabase.from('inst_opportunities').select('id', { count: 'exact', head: true }).eq('account_id', id),
      supabase.from('inst_quotes').select('id', { count: 'exact', head: true }).eq('account_id', id),
    ]);
    setContactsCount(contacts.count || 0);
    setOpportunitiesCount(opportunities.count || 0);
    setQuotesCount(quotes.count || 0);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('inst_accounts')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Account updated successfully');
      setAccount({ ...account, ...formData } as Account);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 text-center text-muted-foreground">Loading...</div>
      </Layout>
    );
  }

  if (!account) return null;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales/accounts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {account.account_name}
            </h1>
            <p className="text-xs text-muted-foreground">{account.account_type} • {account.industry}</p>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setFormData(account); }}>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/institutional-sales/contacts?account=${id}`)}>
            <CardContent className="p-3 text-center">
              <Users className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{contactsCount}</p>
              <p className="text-xs text-muted-foreground">Contacts</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/institutional-sales/opportunities?account=${id}`)}>
            <CardContent className="p-3 text-center">
              <Target className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{opportunitiesCount}</p>
              <p className="text-xs text-muted-foreground">Opportunities</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate(`/institutional-sales/quotes?account=${id}`)}>
            <CardContent className="p-3 text-center">
              <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{quotesCount}</p>
              <p className="text-xs text-muted-foreground">Quotes</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Details */}
        <Tabs defaultValue="details">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="financial" className="flex-1">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Account Name</Label>
                      <Input
                        value={formData.account_name || ''}
                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Account Type</Label>
                        <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Select value={formData.industry || ''} onValueChange={(v) => setFormData({ ...formData, industry: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Billing Address</Label>
                      <Textarea
                        value={formData.billing_address || ''}
                        onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={formData.state || ''} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Pincode</Label>
                        <Input value={formData.pincode || ''} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input value={formData.website || ''} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {account.billing_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm">{account.billing_address}</p>
                          <p className="text-sm text-muted-foreground">
                            {[account.city, account.state, account.pincode].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {account.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${account.phone}`} className="text-sm hover:text-primary">{account.phone}</a>
                      </div>
                    )}
                    {account.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${account.email}`} className="text-sm hover:text-primary">{account.email}</a>
                      </div>
                    )}
                    {account.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary">{account.website}</a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>GST Number</Label>
                        <Input value={formData.gst_number || ''} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>PAN Number</Label>
                        <Input value={formData.pan_number || ''} onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Credit Limit (₹)</Label>
                        <Input
                          type="number"
                          value={formData.credit_limit || ''}
                          onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Terms (days)</Label>
                        <Input
                          type="number"
                          value={formData.payment_terms || ''}
                          onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">GST Number</p>
                      <p className="font-medium">{account.gst_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PAN Number</p>
                      <p className="font-medium">{account.pan_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Credit Limit</p>
                      <p className="font-medium">₹{account.credit_limit?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Terms</p>
                      <p className="font-medium">{account.payment_terms || 30} days</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}