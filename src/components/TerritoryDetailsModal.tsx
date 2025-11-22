import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Building, Navigation, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import TerritoryPerformanceReport from './TerritoryPerformanceReport';

interface TerritoryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  territory: any;
  onEdit?: (territory: any) => void;
}

const TerritoryDetailsModal: React.FC<TerritoryDetailsModalProps> = ({ open, onOpenChange, territory, onEdit }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [pincodeSales, setPincodeSales] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState({ totalSales: 0, totalOrders: 0, totalRetailers: 0 });
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([]);

  const modalTitle = useMemo(() => territory ? `${territory.name} - Territory Details` : 'Territory Details', [territory]);

  useEffect(() => {
    if (open && territory) loadTerritoryData();
  }, [open, territory]);

  const loadTerritoryData = async () => {
    if (!territory) return;
    setLoading(true);
    
    const { data: distributorsData } = await supabase.from('distributors').select('id, name, contact_person').eq('territory_id', territory.id);
    setDistributors(distributorsData || []);

    const { data: retailersData } = await supabase.from('retailers').select('id, name, category, address');
    const matchingRetailers = retailersData?.filter(r => territory.pincode_ranges?.some(p => r.address?.includes(p))) || [];
    setRetailers(matchingRetailers);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const retailerIds = matchingRetailers.map(r => r.id);
    const { data: ordersData } = await supabase.from('orders').select('total_amount, retailer_id, retailers(address)').in('retailer_id', retailerIds).gte('created_at', startOfMonth.toISOString());

    setSalesSummary({
      totalSales: ordersData?.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) || 0,
      totalOrders: ordersData?.length || 0,
      totalRetailers: matchingRetailers.length,
    });

    const pincodeMap = new Map();
    territory.pincode_ranges?.forEach(pincode => {
      const pincodeOrders = ordersData?.filter(o => o.retailers?.address?.includes(pincode)) || [];
      const pincodeRetailers = matchingRetailers.filter(r => r.address?.includes(pincode));
      pincodeMap.set(pincode, {
        sales: pincodeOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        orders: pincodeOrders.length,
        retailers: pincodeRetailers.length,
      });
    });

    setPincodeSales(Array.from(pincodeMap.entries()).map(([pincode, data]) => ({ pincode, ...data })));
    
    // Get assignment history
    const { data: historyData } = await supabase
      .from('territory_assignment_history')
      .select('*, profiles(full_name)')
      .eq('territory_id', territory.id)
      .order('assigned_from', { ascending: false });
    setAssignmentHistory(historyData || []);
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>Comprehensive territory details and sales data</DialogDescription>
        </DialogHeader>

        {loading ? <div className="flex items-center justify-center py-12">Loading...</div> : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Sales</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">₹{salesSummary.totalSales.toFixed(2)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{salesSummary.totalOrders}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Retailers</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{salesSummary.totalRetailers}</div></CardContent></Card>
            </div>

            {pincodeSales.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Sales by PIN Code</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>PIN Code</TableHead><TableHead className="text-right">Sales</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Retailers</TableHead></TableRow></TableHeader>
                    <TableBody>{pincodeSales.map(d => <TableRow key={d.pincode}><TableCell><Badge>{d.pincode}</Badge></TableCell><TableCell className="text-right">₹{d.sales.toFixed(2)}</TableCell><TableCell className="text-right">{d.orders}</TableCell><TableCell className="text-right">{d.retailers}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="retailers">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="retailers" className="text-xs sm:text-sm">Retailers ({retailers.length})</TabsTrigger>
                <TabsTrigger value="distributors" className="text-xs sm:text-sm">Distributors ({distributors.length})</TabsTrigger>
                <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
              </TabsList>
              <TabsContent value="retailers">
                <Card><CardContent className="pt-6">
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Address</TableHead></TableRow></TableHeader>
                    <TableBody>{retailers.map(r => <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell><Badge variant="outline">{r.category}</Badge></TableCell><TableCell className="text-sm truncate max-w-md">{r.address}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="distributors">
                <Card><CardContent className="pt-6">
                  {distributors.length > 0 ? (
                    distributors.map(d => <div key={d.id} className="flex justify-between p-3 border rounded mb-2"><span className="font-medium">{d.name}</span><Badge variant="outline">{d.contact_person}</Badge></div>)
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No distributors assigned</p>
                  )}
                </CardContent></Card>
              </TabsContent>
              
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Territory Assignment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {assignmentHistory.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Team Member</TableHead>
                            <TableHead>Assigned From</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignmentHistory.map((assignment) => (
                            <TableRow key={assignment.id}>
                              <TableCell className="font-medium">{assignment.profiles?.full_name || 'Unknown'}</TableCell>
                              <TableCell>{format(new Date(assignment.assigned_from), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                {assignment.assigned_to 
                                  ? format(new Date(assignment.assigned_to), 'MMM dd, yyyy')
                                  : <Badge variant="secondary">Current</Badge>
                                }
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {assignment.assigned_to 
                                  ? `${Math.ceil((new Date(assignment.assigned_to).getTime() - new Date(assignment.assigned_from).getTime()) / (1000 * 60 * 60 * 24))} days`
                                  : 'Ongoing'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No assignment history available</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance">
                {territory ? (
                  <TerritoryPerformanceReport territoryId={territory.id} territoryName={territory.name} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No territory selected</div>
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
