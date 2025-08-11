import { useState, useEffect } from "react";
import { Plus, Users, MapPin, Calendar, BarChart, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/SearchInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Layout } from "@/components/Layout";
import { RetailerAnalytics } from "@/components/RetailerAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

interface Beat {
  id: string;
  beat_number: number;
  name: string;
  retailer_count: number;
  total_retailers: number;
  last_visited?: string;
  created_at: string;
  category?: string;
  priority?: string;
}

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone: string; // Required for compatibility with RetailerAnalytics
  category?: string;
  beat_id?: string;
  type: string; // Required for compatibility with RetailerAnalytics
  isSelected: boolean; // Required for compatibility with RetailerAnalytics
  currentBeat?: string; // Current beat display name
  isUnassigned?: boolean; // Whether retailer is unassigned
  canBeReassigned?: boolean; // Whether retailer can be reassigned
  metrics: {
    avgOrders3Months: number;
    avgOrderPerVisit: number;
    visitsIn3Months: number;
  };
}

export const MyBeats = () => {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [allRetailers, setAllRetailers] = useState<Retailer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateBeatOpen, setIsCreateBeatOpen] = useState(false);
  const [beatName, setBeatName] = useState("");
  const [selectedRetailers, setSelectedRetailers] = useState<Set<string>>(new Set());
  const [selectedAnalyticsRetailer, setSelectedAnalyticsRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for openCreateModal parameter and open modal if present
  useEffect(() => {
    if (searchParams.get('openCreateModal') === 'true') {
      setIsCreateBeatOpen(true);
      // Remove the parameter from URL after opening modal
      searchParams.delete('openCreateModal');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      loadBeats();
      loadAllRetailers();
    }
  }, [user]);

  // Set up real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('beats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'retailers',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Retailer updated, reloading beats:', payload);
          // Reload beats and retailers when any retailer is updated
          loadBeats();
          loadAllRetailers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beat_plans',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Beat plan updated, reloading beats:', payload);
          // Reload when beat plans are updated
          loadBeats();
          loadAllRetailers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadBeats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Get retailers with beat info
      const { data: retailersData, error: retailersError } = await supabase
        .from('retailers')
        .select('beat_id, beat_name, category, created_at')
        .eq('user_id', user.id)
        .not('beat_id', 'is', null)
        .neq('beat_id', '')
        .neq('beat_id', 'unassigned');

      if (retailersError) {
        console.error('Error fetching retailers:', retailersError);
        throw retailersError;
      }

      // Get beat plans to get proper beat names
      const { data: beatPlansData, error: beatPlansError } = await supabase
        .from('beat_plans')
        .select('beat_id, beat_name, created_at, beat_data')
        .eq('user_id', user.id);

      if (beatPlansError) {
        console.error('Error fetching beat plans:', beatPlansError);
      }

      // Create a map of beat_id to beat info from beat_plans
      const beatPlansMap = new Map<string, any>();
      (beatPlansData || []).forEach((plan: any) => {
        beatPlansMap.set(plan.beat_id, {
          name: plan.beat_name,
          created_at: plan.created_at,
          beat_data: plan.beat_data
        });
      });

      console.log('Raw retailers data:', retailersData);
      console.log('Beat plans data:', beatPlansData);

      // Group by beat_id and calculate counts
      const beatMap = new Map<string, any>();
      
      (retailersData || []).forEach((item) => {
        const beatId = item.beat_id;
        const planInfo = beatPlansMap.get(beatId);
        
        // Use beat name from beat_plans if available, otherwise use retailer beat_name, otherwise use beat_id
        const beatName = planInfo?.name || item.beat_name || beatId;
        
        // Get category from beat_data if available
        let category = item.category || 'General';
        if (planInfo?.beat_data) {
          try {
            const beatDataParsed = typeof planInfo.beat_data === 'string' 
              ? JSON.parse(planInfo.beat_data) 
              : planInfo.beat_data;
            category = beatDataParsed.category || category;
          } catch (e) {
            console.log('Could not parse beat_data:', e);
          }
        }
        
        if (!beatMap.has(beatId)) {
          beatMap.set(beatId, {
            id: beatId,
            name: beatName,
            retailer_count: 0,
            category: category,
            created_at: planInfo?.created_at || item.created_at,
            retailers: []
          });
        }
        
        beatMap.get(beatId).retailer_count += 1;
      });

      // Convert to array and add beat numbers
      const beatsArray = Array.from(beatMap.values())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((beat, index) => ({
          ...beat,
          beat_number: index + 1,
          total_retailers: beat.retailer_count
        }));

      console.log('Processed beats array:', beatsArray);
      setBeats(beatsArray);
    } catch (error) {
      console.error('Error loading beats:', error);
      toast.error('Failed to load beats');
    } finally {
      setLoading(false);
    }
  };

  const loadAllRetailers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const retailersWithMetrics = (data || []).map(retailer => ({
        id: retailer.id,
        name: retailer.name,
        address: retailer.address,
        phone: retailer.phone || 'N/A', // Ensure phone is always a string
        category: retailer.category,
        type: retailer.retail_type || 'General Store', // Add type field
        beat_id: retailer.beat_id,
        isSelected: false,
        metrics: {
          avgOrders3Months: Math.floor(Math.random() * 20) + 5,
          avgOrderPerVisit: Math.floor(Math.random() * 5000) + 1000,
          visitsIn3Months: Math.floor(Math.random() * 12) + 3
        }
      }));

      setAllRetailers(retailersWithMetrics);
      
      // If the create beat modal is open, refresh its retailer list
      if (isCreateBeatOpen) {
        setTimeout(() => loadRetailersForCreateBeat(), 100);
      }
    } catch (error) {
      console.error('Error loading retailers:', error);
      toast.error('Failed to load retailers');
    }
  };

  const loadRetailersForCreateBeat = () => {
    console.log('Loading retailers for create beat. All retailers:', allRetailers.length);
    
    // If allRetailers is empty, we need to wait for the data to load
    if (allRetailers.length === 0) {
      console.log('No retailers loaded yet, retailers will be populated when data loads');
      setRetailers([]);
      return;
    }
    
    // Show ALL retailers with their current beat status
    const retailersForBeat = allRetailers.map(retailer => {
      const currentBeatId = retailer.beat_id;
      let beatDisplayName = 'Unassigned';
      
      // If retailer has a beat_id, try to find the beat name
      if (currentBeatId && currentBeatId !== 'unassigned' && currentBeatId !== '') {
        const beat = beats.find(b => b.id === currentBeatId);
        beatDisplayName = beat ? beat.name : currentBeatId;
      }
      
      const isUnassigned = !currentBeatId || currentBeatId === 'unassigned' || currentBeatId === '';
      
      console.log(`Retailer ${retailer.name}: beat_id=${currentBeatId}, beatName=${beatDisplayName}, isUnassigned=${isUnassigned}`);
      
      return {
        ...retailer,
        isSelected: false,
        currentBeat: beatDisplayName,
        isUnassigned: isUnassigned,
        canBeReassigned: true // Allow all retailers to be reassigned to new beats
      };
    });
    
    console.log('All retailers for beat creation:', retailersForBeat.length);
    setRetailers(retailersForBeat);
    setSelectedRetailers(new Set());
  };

  const handleCreateBeat = async () => {
    // First, ensure we have the latest retailers data
    await loadAllRetailers();
    // Then load retailers for the modal (this will use the fresh data)
    loadRetailersForCreateBeat();
    setIsCreateBeatOpen(true);
    setBeatName("");
  };

  const handleRetailerSelection = (retailerId: string) => {
    const newSelectedRetailers = new Set(selectedRetailers);
    if (newSelectedRetailers.has(retailerId)) {
      newSelectedRetailers.delete(retailerId);
    } else {
      newSelectedRetailers.add(retailerId);
    }
    setSelectedRetailers(newSelectedRetailers);

    // Update retailers list to reflect selection
    setRetailers(retailers.map(retailer => ({
      ...retailer,
      isSelected: newSelectedRetailers.has(retailer.id)
    })));
  };

  const handleSaveBeat = async () => {
    if (!beatName.trim()) {
      toast.error('Please enter a beat name');
      return;
    }

    if (selectedRetailers.size === 0) {
      toast.error('Please select at least one retailer');
      return;
    }

    if (!user) return;

    try {
      // Generate unique beat ID
      const beatId = `beat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Update selected retailers with beat information
      const { error } = await supabase
        .from('retailers')
        .update({ 
          beat_id: beatId,
          beat_name: beatName.trim()
        })
        .in('id', Array.from(selectedRetailers));

      if (error) throw error;

      toast.success(`Beat "${beatName}" created successfully with ${selectedRetailers.size} retailers`);
      setIsCreateBeatOpen(false);
      setBeatName("");
      setSelectedRetailers(new Set());
      
      // Reload data
      loadBeats();
      loadAllRetailers();
    } catch (error) {
      console.error('Error creating beat:', error);
      toast.error('Failed to create beat');
    }
  };

  const handleAddBeats = () => {
    navigate('/add-beat');
  };

  const filteredRetailers = retailers.filter(retailer =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.phone.includes(searchTerm)
  );

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header Section */}
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">My Beats</CardTitle>
                <p className="text-primary-foreground/80">Manage your sales territories and routes</p>
              </div>
              <Button 
                onClick={handleCreateBeat}
                variant="secondary"
                className="flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                <Plus className="h-4 w-4" />
                Create New Beat
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{beats.length}</div>
              <div className="text-sm text-muted-foreground">Total Beats</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {beats.reduce((sum, beat) => sum + beat.retailer_count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Retailers</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {allRetailers.filter(r => !r.beat_id || r.beat_id === 'unassigned').length}
              </div>
              <div className="text-sm text-muted-foreground">Unassigned</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {beats.length > 0 ? Math.round(beats.reduce((sum, beat) => sum + beat.retailer_count, 0) / beats.length) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Avg per Beat</div>
            </CardContent>
          </Card>
        </div>

        {/* Beats Grid */}
        {beats.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <Users className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No beats created yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first beat to organize your retailers into manageable routes</p>
                </div>
                <Button onClick={handleCreateBeat} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Beat
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold">Your Beats ({beats.length})</h2>
              <Button 
                onClick={handleAddBeats}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Add Beats to Plan
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beats.map((beat) => (
                <Card key={beat.id} className="hover:shadow-lg transition-all duration-200 hover:scale-105">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-xs font-semibold">
                            Beat #{beat.beat_number}
                          </Badge>
                          {beat.category && (
                            <Badge variant="outline" className="text-xs">
                              {beat.category}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">{beat.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Beat Stats */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{beat.retailer_count}</span>
                        <span className="text-muted-foreground">retailers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-muted-foreground text-xs">
                          {beat.last_visited 
                            ? new Date(beat.last_visited).toLocaleDateString()
                            : 'Not visited'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Beat Actions */}
                    <div className="flex flex-col gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => navigate(`/beat/${beat.id}`)}
                      >
                        <BarChart className="h-4 w-4" />
                        View Beat Details
                      </Button>
                    </div>
                    
                    {/* Creation Date */}
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Created: {new Date(beat.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Create Beat Modal */}
        <Dialog open={isCreateBeatOpen} onOpenChange={setIsCreateBeatOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Beat
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="beatName">Beat Name</Label>
                <Input
                  id="beatName"
                  placeholder="Enter beat name"
                  value={beatName}
                  onChange={(e) => setBeatName(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Select Retailers</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose retailers to include in this beat ({selectedRetailers.size} selected)
                    </p>
                  </div>
                </div>

                <SearchInput
                  placeholder="Search retailers by name, address, or phone"
                  value={searchTerm}
                  onChange={setSearchTerm}
                />

                {filteredRetailers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {allRetailers.length === 0 
                      ? "No retailers found. Please add some retailers first."
                      : searchTerm 
                        ? "No retailers found matching your search"
                        : "No retailers available"
                    }
                  </div>
                ) : (
                  <div className="grid gap-4 max-h-64 overflow-y-auto">
                    {filteredRetailers.map((retailer) => (
                      <Card 
                        key={retailer.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          retailer.isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                        }`}
                        onClick={() => handleRetailerSelection(retailer.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={retailer.isSelected}
                                onChange={() => handleRetailerSelection(retailer.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium truncate">{retailer.name}</h4>
                                  {retailer.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {retailer.category}
                                    </Badge>
                                  )}
                                  {/* Current Beat Status */}
                                  <Badge 
                                    variant={retailer.isUnassigned ? "default" : "secondary"} 
                                    className={`text-xs ${
                                      retailer.isUnassigned 
                                        ? "bg-green-100 text-green-800 border-green-200" 
                                        : "bg-orange-100 text-orange-800 border-orange-200"
                                    }`}
                                  >
                                    {retailer.currentBeat || 'Unassigned'}
                                  </Badge>
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{retailer.address}</span>
                                  </div>
                                   <div>📞 {retailer.phone}</div>
                                   {!retailer.isUnassigned && (
                                     <div className="text-xs text-orange-600 font-medium">
                                       ⚠️ Currently assigned to "{retailer.currentBeat}" - will be reassigned
                                     </div>
                                   )}
                                   {retailer.metrics && (
                                     <div className="text-xs">
                                       Avg Orders (3M): {retailer.metrics.avgOrders3Months} | 
                                       Avg Order Value: ₹{retailer.metrics.avgOrderPerVisit.toLocaleString()}
                                     </div>
                                   )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnalyticsRetailer(retailer);
                              }}
                            >
                              <BarChart className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateBeatOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveBeat} disabled={selectedRetailers.size === 0 || !beatName.trim()}>
                  Create Beat ({selectedRetailers.size} retailers)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Retailer Analytics Modal */}
        {selectedAnalyticsRetailer && (
          <RetailerAnalytics
            retailer={selectedAnalyticsRetailer}
            onClose={() => setSelectedAnalyticsRetailer(null)}
          />
        )}
      </div>
    </Layout>
  );
};