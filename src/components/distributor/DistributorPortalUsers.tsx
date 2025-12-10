import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, User, Mail, Phone, Shield, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface DistributorUser {
  id: string;
  distributor_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  designation: string | null;
  user_level: string | null;
  is_active: boolean;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  last_login_at: string | null;
}

interface DistributorPortalUsersProps {
  distributorId: string;
  distributorName: string;
}

const PORTAL_ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Manage orders, inventory, and staff' },
  { value: 'warehouse', label: 'Warehouse Staff', description: 'Inventory and dispatch' },
  { value: 'accounts', label: 'Accounts', description: 'Payments and claims' },
  { value: 'sales', label: 'Sales Staff', description: 'View orders and retailers' },
];

const USER_LEVELS = [
  { value: 'senior', label: 'Senior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'junior', label: 'Junior' },
  { value: 'staff', label: 'Staff' },
];

export function DistributorPortalUsers({ distributorId, distributorName }: DistributorPortalUsersProps) {
  const [users, setUsers] = useState<DistributorUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'sales',
    designation: '',
    user_level: 'staff',
  });

  useEffect(() => {
    loadUsers();
  }, [distributorId]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('distributor_users')
        .select('*')
        .eq('distributor_id', distributorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error("Failed to load portal users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.full_name) {
      toast.error("Name and email are required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('distributor_users')
        .insert([{
          distributor_id: distributorId,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role,
          designation: formData.designation || null,
          user_level: formData.user_level,
          is_active: false, // Requires admin approval
        }]);

      if (error) throw error;

      toast.success("Portal user request created. Awaiting admin approval.");
      setDialogOpen(false);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        role: 'sales',
        designation: '',
        user_level: 'staff',
      });
      loadUsers();
    } catch (error: any) {
      toast.error("Failed to create user: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        is_active: !currentStatus,
      };

      // If activating, record approval
      if (!currentStatus) {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = user?.id;
      }

      const { error } = await supabase
        .from('distributor_users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast.success(currentStatus ? "User disabled" : "User enabled");
      loadUsers();
    } catch (error: any) {
      toast.error("Failed to update user: " + error.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'warehouse': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'accounts': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Portal Users
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Portal User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g., Sales Executive, Warehouse Supervisor"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Portal Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PORTAL_ROLES.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Level</Label>
                    <Select
                      value={formData.user_level}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, user_level: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> New users require admin approval before they can access the portal.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No portal users yet</p>
            <p className="text-xs mt-1">Add users to give them access to the distributor portal</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                        {user.designation && (
                          <p className="text-xs text-muted-foreground mt-0.5">{user.designation}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {PORTAL_ROLES.find(r => r.value === user.role)?.label || user.role}
                        </Badge>
                        {user.user_level && (
                          <p className="text-xs text-muted-foreground">
                            {USER_LEVELS.find(l => l.value === user.user_level)?.label || user.user_level}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {user.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      {user.approved_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Approved: {format(new Date(user.approved_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
