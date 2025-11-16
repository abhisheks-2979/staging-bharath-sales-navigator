import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Target, TrendingUp, Users, ShoppingCart, Award, MessageSquare, Image, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Activity {
  id: string;
  action_name: string;
  action_type: string;
  points: number;
  target_type: string | null;
  base_daily_target: number | null;
  max_daily_awards: number | null;
  max_awardable_activities: number | null;
  consecutive_orders_required: number | null;
  min_growth_percentage: number | null;
  focused_products: string[] | null;
  game_name: string;
}

const activityIcons: Record<string, any> = {
  first_order_new_retailer: Users,
  daily_target: Target,
  focused_product_sales: Trophy,
  productive_visit: ShoppingCart,
  monthly_growth: TrendingUp,
  consecutive_orders: Award,
  competition_data: MessageSquare,
  beat_filled: Award,
  branding_request: Image,
};

export default function ActivitiesInfo() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    const { data: gamesData, error: gamesError } = await supabase
      .from("gamification_games")
      .select("id, name")
      .eq("is_active", true);

    if (gamesError) {
      toast.error("Failed to load activities");
      setLoading(false);
      return;
    }

    if (!gamesData || gamesData.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const { data: actionsData, error: actionsError } = await supabase
      .from("gamification_actions")
      .select("*")
      .in("game_id", gamesData.map(g => g.id))
      .eq("is_enabled", true);

    if (actionsError) {
      toast.error("Failed to load activities");
      setLoading(false);
      return;
    }

    const activitiesWithGames = actionsData?.map(action => {
      const game = gamesData.find(g => g.id === action.game_id);
      return {
        ...action,
        game_name: game?.name || "Unknown Game",
      };
    }) || [];

    setActivities(activitiesWithGames);
    setLoading(false);
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.action_type) {
      case "first_order_new_retailer":
        return "Awarded only on the first order ever placed by a newly acquired retailer";
      case "daily_target":
        return `Meet your daily target of ${activity.base_daily_target || "N/A"} ${activity.target_type || "orders"}`;
      case "focused_product_sales":
        return "Awarded for each order containing a focused product";
      case "productive_visit":
        return "Awarded for any check-in/visit that results in an order";
      case "monthly_growth":
        return `Achieve ${activity.min_growth_percentage || 0}% growth compared to previous month`;
      case "consecutive_orders":
        return `Place ${activity.consecutive_orders_required || 0} consecutive orders from the same retailer`;
      case "competition_data":
        return "Submit competition data during visits";
      case "beat_filled":
        return "Fill retailer beat information";
      case "branding_request":
        return "Submit branding requests";
      default:
        return "Complete this activity to earn points";
    }
  };

  const getActivityConfig = (activity: Activity) => {
    const configs = [];
    if (activity.max_daily_awards) configs.push(`Max ${activity.max_daily_awards}/day`);
    if (activity.max_awardable_activities) configs.push(`Max ${activity.max_awardable_activities} activities`);
    if (activity.consecutive_orders_required) configs.push(`${activity.consecutive_orders_required} consecutive orders`);
    if (activity.min_growth_percentage) configs.push(`${activity.min_growth_percentage}% growth required`);
    return configs.join(" • ");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leaderboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Activities & Actions</h1>
            <p className="text-muted-foreground">Learn how to earn points through various activities</p>
          </div>
        </div>

        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">No active activities found</p>
              <p className="text-sm text-muted-foreground mt-2">Contact your admin to set up gamification games</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activities.map((activity) => {
              const IconComponent = activityIcons[activity.action_type] || Trophy;
              return (
                <Card key={activity.id} className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{activity.action_name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">{activity.game_name}</Badge>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                        {activity.points} pts
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="text-sm">
                      {getActivityDescription(activity)}
                    </CardDescription>
                    {getActivityConfig(activity) && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        {getActivityConfig(activity)}
                      </div>
                    )}
                    {activity.focused_products && activity.focused_products.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium">Focused Products: </span>
                        <span className="text-muted-foreground">
                          {activity.focused_products.join(", ")}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
