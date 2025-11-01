import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, FileDown, Search, Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import TerritoryDetailsModal from './TerritoryDetailsModal';
import TerritoryDashboard from './TerritoryDashboard';
import { format } from 'date-fns';

interface Territory {
  id: string;
  name: string;
  region: string;
  zone?: string;
  pincode_ranges: string[];
  assigned_user_id?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

const TerritoriesManagement = () => {
  const [territories, setTerritories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  
  const [territoryName, setTerritoryName] = useState('');
  const [region, setRegion] = useState('');
  const [zone, setZone] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignedDistributorIds, setAssignedDistributorIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [distributorComboOpen, setDistributorComboOpen] = useState(false);

  useEffect(() => {
    loadTerritories();
    loadUsers();
    loadDistributors();

    // Set up real-time subscription for orders to update territory stats
    const channel = supabase
      .channel('territories-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change detected, refreshing territories:', payload);
          loadTerritories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, username');
    setUsers(data || []);
  };

  const loadDistributors = async () => {
    const { data } = await supabase.from('distributors').select('id, name, contact_person');
    setDistributors(data || []);
  };

  const loadTerritories = async () => {
    const { data, error } = await supabase
      .from('territories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading territories:', error);
      toast.error('Failed to load territories');
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setTerritories([]);
      setLoading(false);
      return;
    }

    const territoriesWithStats = await Promise.all(
      data.map(async (territory) => {
        let assigned_user_name = 'Unassigned';
        if (territory.assigned_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', territory.assigned_user_id)
            .maybeSingle();
          assigned_user_name = profile?.full_name || 'Unassigned';
        }

        // Get retailers that match any of the territory's PIN codes
        let retailersCount = 0;
        if (territory.pincode_ranges && territory.pincode_ranges.length > 0) {
          const { data: retailers } = await supabase
            .from('retailers')
            .select('id, address');
          
          if (retailers) {
            retailersCount = retailers.filter(r => {
              const address = r.address || '';
              return territory.pincode_ranges.some((pin: string) => 
                address.includes(pin)
              );
            }).length;
          }
        }

        // Get sales for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        
        // Get all orders and filter by retailers in this territory
        const { data: allRetailers } = await supabase
          .from('retailers')
          .select('id, address');
        
        let territoryRetailerIds: string[] = [];
        if (allRetailers && territory.pincode_ranges) {
          territoryRetailerIds = allRetailers
            .filter(r => {
              const address = r.address || '';
              return territory.pincode_ranges.some((pin: string) => 
                address.includes(pin)
              );
            })
            .map(r => r.id);
        }

        let total_sales = 0;
        if (territoryRetailerIds.length > 0) {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('total_amount')
            .in('retailer_id', territoryRetailerIds)
            .gte('created_at', startOfMonth.toISOString());

          total_sales = ordersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
        }

        return {
          ...territory,
          assigned_user_name,
          total_retailers: retailersCount,
          total_sales,
        };
      })
    );

    setTerritories(territoriesWithStats);
    setLoading(false);
  };

  const handleAddTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    const pincodeArray = pincodes.split(',').map(p => p.trim()).filter(p => p.length > 0);

    if (pincodeArray.length === 0) {
      toast.error('Please enter at least one PIN code');
      return;
    }

    const { error } = await supabase.from('territories').insert({
      name: territoryName,
      region,
      zone: zone || null,
      pincode_ranges: pincodeArray,
      assigned_user_ids: assignedUserIds.length > 0 ? JSON.stringify(assignedUserIds) : '[]',
      assigned_distributor_ids: assignedDistributorIds.length > 0 ? JSON.stringify(assignedDistributorIds) : '[]',
      description: description || null,
    });

    if (error) {
      console.error('Error adding territory:', error);
      toast.error('Failed to add territory');
      return;
    }

    toast.success('Territory added successfully!');
    setTerritoryName('');
    setRegion('');
    setZone('');
    setPincodes('');
    setAssignedUserIds([]);
    setAssignedDistributorIds([]);
    setDescription('');
    setShowForm(false);
    loadTerritories();
  };

  const filteredTerritories = territories.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = filterUser === 'all' || t.assigned_user_id === filterUser;
    return matchesSearch && matchesUser;
  });

  if (loading) return <div className="flex items-center justify-center p-8">Loading...</div>;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Territories Management</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={16} /> Add Territory
        </Button>
      </div>

      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="list">Territory List</TabsTrigger>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="space-y-6">
        {showForm && (
          <Card>
            <CardHeader><CardTitle>Add New Territory</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddTerritory} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Territory Name *</Label><Input value={territoryName} onChange={(e) => setTerritoryName(e.target.value)} required /></div>
                  <div><Label>Region *</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} required /></div>
                  <div><Label>Zone</Label><Input value={zone} onChange={(e) => setZone(e.target.value)} /></div>
                </div>
                
                <div className="space-y-2">
                  <Label>Assign Users (Multiple)</Label>
                  <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {assignedUserIds.length > 0 ? `${assignedUserIds.length} user(s) selected` : "Select users..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search users..." />
                        <CommandList>
                          <CommandEmpty>No user found.</CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                onSelect={() => {
                                  setAssignedUserIds(prev => 
                                    prev.includes(user.id) 
                                      ? prev.filter(id => id !== user.id)
                                      : [...prev, user.id]
                                  );
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", assignedUserIds.includes(user.id) ? "opacity-100" : "opacity-0")} />
                                {user.full_name || user.username}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {assignedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assignedUserIds.map(userId => {
                        const user = users.find(u => u.id === userId);
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1">
                            {user?.full_name || user?.username}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setAssignedUserIds(prev => prev.filter(id => id !== userId))} />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assign Distributors (Multiple)</Label>
                  <Popover open={distributorComboOpen} onOpenChange={setDistributorComboOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {assignedDistributorIds.length > 0 ? `${assignedDistributorIds.length} distributor(s) selected` : "Select distributors..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search distributors..." />
                        <CommandList>
                          <CommandEmpty>No distributor found.</CommandEmpty>
                          <CommandGroup>
                            {distributors.map((distributor) => (
                              <CommandItem
                                key={distributor.id}
                                onSelect={() => {
                                  setAssignedDistributorIds(prev => 
                                    prev.includes(distributor.id) 
                                      ? prev.filter(id => id !== distributor.id)
                                      : [...prev, distributor.id]
                                  );
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", assignedDistributorIds.includes(distributor.id) ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{distributor.name}</span>
                                  {distributor.contact_person && (
                                    <span className="text-xs text-muted-foreground">{distributor.contact_person}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {assignedDistributorIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assignedDistributorIds.map(distId => {
                        const distributor = distributors.find(d => d.id === distId);
                        return (
                          <Badge key={distId} variant="secondary" className="gap-1">
                            {distributor?.name}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setAssignedDistributorIds(prev => prev.filter(id => id !== distId))} />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <Label>PIN Codes * (comma-separated)</Label>
                  <Input 
                    value={pincodes} 
                    onChange={(e) => setPincodes(e.target.value)} 
                    placeholder="e.g., 110001, 110002, 410210" 
                    required 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Retailers with addresses containing these PIN codes will be mapped to this territory
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Optional territory description" 
                  />
                </div>
                <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><Label>Search</Label><Input placeholder="Search territory..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <div><Label>Filter by User</Label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Users</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            
            {filteredTerritories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {territories.length === 0 ? 'No territories created yet. Click "Add Territory" to get started.' : 'No territories match your filters.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Territory Name</TableHead>
                    <TableHead>Region/Zone</TableHead>
                    <TableHead>PIN Codes Covered</TableHead>
                    <TableHead>Assigned Sales User</TableHead>
                    <TableHead className="text-right">Total Retailers</TableHead>
                    <TableHead className="text-right">Total Sales (Month)</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTerritories.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{t.region}</span>
                          {t.zone && <Badge variant="outline" className="w-fit">{t.zone}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.pincode_ranges?.slice(0, 3).map((p, i) => (
                            <Badge key={i} variant="secondary">{p}</Badge>
                          ))}
                          {t.pincode_ranges?.length > 3 && (
                            <Badge variant="outline">+{t.pincode_ranges.length - 3} more</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{t.assigned_user_name}</TableCell>
                      <TableCell className="text-right font-medium">{t.total_retailers}</TableCell>
                      <TableCell className="text-right font-medium">₹{t.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(t.updated_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedTerritory(t); setDetailsModalOpen(true); }}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dashboard"><TerritoryDashboard /></TabsContent>

      <TerritoryDetailsModal open={detailsModalOpen} onOpenChange={setDetailsModalOpen} territory={selectedTerritory} />
    </Tabs>
  );
};

export default TerritoriesManagement;
