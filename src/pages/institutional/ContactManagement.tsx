import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, Plus, Search, User, Phone, Mail, 
  Building2, Briefcase, Star, MoreVertical, Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Contact {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  designation: string | null;
  department: string | null;
  is_primary_contact: boolean;
  is_decision_maker: boolean;
  notes: string | null;
  inst_accounts: {
    account_name: string;
  } | null;
}

interface Account {
  id: string;
  account_name: string;
}

export default function ContactManagement() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountIdFromUrl = searchParams.get('account');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<string>(accountIdFromUrl || "all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    account_id: accountIdFromUrl || "",
    email: "",
    phone: "",
    mobile: "",
    designation: "",
    department: "",
    is_primary_contact: false,
    is_decision_maker: false,
    notes: "",
  });

  useEffect(() => {
    fetchContacts();
    fetchAccounts();
  }, [accountFilter]);

  const fetchContacts = async () => {
    try {
      let query = supabase
        .from('inst_contacts')
        .select('*, inst_accounts(account_name)')
        .order('created_at', { ascending: false });

      if (accountFilter !== 'all') {
        query = query.eq('account_id', accountFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to fetch contacts');
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
    if (!formData.first_name || !formData.account_id) {
      toast.error('First name and account are required');
      return;
    }

    try {
      const { error } = await supabase.from('inst_contacts').insert({
        first_name: formData.first_name,
        last_name: formData.last_name || null,
        account_id: formData.account_id,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        designation: formData.designation || null,
        department: formData.department || null,
        is_primary_contact: formData.is_primary_contact,
        is_decision_maker: formData.is_decision_maker,
        notes: formData.notes || null,
      });

      if (error) throw error;
      toast.success('Contact created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Failed to create contact');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      account_id: accountIdFromUrl || "",
      email: "",
      phone: "",
      mobile: "",
      designation: "",
      department: "",
      is_primary_contact: false,
      is_decision_maker: false,
      notes: "",
    });
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase.from('inst_contacts').delete().eq('id', contactId);
      if (error) throw error;
      toast.success('Contact deleted');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const togglePrimary = async (contact: Contact) => {
    try {
      // If setting as primary, first unset other primary contacts for this account
      if (!contact.is_primary_contact) {
        await supabase
          .from('inst_contacts')
          .update({ is_primary_contact: false })
          .eq('account_id', contact.account_id);
      }

      const { error } = await supabase
        .from('inst_contacts')
        .update({ is_primary_contact: !contact.is_primary_contact })
        .eq('id', contact.id);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.first_name} ${contact.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.inst_accounts?.account_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Contacts</h1>
            <p className="text-xs text-muted-foreground">{contacts.length} contacts</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                    <Label>First Name *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="Job title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="Department"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Office phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="Mobile number"
                    />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="primary"
                      checked={formData.is_primary_contact}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_primary_contact: !!checked })}
                    />
                    <Label htmlFor="primary" className="text-sm">Primary Contact</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="decision"
                      checked={formData.is_decision_maker}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_decision_maker: !!checked })}
                    />
                    <Label htmlFor="decision" className="text-sm">Decision Maker</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">Create Contact</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contacts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found. Create your first contact!
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <Card key={contact.id} className="overflow-hidden cursor-pointer hover:shadow-md" onClick={() => navigate(`/institutional-sales/contacts/${contact.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">
                          {contact.first_name} {contact.last_name}
                        </h3>
                        {contact.is_primary_contact && (
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        )}
                        {contact.is_decision_maker && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Decision Maker
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {contact.inst_accounts?.account_name}
                        </span>
                        {contact.designation && (
                          <span className="text-sm text-muted-foreground">
                            • {contact.designation}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-primary">
                            <Mail className="h-3 w-3" /> {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" /> {contact.phone}
                          </a>
                        )}
                        {contact.mobile && (
                          <a href={`tel:${contact.mobile}`} className="flex items-center gap-1 hover:text-primary">
                            <Phone className="h-3 w-3" /> {contact.mobile}
                          </a>
                        )}
                        {contact.department && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> {contact.department}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePrimary(contact); }}>
                          {contact.is_primary_contact ? 'Remove as Primary' : 'Set as Primary'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
