import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Database, Save } from 'lucide-react';
import { toast } from 'sonner';

const OBJECTS = [
  { name: 'retailers', label: 'Retailers' },
  { name: 'orders', label: 'Orders' },
  { name: 'visits', label: 'Visits' },
  { name: 'products', label: 'Products' },
  { name: 'territories', label: 'Territories' },
  { name: 'attendance', label: 'Attendance' },
  { name: 'expenses', label: 'Expenses' },
  { name: 'beats', label: 'Beats' },
  { name: 'distributors', label: 'Distributors' },
  { name: 'invoices', label: 'Invoices' },
];

interface ObjectPermission {
  id: string;
  profile_id: string;
  object_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_view_all: boolean;
  can_modify_all: boolean;
}

export const ObjectPermissions = () => {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<ObjectPermission>>>({});

  // Fetch profiles
  const { data: profiles } = useQuery({
    queryKey: ['security-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_profiles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch permissions for selected profile
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['profile-object-permissions', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      
      const { data, error } = await supabase
        .from('profile_object_permissions')
        .select('*')
        .eq('profile_id', selectedProfileId);
      
      if (error) throw error;
      return data as ObjectPermission[];
    },
    enabled: !!selectedProfileId
  });

  // Save mutations
  const saveMutation = useMutation({
    mutationFn: async (changes: Record<string, Partial<ObjectPermission>>) => {
      const updates = Object.entries(changes).map(([objectName, perms]) => ({
        profile_id: selectedProfileId,
        object_name: objectName,
        ...perms
      }));

      const { error } = await supabase
        .from('profile_object_permissions')
        .upsert(updates, { onConflict: 'profile_id,object_name' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-object-permissions'] });
      setPendingChanges({});
      toast.success('Permissions updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
    }
  });

  const handlePermissionChange = (objectName: string, field: string, value: boolean) => {
    setPendingChanges(prev => ({
      ...prev,
      [objectName]: {
        ...prev[objectName],
        [field]: value
      }
    }));
  };

  const getPermissionValue = (objectName: string, field: string): boolean => {
    if (pendingChanges[objectName]?.[field] !== undefined) {
      return pendingChanges[objectName][field] as boolean;
    }
    const perm = permissions?.find(p => p.object_name === objectName);
    return perm?.[field as keyof ObjectPermission] as boolean || false;
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }
    saveMutation.mutate(pendingChanges);
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Object Permissions</CardTitle>
            <CardDescription>Configure what objects each profile can access</CardDescription>
          </div>
          {hasPendingChanges && (
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Selector */}
        <div className="space-y-2">
          <Label>Select Profile</Label>
          <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Choose a profile to configure" />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {profile.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Permissions Grid */}
        {selectedProfileId && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">Object</TableHead>
                  <TableHead className="text-center">Read</TableHead>
                  <TableHead className="text-center">Create</TableHead>
                  <TableHead className="text-center">Edit</TableHead>
                  <TableHead className="text-center">Delete</TableHead>
                  <TableHead className="text-center">View All</TableHead>
                  <TableHead className="text-center">Modify All</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {OBJECTS.map((obj) => (
                  <TableRow key={obj.name}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        {obj.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermissionValue(obj.name, 'can_read')}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(obj.name, 'can_read', checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermissionValue(obj.name, 'can_create')}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(obj.name, 'can_create', checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermissionValue(obj.name, 'can_edit')}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(obj.name, 'can_edit', checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermissionValue(obj.name, 'can_delete')}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(obj.name, 'can_delete', checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermissionValue(obj.name, 'can_view_all')}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(obj.name, 'can_view_all', checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={getPermissionValue(obj.name, 'can_modify_all')}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(obj.name, 'can_modify_all', checked as boolean)
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!selectedProfileId && (
          <div className="text-center py-12 text-muted-foreground">
            Select a profile to configure its permissions
          </div>
        )}

        {/* Legend */}
        {selectedProfileId && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Read:</strong> View records
                </div>
                <div>
                  <strong>Create:</strong> Add new records
                </div>
                <div>
                  <strong>Edit:</strong> Update own records
                </div>
                <div>
                  <strong>Delete:</strong> Remove own records
                </div>
                <div>
                  <strong>View All:</strong> See all users' records
                </div>
                <div>
                  <strong>Modify All:</strong> Edit/delete all records
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
