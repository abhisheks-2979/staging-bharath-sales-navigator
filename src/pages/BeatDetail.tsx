import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Store, Calendar, TrendingUp, CalendarDays, Edit2, BarChart, Trash2, Sparkles, Target, Shield, AlertTriangle, Lightbulb, Users, Package, DollarSign, Clock, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BeatVisitCalendar } from "@/components/BeatVisitCalendar";
import { useBeatMetrics } from "@/hooks/useBeatMetrics";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { EditBeatModal } from "@/components/EditBeatModal";
import { BeatAnalyticsModal } from "@/components/BeatAnalyticsModal";
import { useRecommendations } from "@/hooks/useRecommendations";
import { RetailerDetailModal } from "@/components/RetailerDetailModal";

interface BeatDetailData {
  beat_id: string;
  beat_name: string;
  category?: string;
  created_at: string;
  travel_allowance?: number;
  average_km?: number;
  average_time_minutes?: number;
  territory_id?: string;
  territory_name?: string;
  retailers: Array<{
    id: string;
    name: string;
    address: string;
    phone?: string;
    category?: string;
    priority?: string;
    last_visit_date?: string;
    order_value?: number;
  }>;
}

interface BeatSWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export const BeatDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [beatData, setBeatData] = useState<BeatDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [swot, setSwot] = useState<BeatSWOT>({ strengths: [], weaknesses: [], opportunities: [], threats: [] });
  const [retailerSearch, setRetailerSearch] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState<any>(null);
  const [showRetailerModal, setShowRetailerModal] = useState(false);

  const filteredRetailers = useMemo(() => {
    if (!beatData?.retailers) return [];
    if (!retailerSearch.trim()) return beatData.retailers;
    const searchLower = retailerSearch.toLowerCase();
    return beatData.retailers.filter(retailer => 
      retailer.name.toLowerCase().includes(searchLower) ||
      retailer.address?.toLowerCase().includes(searchLower) ||
      retailer.category?.toLowerCase().includes(searchLower)
    );
  }, [beatData?.retailers, retailerSearch]);
  const [performanceStats, setPerformanceStats] = useState({
    totalRevenue: 0,
    avgOrderValue: 0,
    totalVisits: 0,
    productiveVisits: 0,
    conversionRate: 0,
    growthRate: 0
  });
  
  const { metrics, loading: metricsLoading } = useBeatMetrics(id || '', user?.id || '');
  const { generateRecommendation } = useRecommendations('beat_visit');

  useEffect(() => {
    if (!user || !id) return;

    const fetchBeatData = async () => {
      try {
        setLoading(true);
        
        // Fetch beat from beats table
        const { data: beat, error: beatError } = await supabase
          .from('beats')
          .select('*')
          .eq('beat_id', id)
          .single();

        if (beatError && beatError.code !== 'PGRST116') {
          console.error('Error fetching beat:', beatError);
        }

        // If not found in beats, try beat_plans
        let beatInfo: any = beat;
        if (!beat) {
          const { data: beatPlan, error: beatPlanError } = await supabase
            .from('beat_plans')
            .select('beat_id, beat_name, beat_data, created_at')
            .eq('beat_id', id)
            .eq('user_id', user.id)
            .single();

          if (!beatPlanError && beatPlan) {
            beatInfo = {
              beat_id: beatPlan.beat_id,
              beat_name: beatPlan.beat_name,
              created_at: beatPlan.created_at,
              category: 'General'
            };
          }
        }

        // Get territory name if territory_id exists
        let territoryName = null;
        if (beat?.territory_id) {
          const { data: territory } = await supabase
            .from('territories')
            .select('name')
            .eq('id', beat.territory_id)
            .single();
          territoryName = territory?.name;
        }

        // Get retailers for this beat
        const { data: retailers, error: retailersError } = await supabase
          .from('retailers')
          .select('id, name, address, phone, category, priority, last_visit_date, order_value')
          .eq('beat_id', id)
          .eq('user_id', user.id);

        if (retailersError) {
          console.error('Error fetching retailers:', retailersError);
          throw retailersError;
        }

        // Calculate performance stats
        await calculatePerformanceStats(id, user.id, retailers || []);

        // Generate SWOT analysis
        generateSWOT(retailers || [], metrics);

        setBeatData({
          beat_id: id,
          beat_name: beatInfo?.beat_name || id,
          category: beatInfo?.category || 'General',
          created_at: beatInfo?.created_at || new Date().toISOString(),
          travel_allowance: beat?.travel_allowance,
          average_km: beat?.average_km,
          average_time_minutes: beat?.average_time_minutes,
          territory_id: beat?.territory_id,
          territory_name: territoryName,
          retailers: retailers || []
        });

      } catch (error) {
        console.error('Error loading beat data:', error);
        toast.error('Failed to load beat details');
      } finally {
        setLoading(false);
      }
    };

    fetchBeatData();
  }, [user, id]);

  const calculatePerformanceStats = async (beatId: string, userId: string, retailers: any[]) => {
    try {
      const retailerIds = retailers.map(r => r.id);
      if (retailerIds.length === 0) return;

      // Get last 3 months of data
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('retailer_id', retailerIds)
        .gte('created_at', threeMonthsAgo.toISOString());

      // Fetch visits
      const { data: visits } = await supabase
        .from('visits')
        .select('status, created_at')
        .in('retailer_id', retailerIds)
        .gte('created_at', threeMonthsAgo.toISOString());

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalVisits = visits?.length || 0;
      const productiveVisits = visits?.filter(v => v.status === 'completed').length || 0;
      const conversionRate = totalVisits > 0 ? (productiveVisits / totalVisits) * 100 : 0;

      // Calculate growth rate (comparing last month to previous month)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const lastMonthRevenue = orders?.filter(o => new Date(o.created_at) >= oneMonthAgo)
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const prevMonthRevenue = orders?.filter(o => new Date(o.created_at) >= twoMonthsAgo && new Date(o.created_at) < oneMonthAgo)
        .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      
      const growthRate = prevMonthRevenue > 0 ? ((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

      setPerformanceStats({
        totalRevenue,
        avgOrderValue,
        totalVisits,
        productiveVisits,
        conversionRate,
        growthRate
      });
    } catch (error) {
      console.error('Error calculating performance stats:', error);
    }
  };

  const generateSWOT = (retailers: any[], beatMetrics: any) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    // Analyze retailers
    const highPriorityCount = retailers.filter(r => r.priority === 'high').length;
    const retailerCount = retailers.length;
    const avgOrderValue = retailers.reduce((sum, r) => sum + (r.order_value || 0), 0) / (retailerCount || 1);

    // Strengths
    if (retailerCount >= 20) strengths.push(`Strong retailer base with ${retailerCount} retailers`);
    if (highPriorityCount >= 5) strengths.push(`${highPriorityCount} high-priority retailers`);
    if (beatMetrics.visitsPerMonth >= 4) strengths.push(`Consistent visit frequency (${beatMetrics.visitsPerMonth}/month)`);
    if (avgOrderValue >= 5000) strengths.push(`High average order value (₹${avgOrderValue.toLocaleString()})`);
    if (beatMetrics.retailersAdded3Months >= 3) strengths.push(`Growing network (+${beatMetrics.retailersAdded3Months} retailers in 3 months)`);

    // Weaknesses
    if (retailerCount < 10) weaknesses.push(`Low retailer coverage (${retailerCount} retailers)`);
    if (beatMetrics.visitsPerMonth < 2) weaknesses.push('Infrequent visits to this beat');
    if (avgOrderValue < 2000) weaknesses.push('Low average order value');
    const inactiveRetailers = retailers.filter(r => {
      if (!r.last_visit_date) return true;
      const daysSinceVisit = Math.floor((new Date().getTime() - new Date(r.last_visit_date).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceVisit > 30;
    }).length;
    if (inactiveRetailers > 5) weaknesses.push(`${inactiveRetailers} retailers not visited in 30+ days`);

    // Opportunities
    if (retailerCount >= 15 && retailerCount < 25) opportunities.push('Potential to expand to 25+ retailers');
    if (beatMetrics.revenueGrowth > 0) opportunities.push(`Positive revenue trend (${beatMetrics.revenueGrowth}% growth)`);
    opportunities.push('Introduce new product categories');
    opportunities.push('Cross-sell to existing high-value retailers');

    // Threats
    if (beatMetrics.revenueGrowth < 0) threats.push(`Revenue declining (${beatMetrics.revenueGrowth}% drop)`);
    if (inactiveRetailers > retailerCount * 0.3) threats.push('Risk of losing dormant retailers to competition');
    threats.push('Competition may target high-value retailers');

    setSwot({ strengths, weaknesses, opportunities, threats });
  };

  const handleDelete = async () => {
    if (!beatData || !user) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${beatData.beat_name}"?`);
    if (!confirmed) return;

    try {
      await moveToRecycleBin({
        tableName: 'beats',
        recordId: beatData.beat_id,
        recordData: {
          beat_id: beatData.beat_id,
          beat_name: beatData.beat_name
        },
        moduleName: 'beats',
        recordName: beatData.beat_name
      });
      
      // Deactivate the beat
      await supabase
        .from('beats')
        .update({ is_active: false })
        .eq('beat_id', beatData.beat_id);

      toast.success('Beat moved to recycle bin');
      navigate('/my-beats');
    } catch (error) {
      console.error('Error deleting beat:', error);
      toast.error('Failed to delete beat');
    }
  };

  const handleAIInsights = () => {
    if (beatData) {
      generateRecommendation('beat_visit', beatData.beat_id);
      toast.success('Generating AI insights...');
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!beatData) {
    return (
      <Layout>
        <div className="p-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Beat not found</p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{beatData.beat_name}</h1>
              <p className="text-sm text-muted-foreground">Beat Details & Performance</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2"
            >
              <Edit2 size={16} />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2"
            >
              <BarChart size={16} />
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIInsights}
              className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20"
            >
              <Sparkles size={16} className="text-primary" />
              AI Insights
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>

        {/* Key Performance Highlights */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap size={20} className="text-primary" />
              Key Performance Highlights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-background rounded-lg shadow-sm">
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-bold text-green-600">₹{(performanceStats.totalRevenue / 1000).toFixed(1)}K</div>
                <div className="text-xs text-muted-foreground">Total Revenue (3M)</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg shadow-sm">
                <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-lg font-bold text-blue-600">₹{performanceStats.avgOrderValue.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Avg Order Value</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg shadow-sm">
                <Users className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <div className="text-lg font-bold text-purple-600">{beatData.retailers.length}</div>
                <div className="text-xs text-muted-foreground">Total Retailers</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg shadow-sm">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                <div className="text-lg font-bold text-orange-600">{performanceStats.totalVisits}</div>
                <div className="text-xs text-muted-foreground">Total Visits (3M)</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg shadow-sm">
                <Target className="h-5 w-5 mx-auto mb-1 text-cyan-600" />
                <div className="text-lg font-bold text-cyan-600">{performanceStats.conversionRate.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Conversion Rate</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg shadow-sm">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                <div className={`text-lg font-bold ${performanceStats.growthRate >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {performanceStats.growthRate >= 0 ? '+' : ''}{performanceStats.growthRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Growth Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beat Info Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Beat Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Beat ID</p>
                <p className="font-semibold">{beatData.beat_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-semibold">{beatData.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Retailers</p>
                <p className="font-semibold">{beatData.retailers.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-semibold">{new Date(beatData.created_at).toLocaleDateString()}</p>
              </div>
              {beatData.territory_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Territory</p>
                  <p className="font-semibold">{beatData.territory_name}</p>
                </div>
              )}
              {beatData.travel_allowance && (
                <div>
                  <p className="text-xs text-muted-foreground">Travel Allowance</p>
                  <p className="font-semibold">₹{beatData.travel_allowance}</p>
                </div>
              )}
              {beatData.average_km && (
                <div>
                  <p className="text-xs text-muted-foreground">Average Distance</p>
                  <p className="font-semibold">{beatData.average_km} km</p>
                </div>
              )}
              {beatData.average_time_minutes && (
                <div>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                  <p className="font-semibold">{beatData.average_time_minutes} mins</p>
                </div>
              )}
            </div>
            
            {/* Recurring Info */}
            {metrics.isRecurring && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 mt-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Recurring Schedule: {metrics.recurringDetails}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SWOT Analysis */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target size={20} className="text-primary" />
              SWOT Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-700 dark:text-green-400">Strengths</h3>
                </div>
                <ul className="space-y-2">
                  {swot.strengths.length > 0 ? swot.strengths.map((item, i) => (
                    <li key={i} className="text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {item}
                    </li>
                  )) : (
                    <li className="text-sm text-muted-foreground italic">No significant strengths identified yet</li>
                  )}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-700 dark:text-red-400">Weaknesses</h3>
                </div>
                <ul className="space-y-2">
                  {swot.weaknesses.length > 0 ? swot.weaknesses.map((item, i) => (
                    <li key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      {item}
                    </li>
                  )) : (
                    <li className="text-sm text-muted-foreground italic">No significant weaknesses identified</li>
                  )}
                </ul>
              </div>

              {/* Opportunities */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-700 dark:text-blue-400">Opportunities</h3>
                </div>
                <ul className="space-y-2">
                  {swot.opportunities.map((item, i) => (
                    <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Threats */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-700 dark:text-orange-400">Threats</h3>
                </div>
                <ul className="space-y-2">
                  {swot.threats.map((item, i) => (
                    <li key={i} className="text-sm text-orange-700 dark:text-orange-300 flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beat Visit History Calendar */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays size={20} className="text-primary" />
              Visit History Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BeatVisitCalendar beatId={beatData.beat_id} beatName={beatData.beat_name} />
          </CardContent>
        </Card>

        {/* Retailers List */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Store size={20} className="text-primary" />
                Retailers in this Beat ({beatData.retailers.length})
              </CardTitle>
              {beatData.retailers.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    placeholder="Search retailers..."
                    value={retailerSearch}
                    onChange={(e) => setRetailerSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {beatData.retailers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No retailers assigned to this beat</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate('/add-retailer')}
                >
                  Add Retailers
                </Button>
              </div>
            ) : filteredRetailers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No retailers match your search</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRetailers.map((retailer) => (
                  <Card key={retailer.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 
                              className="font-semibold text-primary cursor-pointer hover:underline"
                              onClick={() => {
                                setSelectedRetailer({
                                  id: retailer.id,
                                  name: retailer.name,
                                  address: retailer.address,
                                  phone: retailer.phone || null,
                                  category: retailer.category || null,
                                  priority: retailer.priority || null,
                                  beat_id: beatData?.beat_id || '',
                                  status: null,
                                  created_at: '',
                                  last_visit_date: retailer.last_visit_date || null,
                                  order_value: retailer.order_value || null
                                });
                                setShowRetailerModal(true);
                              }}
                            >
                              {retailer.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              {retailer.category && (
                                <Badge variant="outline">{retailer.category}</Badge>
                              )}
                              {retailer.priority && (
                                <Badge className={getPriorityColor(retailer.priority)}>
                                  {retailer.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {retailer.order_value && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Order Value</p>
                              <p className="font-semibold text-primary">₹{retailer.order_value.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                            <span>{retailer.address}</span>
                          </div>
                          
                          {retailer.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone size={14} />
                              <span>{retailer.phone}</span>
                            </div>
                          )}
                          
                          {retailer.last_visit_date && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar size={12} />
                              <span>Last visit: {new Date(retailer.last_visit_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => navigate('/add-retailer')}>
            Add Retailers
          </Button>
          <Button onClick={() => navigate('/visits/retailers')}>
            Plan Visits
          </Button>
        </div>
      </div>

      {/* Edit Beat Modal */}
      {isEditOpen && beatData && (
        <EditBeatModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          beat={{
            id: beatData.beat_id,
            name: beatData.beat_name,
            travel_allowance: beatData.travel_allowance,
            average_km: beatData.average_km,
            average_time_minutes: beatData.average_time_minutes
          }}
          onBeatUpdated={() => {
            setIsEditOpen(false);
            window.location.reload();
          }}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && beatData && user && (
        <BeatAnalyticsModal
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          beatId={beatData.beat_id}
          beatName={beatData.beat_name}
          userId={user.id}
        />
      )}

      {/* Retailer Detail Modal */}
      <RetailerDetailModal
        isOpen={showRetailerModal}
        onClose={() => {
          setShowRetailerModal(false);
          setSelectedRetailer(null);
        }}
        retailer={selectedRetailer}
        onSuccess={() => {
          setShowRetailerModal(false);
          setSelectedRetailer(null);
          window.location.reload();
        }}
      />
    </Layout>
  );
};
