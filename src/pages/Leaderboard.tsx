import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LeaderboardTimeFilters } from "@/components/LeaderboardTimeFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Award, Gift, Info, Loader2, Medal, TrendingUp, Target, Star } from "lucide-react";
import { BadgesDisplay } from "@/components/BadgesDisplay";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface UserPoints {
  user_id: string;
  total_points: number;
  profiles: { full_name: string; profile_picture_url: string | null };
}

interface MyPoints {
  today: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
  total: number;
}

interface Redemption {
  id: string;
  points_redeemed: number;
  voucher_amount: number;
  status: string;
  requested_at: string;
  voucher_code: string | null;
  rejection_reason: string | null;
}

interface GameWithPoints {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  activity_name: string;
  earned_points: number;
  total_possible_points: number;
  action_type: string;
}

interface PointsBreakdown {
  activity_name: string;
  points: number;
  count: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<UserPoints[]>([]);
  const [myPoints, setMyPoints] = useState<MyPoints>({ today: 0, week: 0, month: 0, quarter: 0, year: 0, total: 0 });
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [games, setGames] = useState<GameWithPoints[]>([]);
  const [pointsBreakdown, setPointsBreakdown] = useState<PointsBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "quarter" | "year">("today");
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [conversionRate, setConversionRate] = useState(1);

  useEffect(() => {
    fetchLeaderboardData();
    fetchMyPoints();
    fetchRedemptions();
    fetchGames();
    fetchPointsBreakdown();
    fetchConversionRate();
  }, [timeFilter]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    
    // Get date range based on timeFilter
    const { startDate } = getDateRange();
    
    const { data, error } = await supabase
      .from("gamification_points")
      .select("user_id, points, earned_at")
      .gte("earned_at", startDate.toISOString())
      .order("earned_at", { ascending: false });

    if (error) {
      toast.error("Failed to load leaderboard");
      setLoading(false);
      return;
    }

    // Aggregate points by user
    const userPointsMap = new Map<string, number>();
    data?.forEach(item => {
      const current = userPointsMap.get(item.user_id) || 0;
      userPointsMap.set(item.user_id, current + item.points);
    });

    // Get user profiles
    const userIds = Array.from(userPointsMap.keys());
    if (userIds.length === 0) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, profile_picture_url")
      .in("id", userIds);

    const leaderboardData: UserPoints[] = userIds
      .map(userId => {
        const profile = profilesData?.find(p => p.id === userId);
        return {
          user_id: userId,
          total_points: userPointsMap.get(userId) || 0,
          profiles: {
            full_name: profile?.full_name || "Unknown User",
            profile_picture_url: profile?.profile_picture_url || null
          }
        };
      })
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 50);

