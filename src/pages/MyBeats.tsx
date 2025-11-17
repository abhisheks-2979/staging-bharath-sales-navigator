import { useState, useEffect } from "react";
import { Plus, Users, MapPin, Calendar, BarChart, Edit2, Trash2, Clock, Truck, Sparkles, CalendarDays, Repeat, ChevronDown } from "lucide-react";
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
import { EditBeatModal } from "@/components/EditBeatModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRecommendations } from "@/hooks/useRecommendations";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { AddRetailerInlineToBeat } from "@/components/AddRetailerInlineToBeat";

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
  travel_allowance?: number;
  average_km?: number;
  average_time_minutes?: number;
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
  const [travelAllowance, setTravelAllowance] = useState("");
  const [averageKm, setAverageKm] = useState("");
  const [averageTimeMinutes, setAverageTimeMinutes] = useState("");
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [isEditBeatOpen, setIsEditBeatOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { recommendations, loading: recsLoading, generateRecommendation, provideFeedback } = useRecommendations('beat_visit');
  const [activeTab, setActiveTab] = useState('beats');
  const [showRetailerAnalytics, setShowRetailerAnalytics] = useState(false);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(null);
  const [isAddRetailerModalOpen, setIsAddRetailerModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Recurrence state
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');
  const [repeatDays, setRepeatDays] = useState<number[]>([1]); // Monday by default
  const [repeatEndDate, setRepeatEndDate] = useState<Date>(addMonths(new Date(), 1));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showRetailersList, setShowRetailersList] = useState(false);
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(15);
  const [repeatUntilMode, setRepeatUntilMode] = useState<"date" | "permanent">("date");

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
      
      // Get user's own beats
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (beatsError) {
        console.error('Error fetching beats:', beatsError);
        throw beatsError;
      }

      // Get retailer counts for each beat for the current user
      const { data: retailersData, error: retailersError } = await supabase
        .from('retailers')
        .select('beat_id')
        .eq('user_id', user.id)
        .not('beat_id', 'is', null)
        .neq('beat_id', '')
        .neq('beat_id', 'unassigned');

      if (retailersError) {
        console.error('Error fetching retailers:', retailersError);
        throw retailersError;
      }

      // Count retailers per beat for this user
      const retailerCountMap = new Map<string, number>();
      (retailersData || []).forEach((item) => {
        const beatId = item.beat_id;
        retailerCountMap.set(beatId, (retailerCountMap.get(beatId) || 0) + 1);
      });

      console.log('Beats data:', beatsData);
      console.log('Retailer counts:', Array.from(retailerCountMap.entries()));

      // Map beats data with retailer counts
      const beatsArray = (beatsData || [])
        .map((beat: any, index) => ({
          id: beat.beat_id,
          name: beat.beat_name,
          retailer_count: retailerCountMap.get(beat.beat_id) || 0,
          total_retailers: retailerCountMap.get(beat.beat_id) || 0,
          category: beat.category || 'General',
          created_at: beat.created_at,
          travel_allowance: beat.travel_allowance || 0,
          average_km: beat.average_km || 0,
          average_time_minutes: beat.average_time_minutes || 0,
          beat_number: index + 1,
          retailers: []
        }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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
    setAverageKm("");
    setAverageTimeMinutes("");
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

    if (repeatEnabled && repeatType === 'weekly' && repeatDays.length === 0) {
      toast.error("Please select at least one day for weekly repeat");
      return;
    }

    if (repeatEnabled && repeatType === 'custom' && (!customIntervalDays || customIntervalDays < 1)) {
      toast.error("Please enter a valid number of days (minimum 1) for custom interval");
      return;
    }

    if (repeatEnabled && repeatUntilMode === "date" && !repeatEndDate) {
      toast.error("Please select an end date for the recurring beat");
      return;
    }

    if (!user) return;

    setIsCreating(true);
    try {
      // Generate unique beat ID
      const beatId = `beat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // First, create the beat in the shared beats table
      const { error: beatError } = await supabase
        .from('beats')
        .insert({
          beat_id: beatId,
          beat_name: beatName.trim(),
          category: 'General',
          travel_allowance: parseFloat(travelAllowance) || 0,
          average_km: parseFloat(averageKm) || 0,
          average_time_minutes: parseInt(averageTimeMinutes) || 0,
          created_by: user.id,
          is_active: true
        });

      if (beatError) throw beatError;

      // Update selected retailers with beat information (only if retailers are selected)
      if (selectedRetailers.size > 0) {
        const { error } = await supabase
          .from('retailers')
          .update({ 
            beat_id: beatId,
            beat_name: beatName.trim()
          })
          .in('id', Array.from(selectedRetailers));

        if (error) throw error;
      }

      // Create beat allowance record for the current user
      const { error: allowanceError } = await supabase
        .from('beat_allowances')
        .insert({
          user_id: user.id,
          beat_id: beatId,
          beat_name: beatName.trim(),
          daily_allowance: 0,
          travel_allowance: parseFloat(travelAllowance) || 0,
          average_km: parseFloat(averageKm) || 0,
          average_time_minutes: parseInt(averageTimeMinutes) || 0
        });

      if (allowanceError) {
        console.error('Error creating beat allowance:', allowanceError);
      }

      // Create beat plans if recurrence is enabled
      if (repeatEnabled) {
        const endDate = repeatUntilMode === "permanent" ? addDays(new Date(), 365) : repeatEndDate;
        await generateBeatPlans(beatId, endDate);
      }

      const retailerMessage = selectedRetailers.size > 0 
        ? `with ${selectedRetailers.size} retailer${selectedRetailers.size > 1 ? 's' : ''}`
        : 'with no retailers';
      const scheduleMessage = repeatEnabled 
        ? ` and scheduled ${repeatUntilMode === "permanent" ? "permanently" : `until ${format(repeatEndDate, 'PP')}`}`
        : '';
      toast.success(`Beat "${beatName}" created successfully ${retailerMessage}${scheduleMessage}`);
      setIsCreateBeatOpen(false);
      setBeatName("");
      setTravelAllowance("");
      setAverageKm("");
      setAverageTimeMinutes("");
      setSelectedRetailers(new Set());
      setRepeatEnabled(false);
      setRepeatType('weekly');
      setRepeatDays([1]);
      setRepeatEndDate(addMonths(new Date(), 1));
      setCustomIntervalDays(15);
      setRepeatUntilMode("date");
      
      // Reload data
      loadBeats();
      loadAllRetailers();
    } catch (error) {
      console.error('Error creating beat:', error);
      toast.error('Failed to create beat');
    } finally {
      setIsCreating(false);
    }
  };

  const generateBeatPlans = async (beatId: string, endDate: Date) => {
    try {
      const beatPlans: any[] = [];
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const today = new Date(currentDate);

      while (currentDate <= endDate) {
        let shouldAddDate = false;

        if (repeatType === 'daily') {
          shouldAddDate = true;
        } else if (repeatType === 'weekly') {
          const dayOfWeek = currentDate.getDay();
          shouldAddDate = repeatDays.includes(dayOfWeek);
        } else if (repeatType === 'monthly') {
          // Add on the same date each month
          shouldAddDate = currentDate.getDate() === new Date().getDate();
        } else if (repeatType === 'custom') {
          // For custom interval, include every Nth day
          const daysDiff = Math.floor((currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          shouldAddDate = daysDiff % customIntervalDays === 0;
        }

        if (shouldAddDate) {
          beatPlans.push({
            beat_id: beatId,
            planned_date: currentDate.toISOString().split('T')[0],
            status: 'pending',
            user_id: user?.id
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      if (beatPlans.length > 0) {
        const { error: planError } = await supabase
          .from('beat_plans')
          .insert(beatPlans);

        if (planError) {
          console.error('Error creating beat plans:', planError);
          toast.error('Beat created but failed to create visit schedule');
        } else {
          toast.success(`Created ${beatPlans.length} scheduled visits`);
        }
      }
    } catch (error: any) {
      console.error('Error generating beat plans:', error);
      toast.error('Failed to create beat schedule');
    }
  };

  const handleRetailerAdded = (retailerId: string, retailerName: string) => {
    setSelectedRetailers(prev => new Set(prev).add(retailerId));
    loadAllRetailers();
    setIsAddRetailerModalOpen(false);
    toast.success(`Retailer "${retailerName}" added and selected`);
  };

  const handleWeekDayToggle = (day: number) => {
    setRepeatDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort();
      return newDays;
    });
  };

  const handleDeleteBeat = async (beatId: string, beatName: string) => {
    if (!confirm(`Are you sure you want to delete the beat "${beatName}"? This action cannot be undone.`)) {
      return;
    }

    if (!user) return;

    try {
      // Update retailers to remove beat assignment
      const { error: retailerError } = await supabase
        .from('retailers')
        .update({ 
          beat_id: 'unassigned',
          beat_name: null
        })
        .eq('beat_id', beatId)
        .eq('user_id', user.id);

      if (retailerError) throw retailerError;

      // Delete beat plan if exists for this user
      const { error: planError } = await supabase
        .from('beat_plans')
        .delete()
        .eq('beat_id', beatId)
        .eq('user_id', user.id);

      if (planError) console.error('Error deleting beat plan:', planError);

      // Delete beat allowance if exists for this user
      const { error: allowanceError } = await supabase
        .from('beat_allowances')
        .delete()
        .eq('beat_id', beatId)
        .eq('user_id', user.id);

      if (allowanceError) console.error('Error deleting beat allowance:', allowanceError);

      // Mark beat as inactive in shared beats table (soft delete)
      const { error: beatError } = await supabase
        .from('beats')
        .update({ is_active: false })
        .eq('beat_id', beatId);

      if (beatError) console.error('Error marking beat as inactive:', beatError);

      toast.success(`Beat "${beatName}" deleted successfully`);
      
      // Reload data
      loadBeats();
      loadAllRetailers();
    } catch (error) {
      console.error('Error deleting beat:', error);
      toast.error('Failed to delete beat');
    }
  };

  const handleAddBeats = () => {
    navigate('/add-beat');
  };

  const handleEditBeat = (beat: Beat) => {
    setEditingBeat(beat);
    setIsEditBeatOpen(true);
  };

  const handleEditBeatClose = () => {
    setEditingBeat(null);
    setIsEditBeatOpen(false);
  };

  const handleBeatUpdated = () => {
    loadBeats();
    loadAllRetailers();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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

        {/* Tabs for Beats and AI Recommendations */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="beats" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Beats ({beats.length})
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Insights ({recommendations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beats" className="mt-6">
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
                           <Badge 
                             className={`text-xs ${
                               beat.retailer_count >= 30 ? 'bg-yellow-100 text-yellow-800' : // Platinum
                               beat.retailer_count >= 20 ? 'bg-gray-100 text-gray-800' : // Silver
                               beat.retailer_count >= 15 ? 'bg-orange-100 text-orange-800' : // Gold
                               'bg-amber-100 text-amber-800' // Bronze
                             }`}
                           >
                             {beat.retailer_count >= 30 ? 'Platinum' : 
                              beat.retailer_count >= 20 ? 'Silver' : 
                              beat.retailer_count >= 15 ? 'Gold' : 'Bronze'}
                           </Badge>
                           {beat.category && (
                             <Badge variant="outline" className="text-xs">
                               {beat.category}
                             </Badge>
                           )}
                         </div>
                         <CardTitle className="text-lg leading-tight">{beat.name}</CardTitle>
                       </div>
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => navigate(`/beat-analytics?beat=${beat.id}`)}
                         className="flex items-center gap-2"
                       >
                         <BarChart className="h-4 w-4" />
                         <span className="hidden sm:inline">Analytics</span>
                       </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {/* Beat Stats */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Users size={16} className="text-primary mr-1" />
                          </div>
                          <div className="text-lg font-bold text-primary">{beat.retailer_count}</div>
                          <div className="text-xs text-muted-foreground">Retailers</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {beat.average_km ? `${beat.average_km} km` : 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">Avg Distance</div>
                        </div>
                         <div>
                           <div className="text-lg font-bold text-blue-600">
                             {beat.average_time_minutes ? formatTime(beat.average_time_minutes) : 'N/A'}
                           </div>
                           <div className="text-xs text-muted-foreground">Avg Time</div>
                         </div>
                      </div>
                      
                      {/* Travel Allowance */}
                      {beat.travel_allowance > 0 && (
                        <div className="flex items-center justify-center gap-2 text-sm bg-muted/30 rounded-lg p-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Travel Allowance:</span>
                          <span className="font-semibold">₹{beat.travel_allowance}</span>
                        </div>
                      )}
                      
                      {/* Additional Info */}
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Last visited: {beat.last_visited ? new Date(beat.last_visited).toLocaleDateString() : 'Never'}</span>
                        </div>
                      </div>
                     
                      {/* Beat Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 flex items-center justify-center gap-2"
                          onClick={() => handleEditBeat(beat)}
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 flex items-center justify-center gap-2"
                          onClick={() => navigate(`/beat/${beat.id}`)}
                        >
                          <BarChart className="h-4 w-4" />
                          Details
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex items-center justify-center gap-2"
                          onClick={() => handleDeleteBeat(beat.id, beat.name)}
                        >
                          <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">AI-Powered Beat Insights</h2>
                  <p className="text-sm text-muted-foreground">Recommendations on which beats to visit next</p>
                </div>
                <Button
                  onClick={() => generateRecommendation('beat_visit')}
                  disabled={recsLoading}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {recsLoading ? 'Generating...' : 'Generate New Insights'}
                </Button>
              </div>

              {recommendations.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Sparkles className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No recommendations yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate AI-powered insights to help you prioritize which beats to visit
                    </p>
                    <Button
                      onClick={() => generateRecommendation('beat_visit')}
                      disabled={recsLoading || beats.length === 0}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {recsLoading ? 'Generating...' : 'Generate Recommendations'}
                    </Button>
                    {beats.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Create beats first to get recommendations
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recommendations.map((rec) => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onFeedback={(feedbackType) => provideFeedback(rec.id, feedbackType)}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Beat Modal */}
        <Dialog open={isCreateBeatOpen} onOpenChange={setIsCreateBeatOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Beat
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beatName">Beat Name</Label>
                  <Input
                    id="beatName"
                    placeholder="Enter beat name"
                    value={beatName}
                    onChange={(e) => setBeatName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travelAllowance">Travel Allowance (₹)</Label>
                  <Input
                    id="travelAllowance"
                    type="number"
                    placeholder="Enter travel allowance"
                    value={travelAllowance}
                    onChange={(e) => setTravelAllowance(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="averageKm" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Beat Average KM
                  </Label>
                  <Input
                    id="averageKm"
                    type="number"
                    step="0.1"
                    placeholder="Enter average distance"
                    value={averageKm}
                    onChange={(e) => setAverageKm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="averageTimeMinutes" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Average Time (minutes)
                  </Label>
                  <Input
                    id="averageTimeMinutes"
                    type="number"
                    placeholder="Enter average time in minutes"
                    value={averageTimeMinutes}
                    onChange={(e) => setAverageTimeMinutes(e.target.value)}
                  />
                </div>
              </div>

              {/* Add New Retailer Button */}
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddRetailerModalOpen(true)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add New Retailer to {beatName || 'Beat'}
                </Button>
              </div>

              {/* Select Retailers Section */}
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer py-2 border-b hover:bg-muted/30 transition-colors"
                  onClick={() => setShowRetailersList(!showRetailersList)}
                >
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Select Retailers
                      <ChevronDown className={`h-4 w-4 transition-transform ${showRetailersList ? 'rotate-180' : ''}`} />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose retailers to include in this beat ({selectedRetailers.size} selected)
                    </p>
                  </div>
                </div>

                {showRetailersList && (
                  <>
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
                  </>
                )}
              </div>

              {/* Recurrence Settings */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="repeatEnabled"
                    checked={repeatEnabled}
                    onChange={(e) => setRepeatEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="repeatEnabled" className="flex items-center gap-2 cursor-pointer">
                    <Repeat className="h-4 w-4" />
                    Schedule Recurring Visits
                  </Label>
                </div>

                {repeatEnabled && (
                  <div className="space-y-4 pl-6">
                    <div className="space-y-2">
                      <Label>Repeat Frequency</Label>
                      <RadioGroup value={repeatType} onValueChange={(value: any) => setRepeatType(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily" className="cursor-pointer">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom" className="cursor-pointer">Custom Interval</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {repeatType === 'custom' && (
                      <div className="space-y-2">
                        <Label>Repeat Every (Days) *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={customIntervalDays}
                          onChange={(e) => setCustomIntervalDays(parseInt(e.target.value) || 1)}
                          placeholder="Enter number of days"
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Visit will repeat every {customIntervalDays} day(s)
                        </p>
                      </div>
                    )}

                    {repeatType === 'weekly' && (
                      <div className="space-y-2">
                        <Label>Select Days</Label>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { label: 'Sun', value: 0 },
                            { label: 'Mon', value: 1 },
                            { label: 'Tue', value: 2 },
                            { label: 'Wed', value: 3 },
                            { label: 'Thu', value: 4 },
                            { label: 'Fri', value: 5 },
                            { label: 'Sat', value: 6 },
                          ].map(day => (
                            <Button
                              key={day.value}
                              type="button"
                              size="sm"
                              variant={repeatDays.includes(day.value) ? "default" : "outline"}
                              onClick={() => handleWeekDayToggle(day.value)}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Repeat Until</Label>
                      <RadioGroup value={repeatUntilMode} onValueChange={(val: any) => setRepeatUntilMode(val)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="date" id="until-date" />
                          <Label htmlFor="until-date" className="cursor-pointer">Until Date</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="permanent" id="permanent" />
                          <Label htmlFor="permanent" className="cursor-pointer">Permanent</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {repeatUntilMode === "date" && (
                      <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !repeatEndDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {repeatEndDate ? format(repeatEndDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={repeatEndDate}
                              onSelect={(date) => {
                                if (date) {
                                  setRepeatEndDate(date);
                                  setIsCalendarOpen(false);
                                }
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {repeatUntilMode === "permanent" && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        Visits will repeat indefinitely for this beat
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Fixed Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t bg-background">
              <Button variant="outline" onClick={() => setIsCreateBeatOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBeat} disabled={!beatName.trim() || isCreating}>
                {isCreating ? 'Creating...' : `Create Beat (${selectedRetailers.size} retailer${selectedRetailers.size !== 1 ? 's' : ''})`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Retailer Modal */}
        <AddRetailerInlineToBeat
          open={isAddRetailerModalOpen}
          onClose={() => setIsAddRetailerModalOpen(false)}
          beatName={beatName}
          onRetailerAdded={handleRetailerAdded}
        />

        {/* Edit Beat Modal */}
        <EditBeatModal
          isOpen={isEditBeatOpen}
          onClose={handleEditBeatClose}
          beat={editingBeat}
          onBeatUpdated={handleBeatUpdated}
        />

        {/* Retailer Analytics Modal */}
        {selectedAnalyticsRetailer && (
          <RetailerAnalytics
            isOpen={!!selectedAnalyticsRetailer}
            retailer={selectedAnalyticsRetailer}
            onClose={() => setSelectedAnalyticsRetailer(null)}
          />
        )}
      </div>
    </Layout>
  );
};