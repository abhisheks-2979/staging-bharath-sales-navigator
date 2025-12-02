import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft, User, Building2, Phone, Mail, Briefcase,
  Edit, Save, X, Star
} from "lucide-react";

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
  inst_accounts: { account_name: string } | null;
}

export default function ContactDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>({});

  useEffect(() => {
    if (id) fetchContact();
  }, [id]);

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase
        .from('inst_contacts')
        .select('*, inst_accounts(account_name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContact(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast.error('Failed to fetch contact');
      navigate('/institutional-sales/contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('inst_contacts')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          mobile: formData.mobile,
          designation: formData.designation,
          department: formData.department,
          is_primary_contact: formData.is_primary_contact,
          is_decision_maker: formData.is_decision_maker,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Contact updated');
      setContact({ ...contact, ...formData } as Contact);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    }
  };

  if (loading) {
    return <Layout><div className="p-4 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  if (!contact) return null;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales/contacts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {contact.first_name} {contact.last_name}
              {contact.is_primary_contact && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {contact.inst_accounts?.account_name}
              {contact.designation && <span>• {contact.designation}</span>}
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setFormData(contact); }}>
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

        {/* Contact Details */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input value={formData.designation || ''} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    <Input value={formData.mobile || ''} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.is_primary_contact || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_primary_contact: !!checked })}
                    />
                    <Label className="text-sm">Primary Contact</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.is_decision_maker || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_decision_maker: !!checked })}
                    />
                    <Label className="text-sm">Decision Maker</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {contact.is_primary_contact && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Primary Contact</span>
                  )}
                  {contact.is_decision_maker && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">Decision Maker</span>
                  )}
                </div>
                
                {contact.department && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.department}</span>
                  </div>
                )}
                
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-sm hover:text-primary">{contact.email}</a>
                  </div>
                )}
                
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="text-sm hover:text-primary">{contact.phone} (Office)</a>
                  </div>
                )}
                
                {contact.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.mobile}`} className="text-sm hover:text-primary">{contact.mobile} (Mobile)</a>
                  </div>
                )}
                
                {contact.notes && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{contact.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}