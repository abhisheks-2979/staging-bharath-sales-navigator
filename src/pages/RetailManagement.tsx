import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { Search, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  beat_id: string;
  verified: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  } | null;
}

export default function RetailManagement() {
  const { userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');

  useEffect(() => {
    document.title = "Retail Management | Admin Panel";
  }, []);

  const loadRetailers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("retailers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ 
        title: "Failed to load retailers", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      const retailersWithProfiles = (data || []).map(r => ({
        ...r,
        profiles: r.user_id ? { full_name: profileMap.get(r.user_id) || 'Unknown' } : null
      }));
      
      setRetailers(retailersWithProfiles as Retailer[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userRole === 'admin') {
      loadRetailers();
    }
  }, [userRole]);

  const toggleVerification = async (retailer: Retailer) => {
    const newVerifiedStatus = !retailer.verified;
    
    const { error } = await supabase
      .from("retailers")
      .update({ verified: newVerifiedStatus })
      .eq("id", retailer.id);

    if (error) {
      toast({ 
        title: "Failed to update verification", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: newVerifiedStatus ? "Retailer Verified" : "Verification Removed",
        description: `${retailer.name} has been ${newVerifiedStatus ? 'verified' : 'unverified'}.`
      });
      loadRetailers();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredRetailers = retailers.filter(r => {
    const matchesSearch = !search || 
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.phone || '').includes(search) ||
      r.address.toLowerCase().includes(search.toLowerCase()) ||
      (r.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesVerified = verifiedFilter === 'all' || 
      (verifiedFilter === 'verified' && r.verified) ||
      (verifiedFilter === 'unverified' && !r.verified);
    
    return matchesSearch && matchesVerified;
  });

  const stats = {
    total: retailers.length,
    verified: retailers.filter(r => r.verified).length,
    unverified: retailers.filter(r => !r.verified).length,
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/admin-controls')} 
            variant="ghost" 
            size="sm"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Retail Management</h1>
            <p className="text-muted-foreground">Verify and manage all retailers across the system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Retailers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.unverified}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Retailers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input 
                  placeholder="Search by name, phone, address, or user..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  className="pl-9" 
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={verifiedFilter === 'all' ? 'default' : 'outline'} 
                  onClick={() => setVerifiedFilter('all')}
                  size="sm"
                >
                  All
                </Button>
                <Button 
                  variant={verifiedFilter === 'verified' ? 'default' : 'outline'} 
                  onClick={() => setVerifiedFilter('verified')}
                  size="sm"
                >
                  Verified
                </Button>
                <Button 
                  variant={verifiedFilter === 'unverified' ? 'default' : 'outline'} 
                  onClick={() => setVerifiedFilter('unverified')}
                  size="sm"
                >
                  Unverified
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Retailer Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Beat</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRetailers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No retailers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRetailers.map((retailer) => (
                        <TableRow key={retailer.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {retailer.name}
                              {retailer.verified && (
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{retailer.phone || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">{retailer.address}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{retailer.beat_id}</Badge>
                          </TableCell>
                          <TableCell>{retailer.profiles?.full_name || 'Unknown'}</TableCell>
                          <TableCell>
                            {retailer.verified ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={retailer.verified ? "outline" : "default"}
                              size="sm"
                              onClick={() => toggleVerification(retailer)}
                            >
                              {retailer.verified ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Unverify
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Verify
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
