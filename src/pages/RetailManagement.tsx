import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { Search, CheckCircle2, XCircle, ArrowLeft, Camera, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CameraCapture } from "@/components/CameraCapture";

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  category: string | null;
  beat_id: string;
  beat_name: string | null;
  photo_url: string | null;
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
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
      // Fetch user profiles and beat names to display correctly
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const [profilesRes, beatsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", userIds),
        supabase
          .from("beats")
          .select("beat_id, beat_name")
      ]);
      
      const profiles = profilesRes.data;
      const beats = beatsRes.data;
      
      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, { full_name: p.full_name, username: p.username }])
      );
      const beatMap = new Map((beats || []).map((b: any) => [b.beat_id, b.beat_name]));
      
      const retailersWithProfiles = (data || []).map((r: any) => {
        const prof = r.user_id ? profileMap.get(r.user_id) : null;
        const displayName = prof?.full_name || prof?.username || 'Unknown';
        const displayBeatName = r.beat_name || (r.beat_id ? beatMap.get(r.beat_id) : null) || r.beat_id;
        return {
          ...r,
          beat_name: displayBeatName,
          profiles: r.user_id ? { full_name: displayName } : null
        };
      });
      
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

  const handlePhotoCapture = async (blob: Blob) => {
    if (!selectedRetailer) return;
    
    setUploadingPhoto(true);
    try {
      const fileName = `${selectedRetailer.id}/store_${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('retailer-photos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('retailer-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('retailers')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', selectedRetailer.id);

      if (updateError) throw updateError;

      toast({ 
        title: "Photo Uploaded",
        description: "Retailer photo has been uploaded successfully."
      });
      
      setCameraOpen(false);
      setPhotoDialogOpen(false);
      loadRetailers();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        title: "Upload Failed",
        description: error.message || "Failed to upload photo.",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openPhotoDialog = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setPhotoDialogOpen(true);
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
                      <TableHead>Photo</TableHead>
                      <TableHead>Retailer Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Beat Name</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRetailers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No retailers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRetailers.map((retailer) => (
                        <TableRow key={retailer.id}>
                          <TableCell>
                            <Avatar 
                              className="w-10 h-10 cursor-pointer"
                              onClick={() => openPhotoDialog(retailer)}
                            >
                              <AvatarImage src={retailer.photo_url || undefined} />
                              <AvatarFallback>
                                <ImageIcon className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
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
                            <Badge variant="outline">{retailer.beat_name || retailer.beat_id}</Badge>
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

      {/* Photo Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retailer Photo</DialogTitle>
            <DialogDescription>
              {selectedRetailer?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRetailer?.photo_url ? (
              <div className="space-y-4">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                  <img 
                    src={selectedRetailer.photo_url} 
                    alt={selectedRetailer.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button 
                  onClick={() => setCameraOpen(true)}
                  className="w-full"
                  disabled={uploadingPhoto}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : 'Update Photo'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full aspect-video rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                    <p>No photo available</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setCameraOpen(true)}
                  className="w-full"
                  disabled={uploadingPhoto}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : 'Capture Photo'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Capture */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoCapture}
        title="Capture Retailer Photo"
        description="Take a clear photo of the retailer's store front"
      />
    </Layout>
  );
}
