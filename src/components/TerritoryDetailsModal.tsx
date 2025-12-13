import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Building, Navigation, TrendingUp, Users, ArrowUp, ArrowDown, AlertTriangle, Target, Calendar, Activity, Award, AlertCircle, ChevronRight, Pencil, Trash2, MapPin, FileText, Clock, User, HeartHandshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import TerritoryPerformanceReport from './TerritoryPerformanceReport';
import TerritorySupportRequestForm from './TerritorySupportRequestForm';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TerritoryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  territory: any;
  onEdit?: (territory: any) => void;
  onDelete?: (territory: any) => void;
}

const TerritoryDetailsModal: React.FC<TerritoryDetailsModalProps> = ({ open, onOpenChange, territory, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [pincodeSales, setPincodeSales] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, totalOrders: 0, totalRetailers: 0, totalVisits: 0 });
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [topSKUs, setTopSKUs] = useState<any[]>([]);
  const [bottomSKUs, setBottomSKUs] = useState<any[]>([]);
  const [topRetailers, setTopRetailers] = useState<any[]>([]);
  const [bottomRetailers, setBottomRetailers] = useState<any[]>([]);
  const [competitionData, setCompetitionData] = useState<any[]>([]);
  const [performanceFlag, setPerformanceFlag] = useState<string>('');
  const [parentTerritory, setParentTerritory] = useState<any>(null);
  const [grandparentTerritory, setGrandparentTerritory] = useState<any>(null);
  const [auditInfo, setAuditInfo] = useState<{ owner?: string; createdBy?: string; lastUpdatedBy?: string }>({});
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);

  const modalTitle = useMemo(() => territory ? `${territory.name}` : 'Territory Details', [territory]);

  useEffect(() => {
    if (open && territory) loadTerritoryData();
  }, [open, territory]);

  const loadTerritoryData = async () => {
    if (!territory) return;
    setLoading(true);
    
    try {
      // Load hierarchy
      if (territory.parent_id) {
        const { data: parentData } = await supabase.from('territories').select('id, name, parent_id').eq('id', territory.parent_id).single();
        setParentTerritory(parentData);
        
        if (parentData?.parent_id) {
          const { data: grandparentData } = await supabase.from('territories').select('id, name').eq('id', parentData.parent_id).single();
          setGrandparentTerritory(grandparentData);
        }
      }

      // Get distributors from assigned_distributor_ids array
      let distributorsData: any[] = [];
      if (territory.assigned_distributor_ids && territory.assigned_distributor_ids.length > 0) {
        const { data } = await supabase
          .from('distributors')
          .select('id, name, contact_person, phone, status, outstanding_amount')
          .in('id', territory.assigned_distributor_ids);
        distributorsData = data || [];
      }
      setDistributors(distributorsData);

      // Load assigned users
      let usersData: any[] = [];
      if (territory.assigned_user_ids && territory.assigned_user_ids.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', territory.assigned_user_ids);
        usersData = data || [];
      }
      setAssignedUsers(usersData);

      // Load competitors
      let competitorsData: any[] = [];
      if (territory.competitor_ids && territory.competitor_ids.length > 0) {
        const { data } = await supabase
          .from('competition_master')
          .select('id, competitor_name')
          .in('id', territory.competitor_ids);
        competitorsData = data || [];
      }
      setCompetitors(competitorsData);

      // Load audit info (owner, created_by, last_updated_by)
      const userIds = [territory.owner_id, territory.created_by, territory.last_updated_by].filter(Boolean);
      let auditUsers: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        if (profiles) {
          profiles.forEach(p => {
            auditUsers[p.id] = p.full_name || 'Unknown';
          });
        }
      }
      setAuditInfo({
        owner: territory.owner_id ? auditUsers[territory.owner_id] : undefined,
        createdBy: territory.created_by ? auditUsers[territory.created_by] : undefined,
        lastUpdatedBy: territory.last_updated_by ? auditUsers[territory.last_updated_by] : undefined,
      });

      // Load support requests for this territory
      const { data: supportData } = await supabase
        .from('support_requests')
        .select('*')
        .ilike('subject', `%${territory.name}%`)
        .eq('support_category', 'territory_support')
        .order('created_at', { ascending: false });
      setSupportRequests(supportData || []);

      const { data: retailersData } = await supabase.from('retailers').select('id, name, category, address, phone, last_visit_date, last_order_value, last_order_date').eq('territory_id', territory.id);
      const matchingRetailers = retailersData || [];
      setRetailers(matchingRetailers);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const retailerIds = matchingRetailers.map(r => r.id);
      
      // Get orders for current month
      const { data: ordersData } = await supabase.from('orders').select('id, total_amount, retailer_id, created_at, retailers(address, name)').in('retailer_id', retailerIds).gte('created_at', startOfMonth.toISOString());
      
      // Get visits count
      const { data: visitsData } = await supabase.from('visits').select('id').in('retailer_id', retailerIds).gte('created_at', startOfMonth.toISOString());

      setSalesSummary({
        totalSales: ordersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
        totalOrders: ordersData?.length || 0,
        totalRetailers: matchingRetailers.length,
        totalVisits: visitsData?.length || 0,
      });

      // Monthly sales data (last 6 months)
      const monthlyData: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = subMonths(new Date(), i);
        monthStart.setDate(1);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        
        const { data: monthOrders } = await supabase.from('orders').select('total_amount').in('retailer_id', retailerIds).gte('created_at', monthStart.toISOString()).lt('created_at', monthEnd.toISOString());
        
        monthlyData.push({
          month: format(monthStart, 'MMM'),
          sales: monthOrders?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
        });
      }
      setMonthlySales(monthlyData);

      // Calculate performance flag
      if (monthlyData.length >= 3) {
        const recent = monthlyData.slice(-3).reduce((sum, m) => sum + m.sales, 0) / 3;
        const previous = monthlyData.slice(0, 3).reduce((sum, m) => sum + m.sales, 0) / 3;
        const growth = ((recent - previous) / (previous || 1)) * 100;
        
        if (growth > 20) setPerformanceFlag('High Growth');
        else if (growth < -10) setPerformanceFlag('Declining');
        else if (matchingRetailers.length > 50 && growth < 5) setPerformanceFlag('High Potential');
        else setPerformanceFlag('Stable');
      }

      // Top/Bottom SKUs
      const { data: orderItemsData } = await supabase.from('order_items').select('product_name, quantity, total, order_id').in('order_id', ordersData?.map(o => o.id) || []);
      
      const skuMap = new Map();
      orderItemsData?.forEach(item => {
        const existing = skuMap.get(item.product_name) || { quantity: 0, total: 0 };
        skuMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          total: existing.total + item.total,
        });
      });
      
      const skuArray = Array.from(skuMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.total - a.total);
      setTopSKUs(skuArray.slice(0, 5));
      setBottomSKUs(skuArray.slice(-5).reverse());

      // Top/Bottom Retailers
      const retailerSalesMap = new Map();
      ordersData?.forEach(order => {
        const retailerName = order.retailers?.name || 'Unknown';
        const existing = retailerSalesMap.get(retailerName) || 0;
        retailerSalesMap.set(retailerName, existing + Number(order.total_amount || 0));
      });
      
      const retailerArray = Array.from(retailerSalesMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
      setTopRetailers(retailerArray.slice(0, 5));
      setBottomRetailers(retailerArray.slice(-5).reverse());

      // Competition data
      const { data: competitionEntries } = await supabase.from('competition_data').select('id, competitor_id, selling_price, stock_quantity, competition_master(competitor_name)').in('retailer_id', retailerIds).gte('created_at', startOfMonth.toISOString());
      
      const competitionMap = new Map();
      competitionEntries?.forEach(entry => {
        const name = entry.competition_master?.competitor_name || 'Unknown';
        const existing = competitionMap.get(name) || { count: 0, avgPrice: 0, totalStock: 0 };
        competitionMap.set(name, {
          count: existing.count + 1,
          avgPrice: existing.avgPrice + (entry.selling_price || 0),
          totalStock: existing.totalStock + (entry.stock_quantity || 0),
        });
      });
      
      const compArray = Array.from(competitionMap.entries()).map(([name, data]) => ({ 
        name, 
        entries: data.count,
        avgPrice: data.count > 0 ? (data.avgPrice / data.count).toFixed(2) : 0,
        totalStock: data.totalStock,
      })).sort((a, b) => b.entries - a.entries);
      setCompetitionData(compArray);

      const pincodeMap = new Map();
      territory.pincode_ranges?.forEach(pincode => {
        const pincodeOrders = ordersData?.filter(o => o.retailers?.address?.includes(pincode)) || [];
        const pincodeRetailers = matchingRetailers.filter(r => r.address?.includes(pincode));
        
        // Extract location name (text before the pincode)
        const sampleAddress = pincodeRetailers[0]?.address || '';
        const locationMatch = sampleAddress.match(new RegExp(`(.+?)\\s*${pincode}`));
        const locationName = locationMatch ? locationMatch[1].split(',').pop()?.trim() : '';
        
        pincodeMap.set(pincode, {
          sales: pincodeOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
          orders: pincodeOrders.length,
          retailers: pincodeRetailers.length,
          locationName,
        });
      });

      setPincodeSales(Array.from(pincodeMap.entries()).map(([pincode, data]) => ({ pincode, ...data })));
      
      // Get assignment history
      const { data: historyData } = await supabase.from('territory_assignment_history').select('*, profiles(full_name)').eq('territory_id', territory.id).order('assigned_from', { ascending: false });
      setAssignmentHistory(historyData || []);
    } catch (error) {
      console.error('Error loading territory data:', error);
    }
    
    setLoading(false);
  };

  const getPerformanceBadgeColor = () => {
    if (performanceFlag === 'High Growth') return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (performanceFlag === 'Declining') return 'bg-red-500/10 text-red-600 border-red-500/20';
    if (performanceFlag === 'High Potential') return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  };

  const getPerformanceIcon = () => {
    if (performanceFlag === 'High Growth') return <TrendingUp className="h-4 w-4" />;
    if (performanceFlag === 'Declining') return <ArrowDown className="h-4 w-4" />;
    if (performanceFlag === 'High Potential') return <Target className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600">Open</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!territory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 py-4">
          <DialogHeader className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -right-2 -top-2 h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <span className="sr-only">Close</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
            <DialogTitle className="text-lg sm:text-xl pr-8">{modalTitle}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">View territory details, analytics, and support requests</DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading territory data...</div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
            {/* Hierarchy Display */}
            {(grandparentTerritory || parentTerritory) && (
              <Card className="shadow-lg bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    {grandparentTerritory && (
                      <>
                        <span className="font-medium truncate max-w-[100px] sm:max-w-none">{grandparentTerritory.name}</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      </>
                    )}
                    {parentTerritory && (
                      <>
                        <span className="font-medium truncate max-w-[100px] sm:max-w-none">{parentTerritory.name}</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      </>
                    )}
                    <span className="font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{territory.name}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons & Performance Flag */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                {onEdit && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => onEdit(territory), 100);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onDelete(territory)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
              {performanceFlag && (
                <Badge className={`${getPerformanceBadgeColor()} px-3 py-2 gap-2 justify-center sm:justify-start flex-1 sm:flex-initial`}>
                  {getPerformanceIcon()}
                  <span className="text-xs sm:text-sm font-medium">{performanceFlag}</span>
                </Badge>
              )}
              <div className="flex-1 sm:ml-auto">
                <TerritorySupportRequestForm territoryId={territory.id} territoryName={territory.name} />
              </div>
            </div>

            {/* TERRITORY DETAILS SECTION - Shows all saved fields */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Territory Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium text-sm">{territory.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Region</p>
                    <p className="font-medium text-sm">{territory.region || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Territory Type</p>
                    <p className="font-medium text-sm">{territory.territory_type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parent Territory</p>
                    <p className="font-medium text-sm">{parentTerritory?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Population</p>
                    <p className="font-medium text-sm">{territory.population?.toLocaleString() || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target Market Size</p>
                    <p className="font-medium text-sm">{territory.target_market_size ? `₹${territory.target_market_size.toLocaleString()}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground"># of Retailers</p>
                    <p className="font-medium text-sm">{territory.retailer_count || salesSummary.totalRetailers}</p>
                  </div>
                  {auditInfo.owner && (
                    <div>
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="font-medium text-sm">{auditInfo.owner}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">PIN Codes</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {territory.pincode_ranges?.length > 0 ? (
                        territory.pincode_ranges.map((pin: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">{pin}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                  {assignedUsers.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Assigned Users</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {assignedUsers.map((user) => (
                          <Badge key={user.id} variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {user.full_name || user.username}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {distributors.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Assigned Distributors</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {distributors.map((d) => (
                          <Badge 
                            key={d.id} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/distributor/${d.id}`);
                            }}
                          >
                            <Building className="h-3 w-3 mr-1" />
                            {d.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {competitors.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Key Competitors</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {competitors.map((c) => (
                          <Badge key={c.id} variant="outline" className="text-xs bg-red-500/10 text-red-600">
                            {c.competitor_name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {territory.description && (
                    <div className="col-span-full">
                      <p className="text-xs text-muted-foreground">Description</p>
                      <p className="font-medium text-sm">{territory.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Audit Info */}
            <Card className="shadow-lg bg-muted/30">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Created
                    </p>
                    <p className="font-medium">{territory.created_at ? format(new Date(territory.created_at), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                    {auditInfo.createdBy && <p className="text-xs text-muted-foreground">by {auditInfo.createdBy}</p>}
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Last Updated
                    </p>
                    <p className="font-medium">{territory.updated_at ? format(new Date(territory.updated_at), 'dd MMM yyyy, hh:mm a') : '-'}</p>
                    {auditInfo.lastUpdatedBy && <p className="text-xs text-muted-foreground">by {auditInfo.lastUpdatedBy}</p>}
                  </div>
                  {auditInfo.owner && (
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Owner
                      </p>
                      <p className="font-medium">{auditInfo.owner}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Snapshot with Growth/Decline */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card className="shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">Total Sales</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 truncate">₹{salesSummary.totalSales.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">Orders</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{salesSummary.totalOrders}</p>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">Retailers</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">{salesSummary.totalRetailers}</p>
                </CardContent>
              </Card>

              <Card className="shadow-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">Visits</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-orange-600">{salesSummary.totalVisits}</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Sales Chart */}
            {monthlySales.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Monthly Sales Trend</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                  <div className="w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height={200} minWidth={300}>
                      <LineChart data={monthlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SUPPORT REQUESTS SECTION */}
            <Card className="shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-primary" />
                  Support Requests ({supportRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                {supportRequests.length > 0 ? (
                  <div className="space-y-3">
                    {supportRequests.map((request) => (
                      <div key={request.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{request.subject}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{format(new Date(request.created_at), 'dd MMM yyyy')}</span>
                          {request.resolved_at && (
                            <span className="text-green-600">Resolved: {format(new Date(request.resolved_at), 'dd MMM yyyy')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No support requests for this territory</p>
                )}
              </CardContent>
            </Card>

            {/* Top & Bottom SKUs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    Top 5 SKUs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {topSKUs.length > 0 ? (
                    <div className="space-y-2">
                      {topSKUs.map((sku, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-green-500/5 rounded border border-green-500/10">
                          <span className="text-xs sm:text-sm font-medium truncate flex-1 mr-2">{sku.name}</span>
                          <span className="text-xs sm:text-sm text-green-600 font-bold whitespace-nowrap">₹{sku.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No SKU data available</p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Bottom 5 SKUs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {bottomSKUs.length > 0 ? (
                    <div className="space-y-2">
                      {bottomSKUs.map((sku, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-red-500/5 rounded border border-red-500/10">
                          <span className="text-xs sm:text-sm font-medium truncate flex-1 mr-2">{sku.name}</span>
                          <span className="text-xs sm:text-sm text-red-600 font-bold whitespace-nowrap">₹{sku.total.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No SKU data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top & Bottom Retailers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    Top 5 Retailers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {topRetailers.length > 0 ? (
                    <div className="space-y-2">
                      {topRetailers.map((retailer, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-blue-500/5 rounded border border-blue-500/10">
                          <span className="text-xs sm:text-sm font-medium truncate flex-1 mr-2">{retailer.name}</span>
                          <span className="text-xs sm:text-sm text-blue-600 font-bold whitespace-nowrap">₹{retailer.sales.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No retailer data available</p>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Bottom 5 Retailers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {bottomRetailers.length > 0 ? (
                    <div className="space-y-2">
                      {bottomRetailers.map((retailer, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-orange-500/5 rounded border border-orange-500/10">
                          <span className="text-xs sm:text-sm font-medium truncate flex-1 mr-2">{retailer.name}</span>
                          <span className="text-xs sm:text-sm text-orange-600 font-bold whitespace-nowrap">₹{retailer.sales.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No retailer data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Competition Activity */}
            {competitionData.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-red-600" />
                    Competition Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Competitor</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Entries</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Avg Price</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitionData.map((comp, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{comp.name}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">
                              <Badge variant="outline">{comp.entries}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">₹{comp.avgPrice}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">{comp.totalStock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sales by PIN Code */}
            {pincodeSales.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Sales by PIN Code & Location</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">PIN Code</TableHead>
                          <TableHead className="text-xs sm:text-sm">Location</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Sales</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Orders</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm hidden sm:table-cell">Retailers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pincodeSales.map(d => (
                          <TableRow key={d.pincode}>
                            <TableCell><Badge className="text-xs">{d.pincode}</Badge></TableCell>
                            <TableCell className="text-xs sm:text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-none">{d.locationName || '-'}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-medium whitespace-nowrap">₹{d.sales.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">{d.orders}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">{d.retailers}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs Section */}
            <Tabs defaultValue="retailers" className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
                <TabsTrigger value="retailers" className="text-xs sm:text-sm px-2 py-2">
                  Retailers <span className="ml-1">({retailers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="distributors" className="text-xs sm:text-sm px-2 py-2">
                  Distributors <span className="ml-1">({distributors.length})</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm px-2 py-2">History</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs sm:text-sm px-2 py-2">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="retailers" className="mt-4">
                <Card className="shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Name</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Category</TableHead>
                            <TableHead className="text-xs sm:text-sm">Last Order</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Last Visit</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Phone</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {retailers.map(r => (
                            <TableRow 
                              key={r.id} 
                              className="cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => navigate(`/retailer/${r.id}`)}
                            >
                              <TableCell className="text-xs sm:text-sm font-medium text-primary hover:underline">{r.name}</TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline" className="text-xs">{r.category || '-'}</Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {r.last_order_value ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-green-600">₹{Number(r.last_order_value).toLocaleString()}</span>
                                    <span className="text-[10px] text-muted-foreground">{r.last_order_date ? format(new Date(r.last_order_date), 'dd MMM') : '-'}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm text-muted-foreground hidden md:table-cell">
                                {r.last_visit_date ? format(new Date(r.last_visit_date), 'dd MMM yyyy') : '-'}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm text-muted-foreground hidden lg:table-cell">{r.phone || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distributors" className="mt-4">
                <Card className="shadow-lg">
                  <CardContent className="p-3 sm:p-4">
                    {distributors.length > 0 ? (
                      <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Name</TableHead>
                              <TableHead className="text-xs sm:text-sm">Contact Person</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Phone</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden md:table-cell">Status</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Outstanding</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {distributors.map(d => (
                              <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <TableCell className="text-xs sm:text-sm font-medium text-primary hover:underline">{d.name}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{d.contact_person}</TableCell>
                                <TableCell className="text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">{d.phone || '-'}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant={d.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                    {d.status || 'active'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm font-medium text-orange-600 hidden lg:table-cell">
                                  {d.outstanding_amount ? `₹${Number(d.outstanding_amount).toLocaleString()}` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No distributors assigned</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <Card className="shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Territory Assignment History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {assignmentHistory.length > 0 ? (
                      <div className="overflow-x-auto -mx-3 sm:mx-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Team Member</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">From</TableHead>
                              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">To</TableHead>
                              <TableHead className="text-xs sm:text-sm">Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignmentHistory.filter(a => a && a.id).map((assignment) => (
                              <TableRow key={assignment.id}>
                                <TableCell className="text-xs sm:text-sm font-medium">{assignment.profiles?.full_name || 'Unknown'}</TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{format(new Date(assignment.assigned_from), 'MMM dd, yyyy')}</TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {assignment.assigned_to 
                                    ? <span className="text-xs sm:text-sm">{format(new Date(assignment.assigned_to), 'MMM dd, yyyy')}</span>
                                    : <Badge variant="secondary" className="text-xs">Current</Badge>
                                  }
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm text-muted-foreground">
                                  {assignment.assigned_to 
                                    ? `${Math.ceil((new Date(assignment.assigned_to).getTime() - new Date(assignment.assigned_from).getTime()) / (1000 * 60 * 60 * 24))} days`
                                    : 'Ongoing'
                                  }
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">No assignment history available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="mt-4">
                {territory ? (
                  <TerritoryPerformanceReport territoryId={territory.id} territoryName={territory.name} />
                ) : (
                  <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">No territory selected</div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TerritoryDetailsModal;