import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LeaderboardTimeFilters } from "@/components/LeaderboardTimeFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Award, Gift, Info, Loader2, Medal } from "lucide-react";
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

interface Game {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  baseline_target: number;
}

interface GameWithPoints extends Game {
  activity_name: string;
  earned_points: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [leaderboard, setLeaderboard] = useState<UserPoints[]>([]);
  const [myPoints, setMyPoints] = useState<MyPoints>({ today: 0, week: 0, month: 0, quarter: 0, year: 0, total: 0 });
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [games, setGames] = useState<GameWithPoints[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "quarter" | "year">("month");
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState("");
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [policyType, setPolicyType] = useState<"points" | "redemption">("points");

  useEffect(() => {
    fetchLeaderboardData();
    fetchMyPoints();
    fetchRedemptions();
    fetchGames();
  }, []);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gamification_points")
      .select("user_id, points, earned_at")
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

  const fetchMyPoints = async () => {
    if (!userProfile?.id) return;

    const now = new Date();
    
    // Calculate time ranges (timezone-aware)
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
    
    // Fetch all active games
    const { data: gamesData } = await supabase
      .from("gamification_games")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!gamesData) return;

    // For each game, fetch actions and calculate earned points
    const gamesWithPoints: GameWithPoints[] = await Promise.all(
      gamesData.map(async (game) => {
        // Fetch actions for this game
        const { data: actionsData } = await supabase
          .from("gamification_actions")
          .select("action_name")
          .eq("game_id", game.id)
          .eq("is_enabled", true)
          .limit(1);

        // Fetch user's points for this game
        const { data: pointsData } = await supabase
          .from("gamification_points")
          .select("points")
          .eq("game_id", game.id)
          .eq("user_id", userProfile.id);

        const earnedPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;
        const activityName = actionsData?.[0]?.action_name || "N/A";

        return {
          ...game,
          activity_name: activityName,
          earned_points: earnedPoints
        };
      })
    );

    setGames(gamesWithPoints);
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

    const voucherAmount = Math.floor(points / 100) * 10; // 100 points = ₹10

    const { error } = await supabase
      .from("gamification_redemptions")
      .insert({
        user_id: userProfile.id,
        points_redeemed: points,
        voucher_amount: voucherAmount,
        status: "pending"
      });

    if (error) {
      toast.error("Failed to request redemption");
    } else {
      toast.success("Redemption requested successfully");
      setShowRedeemDialog(false);
      setRedeemPoints("");
      fetchRedemptions();
      fetchMyPoints();
    }
  };

  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return rank;
    }
  };

  const getDisplayPoints = () => {
    switch(timeFilter) {
      case "today": return myPoints.today;
      case "week": return myPoints.week;
      case "month": return myPoints.month;
      case "quarter": return myPoints.quarter;
      case "year": return myPoints.year;
      default: return myPoints.total;
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
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Leaderboard</h1>
                <p className="text-muted-foreground">Track your performance and compete</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setPolicyType("points"); setShowPolicyDialog(true); }}>
                <Info className="mr-2 h-4 w-4" />
                Point Policy
              </Button>
              <Button variant="outline" onClick={() => { setPolicyType("redemption"); setShowPolicyDialog(true); }}>
                <Info className="mr-2 h-4 w-4" />
                Redemption Policy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  My Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <LeaderboardTimeFilters 
                    timeFilter={timeFilter} 
                    onFilterChange={(v: any) => setTimeFilter(v)}
                  />
                </div>
                <div className="text-center">
                  <p className="text-5xl font-bold">{getDisplayPoints()}</p>
                  <p className="text-sm text-muted-foreground mt-2">Total Points: {myPoints.total}</p>
                </div>
                <Button className="w-full mt-4" onClick={() => setShowRedeemDialog(true)}>
                  <Gift className="mr-2 h-4 w-4" />
                  Redeem Points
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Rank</CardTitle>
              </CardHeader>
              <CardContent>
                {userProfile && (
                  <div className="text-center">
                    <p className="text-4xl font-bold">
                      #{leaderboard.findIndex(l => l.user_id === userProfile.id) + 1 || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">out of {leaderboard.length} participants</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="leaderboard" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="leaderboard">
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="games">
                <Award className="mr-2 h-4 w-4" />
                My Games
              </TabsTrigger>
              <TabsTrigger value="badges">
                <Medal className="mr-2 h-4 w-4" />
                Badges
              </TabsTrigger>
              <TabsTrigger value="redemptions">
                <Gift className="mr-2 h-4 w-4" />
                My Redemptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.slice(0, 3).map((item, index) => (
                      <div key={item.user_id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                        <div className="text-3xl">{getRankIcon(index + 1)}</div>
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{item.profiles.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{item.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">{item.total_points} points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.map((item, index) => (
                      <div
                        key={item.user_id}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          item.user_id === userProfile?.id ? "bg-blue-50 border-2 border-blue-200" : "bg-gray-50"
                        }`}
                      >
                        <div className="w-8 text-center font-bold text-muted-foreground">
                          {getRankIcon(index + 1)}
                        </div>
                        <Avatar>
                          <AvatarFallback>{item.profiles.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{item.profiles.full_name}</p>
                        </div>
                        <Badge variant="secondary">{item.total_points} pts</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="games" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>My Active Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {games.map(game => {
                      const completionPercentage = game.baseline_target > 0 
                        ? Math.min((game.earned_points / game.baseline_target) * 100, 100)
                        : 0;
                      const isCompleted = game.earned_points >= game.baseline_target;
                      
                      return (
                        <div key={game.id} className="p-4 border rounded-lg bg-card">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{game.name}</h3>
                              {game.description && (
                                <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
                              )}
                            </div>
                            <Badge variant={isCompleted ? "default" : "secondary"}>
                              {isCompleted ? "Target Achieved" : "Active"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Activity</p>
                              <p className="font-medium">{game.activity_name}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">Base Target</p>
                              <p className="font-medium">{game.baseline_target} points</p>
                            </div>
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <p className="text-sm text-muted-foreground">Earned Points</p>
                              <p className="font-bold text-primary text-xl">{game.earned_points}</p>
                            </div>
                          </div>
                          
                          {/* Progress Bar Section */}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Progress to Target</span>
                              <span className={`text-sm font-bold ${isCompleted ? 'text-green-600' : 'text-primary'}`}>
                                {completionPercentage.toFixed(1)}%
                              </span>
                            </div>
                            <Progress 
                              value={completionPercentage} 
                              className="h-3"
                            />
                            <p className="text-xs text-muted-foreground text-right">
                              {game.earned_points} / {game.baseline_target} points
                              {!isCompleted && ` (${game.baseline_target - game.earned_points} points to go)`}
                            </p>
                          </div>
                          
                          <div className="mt-3 text-sm text-muted-foreground">
                            <p>Period: {new Date(game.start_date).toLocaleDateString()} - {new Date(game.end_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })}
                    {games.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No active games available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Achievements & Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <BadgesDisplay />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="redemptions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Redemption History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {redemptions.map(redemption => (
                      <div key={redemption.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">₹{redemption.voucher_amount} Amazon Voucher</p>
                            <p className="text-sm text-muted-foreground">
                              {redemption.points_redeemed} points • {new Date(redemption.requested_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={
                            redemption.status === "approved" ? "default" :
                            redemption.status === "rejected" ? "destructive" : "secondary"
                          }>
                            {redemption.status}
                          </Badge>
                        </div>
                        {redemption.status === "approved" && redemption.voucher_code && (
                          <div className="mt-2 p-2 bg-green-50 rounded">
                            <p className="text-sm font-medium">Voucher Code: {redemption.voucher_code}</p>
                          </div>
                        )}
                        {redemption.status === "rejected" && redemption.rejection_reason && (
                          <div className="mt-2 p-2 bg-red-50 rounded">
                            <p className="text-sm">{redemption.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {redemptions.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No redemptions yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Available Points: {myPoints.total}</Label>
            </div>
            <div>
              <Label htmlFor="points">Points to Redeem</Label>
              <Input
                id="points"
                type="number"
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                placeholder="Enter points"
              />
              <p className="text-sm text-muted-foreground mt-1">
                100 points = ₹10 Amazon voucher
              </p>
            </div>
            <Button onClick={requestRedemption} className="w-full">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPolicyDialog} onOpenChange={setShowPolicyDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{policyType === "points" ? "Game Point Policy" : "Redemption Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {policyType === "points" ? (
              <>
                <h3 className="font-semibold text-lg">How to Earn Points</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Adding a new retailer</li>
                  <li>First order from a new retailer</li>
                  <li>Total order value (points per ₹100)</li>
                  <li>Order quantity</li>
                  <li>Focused product sales</li>
                  <li>Productive visits (visits with orders)</li>
                  <li>Frequency of orders from retailers</li>
                  <li>Average growth of business in a beat</li>
                  <li>Capturing competition information</li>
                  <li>Product feedback capture</li>
                </ul>
                <p className="text-sm text-muted-foreground">
                  Points are awarded automatically when you complete these actions. Check with your admin for specific point values.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg">Redemption Process</h3>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>Accumulate points through your daily activities</li>
                  <li>Click "Redeem Points" when you have sufficient points</li>
                  <li>Enter the number of points you want to redeem (100 points = ₹10 Amazon voucher)</li>
                  <li>Submit your redemption request</li>
                  <li>Wait for admin approval (usually within 2-3 business days)</li>
                  <li>Once approved, you'll receive your voucher code in the redemption history</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-4">
                  <strong>Note:</strong> Minimum redemption is 100 points. Redemption requests cannot be cancelled once submitted.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