    setLeaderboard(leaderboardData);
    setLoading(false);
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        break;
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    return { startDate, endDate: now };
  };

  const fetchConversionRate = async () => {
    const { data } = await supabase
      .from("gamification_games")
      .select("points_to_rupee_conversion")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setConversionRate(data.points_to_rupee_conversion || 1);
    }
  };

  const fetchMyPoints = async () => {
    if (!userProfile?.id) return;

    const now = new Date();
    
    // Calculate time ranges
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    const { data } = await supabase
      .from("gamification_points")
      .select("points, earned_at")
      .eq("user_id", userProfile.id)
      .order("earned_at", { ascending: false });

    if (data) {
      const points: MyPoints = { today: 0, week: 0, month: 0, quarter: 0, year: 0, total: 0 };
      data.forEach(item => {
        const earnedDate = new Date(item.earned_at);
        const pointsValue = Number(item.points) || 0;
        
        points.total += pointsValue;
        if (earnedDate >= startOfToday) points.today += pointsValue;
        if (earnedDate >= startOfWeek) points.week += pointsValue;
        if (earnedDate >= startOfMonth) points.month += pointsValue;
        if (earnedDate >= startOfQuarter) points.quarter += pointsValue;
        if (earnedDate >= startOfYear) points.year += pointsValue;
      });
      setMyPoints(points);
    }
  };

  const fetchRedemptions = async () => {
    if (!userProfile?.id) return;
    const { data } = await supabase
      .from("gamification_redemptions")
      .select("*")
      .eq("user_id", userProfile.id)
      .order("requested_at", { ascending: false });

    if (data) setRedemptions(data);
  };

  const fetchGames = async () => {
    if (!userProfile?.id) return;
    
    const { data: gamesData } = await supabase
      .from("gamification_games")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!gamesData) return;

    const gamesWithPoints: GameWithPoints[] = await Promise.all(
      gamesData.map(async (game) => {
        const { data: actionsData } = await supabase
          .from("gamification_actions")
          .select("action_name, action_type, points")
          .eq("game_id", game.id)
          .eq("is_enabled", true)
          .limit(1);

        const { data: pointsData } = await supabase
          .from("gamification_points")
          .select("points")
          .eq("game_id", game.id)
          .eq("user_id", userProfile.id);

        const earnedPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;
        const activityName = actionsData?.[0]?.action_name || "N/A";
        const actionType = actionsData?.[0]?.action_type || "";
        const basePoints = actionsData?.[0]?.points || 0;
        
        // Estimate possible points (this is a simplified calculation)
        const totalPossiblePoints = basePoints * 100; // Estimate

        return {
          ...game,
          activity_name: activityName,
          action_type: actionType,
          earned_points: earnedPoints,
          total_possible_points: totalPossiblePoints
        };
      })
    );

    setGames(gamesWithPoints);
  };

  const fetchPointsBreakdown = async () => {
    if (!userProfile?.id) return;

    const { startDate } = getDateRange();

    const { data } = await supabase
      .from("gamification_points")
      .select("action_id, points, gamification_actions(action_name)")
      .eq("user_id", userProfile.id)
      .gte("earned_at", startDate.toISOString());

    if (data) {
      const breakdown = new Map<string, { points: number; count: number }>();
      
      data.forEach((item: any) => {
        const activityName = item.gamification_actions?.action_name || "Unknown";
        const current = breakdown.get(activityName) || { points: 0, count: 0 };
        breakdown.set(activityName, {
          points: current.points + item.points,
          count: current.count + 1
        });
      });

      const breakdownArray: PointsBreakdown[] = Array.from(breakdown.entries())
        .map(([activity_name, data]) => ({
          activity_name,
          points: data.points,
          count: data.count
        }))
        .sort((a, b) => b.points - a.points);

      setPointsBreakdown(breakdownArray);
    }
  };

  const requestRedemption = async () => {
    if (!userProfile?.id) return;
    const points = parseFloat(redeemPoints);
    if (isNaN(points) || points <= 0) {
      toast.error("Please enter valid points");
      return;
    }

    if (points > myPoints.total) {
      toast.error("Insufficient points");
      return;
    }

    if (points < 100) {
      toast.error("Minimum redemption is 100 points");
      return;
    }

    // Fetch active game to get conversion rate
    const { data: gamesData } = await supabase
      .from("gamification_games")
      .select("points_to_rupee_conversion")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const conversionRate = gamesData?.points_to_rupee_conversion || 1;

    const { error } = await supabase.from("gamification_redemptions").insert({
      user_id: userProfile.id,
      points_redeemed: points,
      voucher_amount: points * conversionRate,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to submit redemption request");
    } else {
      toast.success("Redemption request submitted successfully");
      setShowRedeemDialog(false);
      setRedeemPoints("");
      fetchRedemptions();
      fetchMyPoints();
    }
  };

  const getDisplayPoints = () => {
    switch (timeFilter) {
      case "today": return myPoints.today;
      case "week": return myPoints.week;
      case "month": return myPoints.month;
      case "quarter": return myPoints.quarter;
      case "year": return myPoints.year;
      default: return myPoints.total;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-600">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <p className="text-muted-foreground">Track performance, earn points, and compete</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/activities-info")}>
                <Trophy className="mr-2 h-4 w-4" />
                Game Configurations
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/badges-info")}>
                <Award className="mr-2 h-4 w-4" />
                Badges
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/game-policy")}>
                <Info className="mr-2 h-4 w-4" />
                Game Policy
              </Button>
            </div>
          </div>
        </div>

        {/* My Points Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/20 dark:to-yellow-800/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                <LeaderboardTimeFilters 
                  timeFilter={timeFilter} 
                  onFilterChange={(v: any) => setTimeFilter(v)}
                />
              </div>
              <p className="text-sm text-muted-foreground">My Points</p>
              <p className="text-4xl font-bold">{getDisplayPoints()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total: {myPoints.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                <p className="text-sm text-muted-foreground">My Rank</p>
              </div>
              <p className="text-4xl font-bold">
                #{leaderboard.findIndex(l => l.user_id === userProfile?.id) + 1 || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">of {leaderboard.length} participants</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-muted-foreground">Active Games</p>
              </div>
              <p className="text-4xl font-bold">{games.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Currently participating</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <p className="text-sm text-muted-foreground">Available to Redeem</p>
              </div>
              <p className="text-4xl font-bold">{myPoints.total}</p>
              <Button className="w-full mt-3" size="sm" onClick={() => setShowRedeemDialog(true)}>
                Redeem Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Activity Performance */}
        {pointsBreakdown.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Activity Performance ({timeFilter})</CardTitle>
              <CardDescription>Your points breakdown by activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pointsBreakdown.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{item.activity_name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{item.count} activities</span>
                        <Badge variant="secondary">{item.points} pts</Badge>
                      </div>
                    </div>
                    <Progress value={(item.points / myPoints.total) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="games" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="games">
              <Award className="mr-2 h-4 w-4" />
              My Games
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Medal className="mr-2 h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="mr-2 h-4 w-4" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="redemptions">
              <Gift className="mr-2 h-4 w-4" />
              Redemptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Rankings for {timeFilter}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.slice(0, 3).map((item, index) => (
                    <div key={item.user_id} className={`flex items-center gap-4 p-4 rounded-lg ${
                      item.user_id === userProfile?.id 
                        ? "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-500" 
                        : "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10"
                    }`}>
                      <div className="text-3xl">{getRankIcon(index + 1)}</div>
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{item.profiles.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{item.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{item.total_points} points</p>
                      </div>
                      {item.user_id === userProfile?.id && (
                        <Badge variant="default">You</Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">All Participants</p>
                  {leaderboard.slice(3).map((item, index) => (
                    <div key={item.user_id} className={`flex items-center gap-3 p-3 rounded-md ${
                      item.user_id === userProfile?.id 
                        ? "bg-blue-100 dark:bg-blue-950/20 border border-blue-500" 
                        : "bg-muted/50"
                    }`}>
                      <span className="text-sm font-medium w-8">#{index + 4}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{item.profiles.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="flex-1 text-sm">{item.profiles.full_name}</p>
                      <Badge variant="outline">{item.total_points} pts</Badge>
                      {item.user_id === userProfile?.id && (
                        <Badge variant="default" className="text-xs">You</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-4">
            {games.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active games at the moment</p>
                </CardContent>
              </Card>
            ) : (
              games.map((game) => (
                <Card key={game.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{game.activity_name}</CardTitle>
                        <CardDescription>{game.description || "No description"}</CardDescription>
                      </div>
                      <Badge variant={game.is_active ? "default" : "secondary"}>
                        {game.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your Progress</span>
                      <span className="font-semibold">{game.earned_points} / {game.total_possible_points} points</span>
                    </div>
                    <Progress 
                      value={(game.earned_points / game.total_possible_points) * 100} 
                      className="h-3"
                    />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{game.earned_points}</p>
                        <p className="text-xs text-muted-foreground">Points Earned</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {Math.round((game.earned_points / game.total_possible_points) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Completion</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="badges">
            <Card>
              <CardHeader>
                <CardTitle>My Badges</CardTitle>
                <CardDescription>Achievements and milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <BadgesDisplay />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redemptions" className="space-y-4">
            {redemptions.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No redemption requests yet</p>
                  <Button className="mt-4" onClick={() => setShowRedeemDialog(true)}>
                    Redeem Points Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              redemptions.map((redemption) => (
                <Card key={redemption.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{redemption.points_redeemed} Points</p>
                          <Badge variant="outline">₹{redemption.voucher_amount}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(redemption.requested_at).toLocaleDateString()}
                        </p>
                        {redemption.status === "approved" && redemption.voucher_code && (
                          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Voucher Code</p>
                            <p className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
                              {redemption.voucher_code}
                            </p>
                          </div>
                        )}
                        {redemption.status === "rejected" && redemption.rejection_reason && (
                          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                            <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-1">Rejection Reason</p>
                            <p className="text-sm text-red-600 dark:text-red-400">{redemption.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                      {getStatusBadge(redemption.status)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Redeem Points Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Available Points:</strong> {myPoints.total}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Conversion Rate:</strong> 1 point = ₹{conversionRate}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <strong>Minimum:</strong> 100 points
              </p>
            </div>
            <div>
              <Label htmlFor="redeemPoints">Points to Redeem</Label>
              <Input
                id="redeemPoints"
                type="number"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                placeholder="Enter points"
                min="100"
                max={myPoints.total}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {myPoints.total} points
              </p>
            </div>
            {redeemPoints && parseFloat(redeemPoints) >= 100 && (
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400">
                  You will receive: <strong>₹{(parseFloat(redeemPoints) * conversionRate).toFixed(2)}</strong> voucher
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  (Conversion: 1 point = ₹{conversionRate})
                </p>
              </div>
            )}
            <Button onClick={requestRedemption} className="w-full">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
