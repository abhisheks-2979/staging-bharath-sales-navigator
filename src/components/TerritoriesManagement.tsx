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
import { Plus, FileDown, Search, Check, ChevronsUpDown, X, BarChart3, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import TerritoryDetailsModal from './TerritoryDetailsModal';
import TerritoryDashboard from './TerritoryDashboard';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { moveToRecycleBin } from '@/utils/recycleBinUtils';

interface Territory {
  id: string;
  name: string;
  region: string;
  territory_type?: string;
  pincode_ranges: string[];
  assigned_user_id?: string;
  parent_id?: string;
  child_territories_count?: number;
  population?: number;
  target_market_size?: number;
  retailer_count?: number;
  competitor_ids?: string[];
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
  const [editingTerritoryId, setEditingTerritoryId] = useState<string | null>(null);
  
  const [territoryName, setTerritoryName] = useState('');
  const [region, setRegion] = useState('');
  const [territoryType, setTerritoryType] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [assignedDistributorIds, setAssignedDistributorIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [population, setPopulation] = useState('');
  const [targetMarketSize, setTargetMarketSize] = useState('');
  const [retailerCount, setRetailerCount] = useState('');
  const [competitorIds, setCompetitorIds] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterDistributor, setFilterDistributor] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [userComboOpen, setUserComboOpen] = useState(false);
  const [distributorComboOpen, setDistributorComboOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [territoryToDelete, setTerritoryToDelete] = useState<any>(null);

  useEffect(() => {
    loadTerritories();
    loadUsers();
    loadDistributors();
    loadCompetitors();

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

  const loadCompetitors = async () => {
    const { data } = await supabase.from('competition_master').select('id, competitor_name');
    setCompetitors(data || []);
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

        // Get sales for this month and previous month
        const currentMonthStart = new Date();
        currentMonthStart.setDate(1);
        
        const previousMonthStart = new Date();
        previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
        previousMonthStart.setDate(1);
        
        const previousMonthEnd = new Date(currentMonthStart);
        previousMonthEnd.setDate(0); // Last day of previous month
        
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
        let previous_month_sales = 0;
        
        if (territoryRetailerIds.length > 0) {
          // Current month sales
          const { data: currentOrdersData } = await supabase
            .from('orders')
            .select('total_amount')
            .in('retailer_id', territoryRetailerIds)
            .gte('created_at', currentMonthStart.toISOString());

          total_sales = currentOrdersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
          
          // Previous month sales
          const { data: previousOrdersData } = await supabase
            .from('orders')
            .select('total_amount')
            .in('retailer_id', territoryRetailerIds)
            .gte('created_at', previousMonthStart.toISOString())
            .lte('created_at', previousMonthEnd.toISOString());

          previous_month_sales = previousOrdersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0;
        }

        return {
          ...territory,
          assigned_user_name,
          total_retailers: retailersCount,
          total_sales,
          previous_month_sales,
        };
      })
    );

    setTerritories(territoriesWithStats);
    setLoading(false);
  };

  const handleAddTerritory = async (e: React.FormEvent) => {
    e.preventDefault();
    const pincodeArray = pincodes.split(',').map(p => p.trim()).filter(p => p.length > 0);

    // Only require pincodes if territory type is filled
    if (territoryType && pincodeArray.length === 0) {
      toast.error('Please enter at least one PIN code when territory type is specified');
      return;
    }

    if (editingTerritoryId) {
      // Update existing territory
      const { error } = await supabase.from('territories').update({
        name: territoryName,
        region,
        territory_type: territoryType || null,
        pincode_ranges: pincodeArray,
        assigned_user_ids: assignedUserIds,
        assigned_distributor_ids: assignedDistributorIds,
        parent_id: parentId && parentId !== 'none' ? parentId : null,
        population: population ? parseInt(population) : null,
        target_market_size: targetMarketSize ? parseFloat(targetMarketSize) : null,
        retailer_count: retailerCount ? parseInt(retailerCount) : null,
        competitor_ids: competitorIds.length > 0 ? competitorIds : null,
        description: description || null,
      }).eq('id', editingTerritoryId);

      if (error) {
        console.error('Error updating territory:', error);
        toast.error('Failed to update territory');
        return;
      }

      toast.success('Territory updated successfully!');
    } else {
      // Insert new territory
      const { error } = await supabase.from('territories').insert({
        name: territoryName,
        region,
        territory_type: territoryType || null,
        pincode_ranges: pincodeArray,
        assigned_user_ids: assignedUserIds,
        assigned_distributor_ids: assignedDistributorIds,
        parent_id: parentId && parentId !== 'none' ? parentId : null,
        population: population ? parseInt(population) : null,
        target_market_size: targetMarketSize ? parseFloat(targetMarketSize) : null,
        retailer_count: retailerCount ? parseInt(retailerCount) : null,
        competitor_ids: competitorIds.length > 0 ? competitorIds : null,
        description: description || null,
      });

      if (error) {
        console.error('Error adding territory:', error);
        toast.error('Failed to add territory');
        return;
      }

      toast.success('Territory added successfully!');
    }

    setTerritoryName('');
    setRegion('');
    setTerritoryType('');
    setPincodes('');
    setAssignedUserIds([]);
    setAssignedDistributorIds([]);
    setDescription('');
    setParentId('');
    setPopulation('');
    setTargetMarketSize('');
    setRetailerCount('');
    setCompetitorIds([]);
    setEditingTerritoryId(null);
    setShowForm(false);
    loadTerritories();
  };

  const handleEditTerritory = (territory: any) => {
    setEditingTerritoryId(territory.id);
    setTerritoryName(territory.name);
    setRegion(territory.region);
    setTerritoryType(territory.territory_type || '');
    setPincodes(territory.pincode_ranges?.join(', ') || '');
    setAssignedUserIds(territory.assigned_user_ids || []);
    setAssignedDistributorIds(territory.assigned_distributor_ids || []);
    setDescription(territory.description || '');
    setParentId(territory.parent_id || '');
    setPopulation(territory.population?.toString() || '');
    setTargetMarketSize(territory.target_market_size?.toString() || '');
    setRetailerCount(territory.retailer_count?.toString() || '');
    setCompetitorIds(territory.competitor_ids || []);
    setShowForm(true);
    setDetailsModalOpen(false);
  };

  const filteredTerritories = territories.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUser = filterUser === 'all' || t.assigned_user_id === filterUser || t.assigned_user_ids?.includes(filterUser);
    const matchesDistributor = filterDistributor === 'all' || t.assigned_distributor_ids?.includes(filterDistributor);
    return matchesSearch && matchesUser && matchesDistributor;
  });

  const handleDeleteTerritory = async () => {
    if (!territoryToDelete) return;
    
    try {
      await moveToRecycleBin({
        tableName: 'territories',
        recordId: territoryToDelete.id,
        recordData: territoryToDelete,
        moduleName: 'Territories',
        recordName: territoryToDelete.name
      });

      const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', territoryToDelete.id);

      if (error) throw error;

      toast.success("Territory moved to recycle bin");
      setTerritoryToDelete(null);
      setDeleteConfirmOpen(false);
      loadTerritories();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  const openTerritoryDetails = (territory: any) => {
    setSelectedTerritory(territory);
    setDetailsModalOpen(true);
  };

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
            <CardHeader><CardTitle>{editingTerritoryId ? 'Edit Territory' : 'Add New Territory'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddTerritory} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Territory Name *</Label>
                    <Input value={territoryName} onChange={(e) => setTerritoryName(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Region *</Label>
                    <Select value={region} onValueChange={setRegion} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="State">State</SelectItem>
                        <SelectItem value="District">District</SelectItem>
                        <SelectItem value="Taluk">Taluk</SelectItem>
                        <SelectItem value="Gram Panchayat">Gram Panchayat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Territory Type</Label>
                    <Select value={territoryType} onValueChange={setTerritoryType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="City">City</SelectItem>
                        <SelectItem value="Town">Town</SelectItem>
                        <SelectItem value="Village">Village</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Parent Territory</Label>
                    <Select value={parentId || "none"} onValueChange={setParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {territories.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Population</Label>
                    <Input 
                      type="number" 
                      value={population} 
                      onChange={(e) => setPopulation(e.target.value)} 
                      placeholder="Total population"
                    />
                  </div>
                  <div>
                    <Label>Target Market Size (₹)</Label>
                    <Input 
                      type="number" 
                      value={targetMarketSize} 
                      onChange={(e) => setTargetMarketSize(e.target.value)} 
                      placeholder="Market size in rupees"
                    />
                  </div>
                  <div>
                    <Label># of Retailers</Label>
                    <Input 
                      type="number" 
                      value={retailerCount} 
                      onChange={(e) => setRetailerCount(e.target.value)} 
                      placeholder="Total retailers"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Key Competitors (Multiple)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {competitorIds.length > 0 ? `${competitorIds.length} competitor(s) selected` : "Select competitors..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search competitors..." />
                        <CommandList>
                          <CommandEmpty>No competitor found.</CommandEmpty>
                          <CommandGroup>
                            {competitors.map((competitor) => (
                              <CommandItem
                                key={competitor.id}
                                onSelect={() => {
                                  setCompetitorIds(prev => 
                                    prev.includes(competitor.id) 
                                      ? prev.filter(id => id !== competitor.id)
                                      : [...prev, competitor.id]
                                  );
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", competitorIds.includes(competitor.id) ? "opacity-100" : "opacity-0")} />
                                {competitor.competitor_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {competitorIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {competitorIds.map(compId => {
                        const competitor = competitors.find(c => c.id === compId);
                        return (
                          <Badge key={compId} variant="secondary" className="gap-1">
                            {competitor?.competitor_name}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setCompetitorIds(prev => prev.filter(id => id !== compId))} />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
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
                <div className="md:col-span-2">
                  <Label>PIN Codes {territoryType ? '*' : ''} (comma-separated)</Label>
                  <Input 
                    value={pincodes} 
                    onChange={(e) => setPincodes(e.target.value)} 
                    placeholder="e.g., 110001, 110002, 410210" 
                    required={!!territoryType}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {territoryType ? 'Required when territory type is specified. ' : ''}Retailers with addresses containing these PIN codes will be mapped to this territory
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Optional territory description" 
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">{editingTerritoryId ? 'Update' : 'Save'}</Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setEditingTerritoryId(null);
                    setTerritoryName('');
                    setRegion('');
                    setTerritoryType('');
                    setPincodes('');
                    setAssignedUserIds([]);
                    setAssignedDistributorIds([]);
                    setDescription('');
                    setParentId('');
                    setPopulation('');
                    setTargetMarketSize('');
                    setRetailerCount('');
                    setCompetitorIds([]);
                  }}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div><Label>Search</Label><Input placeholder="Search territory..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
              <div><Label>Filter by User</Label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Users</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Filter by Distributor</Label>
                <Select value={filterDistributor} onValueChange={setFilterDistributor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Distributors</SelectItem>{distributors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
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
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Territory</TableHead>
                        <TableHead>Hierarchy</TableHead>
                        <TableHead>Metrics</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTerritories.map((t) => {
                        const parentTerritory = territories.find(pt => pt.id === t.parent_id);
                        const grandParentTerritory = parentTerritory ? territories.find(gt => gt.id === parentTerritory.parent_id) : null;
                        const salesGrowth = t.previous_month_sales ? ((t.total_sales - t.previous_month_sales) / t.previous_month_sales) * 100 : 0;
                        
                        return (
                          <TableRow key={t.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div 
                                  className="font-medium text-primary cursor-pointer hover:underline"
                                  onClick={() => openTerritoryDetails(t)}
                                >
                                  {t.name}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="outline" className="text-xs">{t.region}</Badge>
                                  {t.territory_type && <Badge variant="secondary" className="text-xs">{t.territory_type}</Badge>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {grandParentTerritory && (
                                  <div className="text-muted-foreground flex items-center gap-1">
                                    <span className="text-xs">↳</span> {grandParentTerritory.name}
                                  </div>
                                )}
                                {parentTerritory && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs">{grandParentTerritory ? '  ↳' : '↳'}</span>
                                    <Badge variant="outline" className="text-xs">{parentTerritory.name}</Badge>
                                  </div>
                                )}
                                {!parentTerritory && !grandParentTerritory && (
                                  <span className="text-muted-foreground text-xs">Root Level</span>
                                )}
                                {(t.child_territories_count || 0) > 0 && (
                                  <Badge variant="secondary" className="text-xs">{t.child_territories_count} Sub-territories</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Retailers:</span>
                                  <span className="font-medium">{t.total_retailers}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {t.pincode_ranges?.slice(0, 2).map((pin, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{pin}</Badge>
                                  ))}
                                  {t.pincode_ranges?.length > 2 && (
                                    <Badge variant="outline" className="text-xs">+{t.pincode_ranges.length - 2}</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="font-medium text-primary">
                                  ₹{t.total_sales?.toFixed(2) || '0.00'}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {salesGrowth > 10 && (
                                    <Badge className="bg-green-500 text-white text-xs">High Growth</Badge>
                                  )}
                                  {salesGrowth < -10 && (
                                    <Badge variant="destructive" className="text-xs">Declining</Badge>
                                  )}
                                  {t.target_market_size && t.total_sales && (t.total_sales / t.target_market_size) < 0.3 && (
                                    <Badge className="bg-blue-500 text-white text-xs">High Potential</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  title="View Analytics"
                                  onClick={() => openTerritoryDetails(t)}
                                >
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  title="Edit"
                                  onClick={() => handleEditTerritory(t)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  title="Delete"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setTerritoryToDelete(t);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredTerritories.map((t) => {
                    const parentTerritory = territories.find(pt => pt.id === t.parent_id);
                    const grandParentTerritory = parentTerritory ? territories.find(gt => gt.id === parentTerritory.parent_id) : null;
                    const salesGrowth = t.previous_month_sales ? ((t.total_sales - t.previous_month_sales) / t.previous_month_sales) * 100 : 0;
                    
                    return (
                      <Card key={t.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <CardTitle 
                                className="text-lg text-primary cursor-pointer hover:underline"
                                onClick={() => openTerritoryDetails(t)}
                              >
                                {t.name}
                              </CardTitle>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">{t.region}</Badge>
                                {t.territory_type && <Badge variant="secondary" className="text-xs">{t.territory_type}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openTerritoryDetails(t)}
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEditTerritory(t)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => {
                                  setTerritoryToDelete(t);
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Hierarchy */}
                          {(parentTerritory || grandParentTerritory) && (
                            <div className="space-y-1 p-2 bg-muted/50 rounded-lg">
                              <div className="text-xs font-medium text-muted-foreground">Hierarchy</div>
                              {grandParentTerritory && (
                                <div className="text-sm flex items-center gap-1 text-muted-foreground">
                                  <span>↳</span> {grandParentTerritory.name}
                                </div>
                              )}
                              {parentTerritory && (
                                <div className="text-sm flex items-center gap-1">
                                  <span>{grandParentTerritory ? '  ↳' : '↳'}</span>
                                  <Badge variant="outline" className="text-xs">{parentTerritory.name}</Badge>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Performance Flags */}
                          {(salesGrowth > 10 || salesGrowth < -10 || (t.target_market_size && t.total_sales && (t.total_sales / t.target_market_size) < 0.3)) && (
                            <div className="flex flex-wrap gap-1">
                              {salesGrowth > 10 && (
                                <Badge className="bg-green-500 text-white text-xs">High Growth</Badge>
                              )}
                              {salesGrowth < -10 && (
                                <Badge variant="destructive" className="text-xs">Declining</Badge>
                              )}
                              {t.target_market_size && t.total_sales && (t.total_sales / t.target_market_size) < 0.3 && (
                                <Badge className="bg-blue-500 text-white text-xs">High Potential</Badge>
                              )}
                            </div>
                          )}

                          {/* Metrics */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Sales (Month)</div>
                              <div className="text-lg font-bold text-primary">₹{t.total_sales?.toFixed(2) || '0.00'}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Retailers</div>
                              <div className="text-lg font-bold">{t.total_retailers}</div>
                            </div>
                          </div>

                          {/* PIN Codes */}
                          {t.pincode_ranges && t.pincode_ranges.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">PIN Codes</div>
                              <div className="flex flex-wrap gap-1">
                                {t.pincode_ranges.slice(0, 3).map((pin, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">{pin}</Badge>
                                ))}
                                {t.pincode_ranges.length > 3 && (
                                  <Badge variant="outline" className="text-xs">+{t.pincode_ranges.length - 3}</Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Sub-territories */}
                          {(t.child_territories_count || 0) > 0 && (
                            <Badge variant="secondary" className="text-xs">{t.child_territories_count} Sub-territories</Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dashboard"><TerritoryDashboard /></TabsContent>

      <TerritoryDetailsModal 
        open={detailsModalOpen} 
        onOpenChange={setDetailsModalOpen} 
        territory={selectedTerritory}
        onEdit={handleEditTerritory}
        onDelete={(territory) => {
          setTerritoryToDelete(territory);
          setDeleteConfirmOpen(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Territory?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{territoryToDelete?.name}"? This will move the territory to the recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTerritoryToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTerritory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
};

export default TerritoriesManagement;
