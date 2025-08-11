import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Store, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BeatDetailData {
  beat_id: string;
  beat_name: string;
  category?: string;
  created_at: string;
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

export const BeatDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [beatData, setBeatData] = useState<BeatDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;

    const fetchBeatData = async () => {
      try {
        setLoading(true);
        
        // First try to get beat info from beat_plans
        const { data: beatPlan, error: beatPlanError } = await supabase
          .from('beat_plans')
          .select('beat_id, beat_name, beat_data, created_at')
          .eq('beat_id', id)
          .eq('user_id', user.id)
          .single();

        if (beatPlanError && beatPlanError.code !== 'PGRST116') {
          console.error('Error fetching beat plan:', beatPlanError);
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

        // If no beat plan found, try to get beat name from retailers
        let beatName = beatPlan?.beat_name || id;
        let category = 'General';
        let createdAt = beatPlan?.created_at || new Date().toISOString();

        // If beat plan exists, try to parse category from beat_data
        if (beatPlan?.beat_data) {
          try {
            const beatDataParsed = typeof beatPlan.beat_data === 'string' 
              ? JSON.parse(beatPlan.beat_data) 
              : beatPlan.beat_data;
            category = beatDataParsed.category || 'General';
          } catch (e) {
            console.log('Could not parse beat_data:', e);
          }
        }

        setBeatData({
          beat_id: id,
          beat_name: beatName,
          category,
          created_at: createdAt,
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
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
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
            <p className="text-sm text-muted-foreground">Beat Details & Retailers</p>
          </div>
        </div>

        {/* Beat Info Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Beat Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Retailers List */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Store size={20} className="text-primary" />
              Retailers in this Beat
            </CardTitle>
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
            ) : (
              <div className="space-y-3">
                {beatData.retailers.map((retailer) => (
                  <Card key={retailer.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{retailer.name}</h4>
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

                        <div className="flex justify-end pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/visit/${retailer.id}`)}
                            className="text-xs"
                          >
                            <TrendingUp size={12} className="mr-1" />
                            View Details
                          </Button>
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
    </Layout>
  );
};