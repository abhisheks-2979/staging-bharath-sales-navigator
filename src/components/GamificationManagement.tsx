import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Trophy } from "lucide-react";
import { BadgeManagement } from "./BadgeManagement";
import { MetricConfigFields } from "./MetricConfigFields";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Game {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  territories: string[];
  is_all_territories: boolean;
  baseline_target: number;
  is_active: boolean;
}

interface GameStats {
  participants: number;
  total_points: number;
  active_actions: number;
}

interface GameAction {
  id: string;
  game_id: string;
  action_type: string;
  action_name: string;
  points: number;
  is_enabled: boolean;
  metadata: any;
}

interface Redemption {
  id: string;
  user_id: string;
  game_id: string;
  points_redeemed: number;
  voucher_amount: number;
  status: string;
  requested_at: string;
  profiles: {
    full_name: string;
  };
}

interface Achievement {
  user_id: string;
  full_name: string;
  total_points: number;
  action_count: number;
}

const METRIC_TYPES = [
  {
    value: "first_order_new_retailer",
    label: "1. First orders from a new retailer",
    defaultPoints: 5,
    configType: "max_activities",
    description: "Awarded only on the first order ever placed by a newly acquired retailer"
  },
  {
    value: "daily_target",
    label: "2. Meeting daily target",
    defaultPoints: 15,
    configType: "daily_threshold",
    description: "Awarded once per day when the rep hits the defined daily threshold"
  },
  {
    value: "focused_product_sales",
    label: "3. Focused product sales",
    defaultPoints: 5,
    configType: "product_selection",
    description: "Awarded for each order containing a focused product"
  },
  {
    value: "productive_visit",
    label: "4. Productive visits (visits with orders)",
    defaultPoints: 5,
    configType: "daily_limit",
    description: "Awarded for any check-in/visit that results in an order"
  },
  {
    value: "order_frequency",
    label: "5. Frequency of orders from the retailer",
    defaultPoints: 2,
    configType: "consecutive_orders",
    description: "Sequential bonus: Awarded on consecutive orders from the same retailer"
  },
  {
    value: "beat_growth",
    label: "6. Average growth of business in a beat",
    defaultPoints: 5,
    configType: "growth_percentage",
    description: "Requires calculation of sales growth vs. prior period within the user's beat"
  },
  {
    value: "competition_insight",
    label: "7. Capturing competition intelligence",
    defaultPoints: 2,
    configType: "unlimited",
    description: "Awarded upon successful submission of a Competition Intelligence form"
  },
  {
    value: "retailer_feedback",
    label: "8. Capturing retailer feedback",
    defaultPoints: 2,
    configType: "unlimited",
    description: "Awarded upon successful submission of a Retailer Feedback form"
  },
  {
    value: "branding_request",
    label: "9. Capturing branding request",
    defaultPoints: 2,
    configType: "unlimited",
    description: "Awarded upon successful submission of a Branding Request form"
  }
];

export function GamificationManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [actions, setActions] = useState<GameAction[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [territories, setTerritories] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameStats, setGameStats] = useState<Map<string, GameStats>>(new Map());
  const [achievementPeriod, setAchievementPeriod] = useState<"day" | "week" | "month">("month");

  // Form states
  const [gameName, setGameName] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [isAllTerritories, setIsAllTerritories] = useState(false);
  const [baselineTarget, setBaselineTarget] = useState("0");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [rewardPoints, setRewardPoints] = useState("");
  const [metricConfig, setMetricConfig] = useState<any>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  useEffect(() => {
    fetchGames();
    fetchTerritories();
  }, []);

  useEffect(() => {
    if (selectedGame) {
      fetchActions(selectedGame.id);
      fetchAchievements(selectedGame.id);
    }
  }, [selectedGame, achievementPeriod]);

  const fetchTerritories = async () => {
    const { data } = await supabase.from("territories").select("name");
    if (data) setTerritories(data.map((t) => t.name));
  };

  const fetchGames = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gamification_games")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load games");
    } else {
      setGames(data || []);
      if (data && data.length > 0) {
        setSelectedGame(data[0]);
        data.forEach((game) => fetchGameStats(game.id));
      }
    }
    setLoading(false);
  };

  const fetchGameStats = async (gameId: string) => {
    const { data: participantsData } = await supabase
      .from("gamification_points")
      .select("user_id")
      .eq("game_id", gameId);
    const uniqueParticipants = new Set(participantsData?.map((p) => p.user_id) || []).size;

    const { data: pointsData } = await supabase
      .from("gamification_points")
      .select("points")
      .eq("game_id", gameId);
    const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

    const { data: actionsData } = await supabase
      .from("gamification_actions")
      .select("id")
      .eq("game_id", gameId)
      .eq("is_enabled", true);
    const activeActions = actionsData?.length || 0;

    setGameStats(
      (prev) =>
        new Map(prev).set(gameId, {
          participants: uniqueParticipants,
          total_points: totalPoints,
          active_actions: activeActions,
        })
    );
  };

  const fetchActions = async (gameId: string) => {
    const { data, error } = await supabase
      .from("gamification_actions")
      .select("*")
      .eq("game_id", gameId);

    if (error) {
      toast.error("Failed to load actions");
    } else {
      setActions(data || []);
    }
  };

  const fetchAchievements = async (gameId: string) => {
    const now = new Date();
    let startDate: Date;

    if (achievementPeriod === "day") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (achievementPeriod === "week") {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { data, error } = await supabase
      .from("gamification_points")
      .select("user_id, points, profiles(full_name)")
      .eq("game_id", gameId)
      .gte("earned_at", startDate.toISOString());

    if (error) {
      toast.error("Failed to load achievements");
      return;
    }

    const achievementMap = new Map<string, Achievement>();
    data?.forEach((point: any) => {
      const userId = point.user_id;
      if (!achievementMap.has(userId)) {
        achievementMap.set(userId, {
          user_id: userId,
          full_name: point.profiles?.full_name || "Unknown",
          total_points: 0,
          action_count: 0,
        });
      }
      const achievement = achievementMap.get(userId)!;
      achievement.total_points += point.points;
      achievement.action_count += 1;
    });

    const achievementsList = Array.from(achievementMap.values()).sort(
      (a, b) => b.total_points - a.total_points
    );
    setAchievements(achievementsList);
  };

  const fetchRedemptions = async () => {
    const { data, error } = await supabase
      .from("gamification_redemptions")
      .select("*")
      .order("requested_at", { ascending: false });

    if (error) {
      toast.error("Failed to load redemptions");
      return;
    }

    const userIds = [...new Set(data?.map((r) => r.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
    const redemptionsWithProfiles = data?.map((r) => ({
      ...r,
      profiles: profilesMap.get(r.user_id) || { full_name: "Unknown" },
    }));

    setRedemptions(redemptionsWithProfiles || []);
  };

  const handleCreateGame = async () => {
    if (!gameName || !startDate || !endDate || !selectedActivity || !rewardPoints) {
      toast.error("Please fill in all required fields including Activity Name and Reward Points");
      return;
    }

    if (selectedTerritories.length === 0 && !isAllTerritories) {
      toast.error("Please select at least one territory");
      return;
    }

    const { data: gameData, error: gameError } = await supabase
      .from("gamification_games")
      .insert({
        name: gameName,
        description: gameDescription,
        start_date: startDate,
        end_date: endDate,
        territories: isAllTerritories ? [] : selectedTerritories,
        is_all_territories: isAllTerritories,
        baseline_target: parseFloat(baselineTarget),
        is_active: true,
      })
      .select()
      .single();

    if (gameError) {
      toast.error("Failed to create game");
      return;
    }

    const activity = METRIC_TYPES.find((a) => a.value === selectedActivity);
    const { error: actionsError } = await supabase.from("gamification_actions").insert({
      game_id: gameData.id,
      action_type: selectedActivity,
      action_name: activity?.label || selectedActivity,
      points: parseFloat(rewardPoints),
      is_enabled: true,
      max_awardable_activities: metricConfig.max_awardable_activities || null,
      base_daily_target: metricConfig.base_daily_target || null,
      focused_products: metricConfig.focused_products || null,
      max_daily_awards: metricConfig.max_daily_awards || null,
      consecutive_orders_required: metricConfig.consecutive_orders_required || null,
      min_growth_percentage: metricConfig.min_growth_percentage || null,
      target_type: metricConfig.target_type || null,
    });

    if (actionsError) {
      toast.error("Failed to create action");
    } else {
      toast.success("Game created successfully");
      setShowCreateDialog(false);
      resetForm();
      fetchGames();
    }
  };

  const updateAction = async (actionId: string, updates: Partial<GameAction>) => {
    const { error } = await supabase
      .from("gamification_actions")
      .update(updates)
      .eq("id", actionId);

    if (error) {
      toast.error("Failed to update action");
    } else {
      toast.success("Action updated");
      if (selectedGame) fetchActions(selectedGame.id);
    }
  };

  const processRedemption = async (
    redemptionId: string,
    status: string,
    voucherCode?: string,
    rejectionReason?: string
  ) => {
    const { error } = await supabase
      .from("gamification_redemptions")
      .update({
        status,
        voucher_code: voucherCode,
        rejection_reason: rejectionReason,
        processed_at: new Date().toISOString(),
      })
      .eq("id", redemptionId);

    if (error) {
      toast.error("Failed to process redemption");
    } else {
      toast.success(`Redemption ${status}`);
      fetchRedemptions();
    }
  };

  const openEditDialog = (game: Game) => {
    setEditingGame(game);
    setGameName(game.name);
    setGameDescription(game.description);
    setStartDate(game.start_date);
    setEndDate(game.end_date);
    setSelectedTerritories(game.territories);
    setIsAllTerritories(game.is_all_territories);
    setBaselineTarget(game.baseline_target.toString());
    setSelectedActivity("");
    setRewardPoints("");
    setMetricConfig({});
    setShowEditDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const updateGame = async () => {
    if (!editingGame) return;
    if (!gameName || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedTerritories.length === 0 && !isAllTerritories) {
      toast.error("Please select at least one territory");
      return;
    }

    const { error } = await supabase
      .from("gamification_games")
      .update({
        name: gameName,
        description: gameDescription,
        start_date: startDate,
        end_date: endDate,
        territories: isAllTerritories ? [] : selectedTerritories,
        is_all_territories: isAllTerritories,
        baseline_target: parseFloat(baselineTarget),
      })
      .eq("id", editingGame.id);

    if (error) {
      toast.error("Failed to update game");
      return;
    }

    if (selectedActivity && rewardPoints) {
      const activity = METRIC_TYPES.find((a) => a.value === selectedActivity);
      const { error: actionsError } = await supabase.from("gamification_actions").insert({
        game_id: editingGame.id,
        action_type: selectedActivity,
        action_name: activity?.label || selectedActivity,
        points: parseFloat(rewardPoints),
        is_enabled: true,
        max_awardable_activities: metricConfig.max_awardable_activities || null,
        base_daily_target: metricConfig.base_daily_target || null,
        focused_products: metricConfig.focused_products || null,
        max_daily_awards: metricConfig.max_daily_awards || null,
        consecutive_orders_required: metricConfig.consecutive_orders_required || null,
        min_growth_percentage: metricConfig.min_growth_percentage || null,
        target_type: metricConfig.target_type || null,
      });

      if (actionsError) {
        toast.error("Failed to add new activity");
      }
    }

    toast.success("Game updated successfully");
    setShowEditDialog(false);
    resetForm();
    setEditingGame(null);
    fetchGames();
    if (selectedGame?.id === editingGame.id) {
      fetchActions(editingGame.id);
    }
  };

  const deleteGame = async () => {
    if (!gameToDelete) return;

    const { error: actionsError } = await supabase
      .from("gamification_actions")
      .delete()
      .eq("game_id", gameToDelete.id);

    if (actionsError) {
      toast.error("Failed to delete game actions");
      return;
    }

    const { error: gameError } = await supabase
      .from("gamification_games")
      .delete()
      .eq("id", gameToDelete.id);

    if (gameError) {
      toast.error("Failed to delete game");
    } else {
      toast.success("Game deleted successfully");
      setShowDeleteDialog(false);
      setGameToDelete(null);
      if (selectedGame?.id === gameToDelete.id) {
        setSelectedGame(null);
      }
      fetchGames();
    }
  };

  const resetForm = () => {
    setGameName("");
    setGameDescription("");
    setStartDate("");
    setEndDate("");
    setSelectedTerritories([]);
    setIsAllTerritories(false);
    setBaselineTarget("0");
    setSelectedActivity("");
    setRewardPoints("");
    setMetricConfig({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Gamification Management</h2>
          <p className="text-muted-foreground">Configure games, actions, and manage redemptions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Game
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Game</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="activityName">Activity Name *</Label>
                <Select value={selectedActivity} onValueChange={(value) => {
                  setSelectedActivity(value);
                  const activity = METRIC_TYPES.find(a => a.value === value);
                  setRewardPoints(activity?.defaultPoints.toString() || "");
                }}>
                  <SelectTrigger id="activityName">
                    <SelectValue placeholder="Select an activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_TYPES.map((activity) => (
                      <SelectItem key={activity.value} value={activity.value}>
                        {activity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rewardPoints">Reward Points per Activity *</Label>
                <Input
                  id="rewardPoints"
                  type="number"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(e.target.value)}
                  placeholder="Enter points"
                  min="0"
                />
              </div>

              {selectedActivity && (
                <MetricConfigFields
                  metricType={selectedActivity}
                  config={metricConfig}
                  onConfigChange={setMetricConfig}
                />
              )}

              <div>
                <Label htmlFor="gameName">Game Name *</Label>
                <Input
                  id="gameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Enter game name"
                />
              </div>

              <div>
                <Label htmlFor="gameDescription">Description</Label>
                <Textarea
                  id="gameDescription"
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  placeholder="Describe the game objectives..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="baselineTarget">Baseline Target (Entry Points)</Label>
                <Input
                  id="baselineTarget"
                  type="number"
                  value={baselineTarget}
                  onChange={(e) => setBaselineTarget(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="allTerritories"
                  checked={isAllTerritories}
                  onCheckedChange={setIsAllTerritories}
                />
                <Label htmlFor="allTerritories">Apply to all territories</Label>
              </div>

              {!isAllTerritories && (
                <div>
                  <Label>Select Territories *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {territories.map((territory) => (
                      <div key={territory} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`territory-${territory}`}
                          checked={selectedTerritories.includes(territory)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTerritories([...selectedTerritories, territory]);
                            } else {
                              setSelectedTerritories(
                                selectedTerritories.filter((t) => t !== territory)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`territory-${territory}`} className="font-normal">
                          {territory}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleCreateGame} className="flex-1">
                  Create Game
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog - similar structure with different IDs */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Game</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editActivityName">Activity Name</Label>
                <Select value={selectedActivity} onValueChange={(value) => {
                  setSelectedActivity(value);
                  const activity = METRIC_TYPES.find(a => a.value === value);
                  setRewardPoints(activity?.defaultPoints.toString() || "");
                }}>
                  <SelectTrigger id="editActivityName">
                    <SelectValue placeholder="Select to add a new activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_TYPES.map((activity) => (
                      <SelectItem key={activity.value} value={activity.value}>
                        {activity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editRewardPoints">Reward Points per Activity</Label>
                <Input
                  id="editRewardPoints"
                  type="number"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(e.target.value)}
                  placeholder="Enter points"
                  min="0"
                />
              </div>

              {selectedActivity && (
                <MetricConfigFields
                  metricType={selectedActivity}
                  config={metricConfig}
                  onConfigChange={setMetricConfig}
                />
              )}

              <div>
                <Label htmlFor="editGameName">Game Name *</Label>
                <Input
                  id="editGameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Enter game name"
                />
              </div>

              <div>
                <Label htmlFor="editGameDescription">Description</Label>
                <Textarea
                  id="editGameDescription"
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  placeholder="Describe the game objectives..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editStartDate">Start Date *</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="editEndDate">End Date *</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editBaselineTarget">Baseline Target (Entry Points)</Label>
                <Input
                  id="editBaselineTarget"
                  type="number"
                  value={baselineTarget}
                  onChange={(e) => setBaselineTarget(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="editAllTerritories"
                  checked={isAllTerritories}
                  onCheckedChange={setIsAllTerritories}
                />
                <Label htmlFor="editAllTerritories">Apply to all territories</Label>
              </div>

              {!isAllTerritories && (
                <div>
                  <Label>Select Territories *</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {territories.map((territory) => (
                      <div key={territory} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-territory-${territory}`}
                          checked={selectedTerritories.includes(territory)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTerritories([...selectedTerritories, territory]);
                            } else {
                              setSelectedTerritories(
                                selectedTerritories.filter((t) => t !== territory)
                              );
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`edit-territory-${territory}`} className="font-normal">
                          {territory}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={updateGame} className="flex-1">
                  Update Game
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    resetForm();
                    setEditingGame(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Are you sure you want to delete "{gameToDelete?.name}"?</p>
              <p className="text-sm text-muted-foreground">
                This will also delete all associated actions and cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={deleteGame} className="flex-1">
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setGameToDelete(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="games" className="space-y-4">
        <TabsList>
          <TabsTrigger value="games">Games & Actions</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="redemptions" onClick={() => fetchRedemptions()}>
            Redemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Games</CardTitle>
              <CardDescription>Select a game to configure its actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Territories</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map((game) => {
                    const stats = gameStats.get(game.id);
                    return (
                      <TableRow
                        key={game.id}
                        className={selectedGame?.id === game.id ? "bg-muted cursor-pointer" : "cursor-pointer"}
                        onClick={() => setSelectedGame(game)}
                      >
                        <TableCell className="font-medium">{game.name}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(game.start_date).toLocaleDateString()} -{" "}
                          {new Date(game.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {game.is_all_territories ? "All" : game.territories.length}
                        </TableCell>
                        <TableCell>{stats?.participants || 0}</TableCell>
                        <TableCell>{stats?.total_points || 0}</TableCell>
                        <TableCell>
                          <Badge variant={game.is_active ? "default" : "secondary"}>
                            {game.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(game);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGameToDelete(game);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedGame && (
            <Card>
              <CardHeader>
                <CardTitle>Action Configuration - {selectedGame.name}</CardTitle>
                <CardDescription>Set points for each action type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actions.map((action) => (
                    <div key={action.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Switch
                        checked={action.is_enabled}
                        onCheckedChange={(checked) =>
                          updateAction(action.id, { is_enabled: checked })
                        }
                      />
                      <div className="flex-1">
                        <Label>{action.action_name}</Label>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          value={action.points}
                          onChange={(e) =>
                            updateAction(action.id, { points: parseFloat(e.target.value) })
                          }
                          placeholder="Points"
                          disabled={!action.is_enabled}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedGame && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Team Achievements - {selectedGame.name}</CardTitle>
                    <CardDescription>Points earned by team members</CardDescription>
                  </div>
                  <Select
                    value={achievementPeriod}
                    onValueChange={(value: "day" | "week" | "month") =>
                      setAchievementPeriod(value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No achievements recorded for this period
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Total Points</TableHead>
                        <TableHead>Activities</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {achievements.map((achievement, index) => (
                        <TableRow key={achievement.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {index < 3 && <Trophy className="h-4 w-4 text-yellow-500" />}
                              <span className="font-bold">#{index + 1}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{achievement.full_name}</TableCell>
                          <TableCell>
                            <Badge variant="default">{achievement.total_points}</Badge>
                          </TableCell>
                          <TableCell>{achievement.action_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="badges" className="space-y-4">
          <BadgeManagement />
        </TabsContent>

        <TabsContent value="redemptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Redemption Requests</CardTitle>
              <CardDescription>Review and process user redemption requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {redemptions.map((redemption) => (
                  <div key={redemption.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">{redemption.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(redemption.requested_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          redemption.status === "approved"
                            ? "default"
                            : redemption.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {redemption.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Points:</span>{" "}
                        {redemption.points_redeemed}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Voucher Amount:</span> ₹
                        {redemption.voucher_amount}
                      </div>
                    </div>
                    {redemption.status === "pending" && (
                      <div className="flex gap-2">
                        <Input placeholder="Voucher Code" id={`voucher-${redemption.id}`} />
                        <Button
                          size="sm"
                          onClick={() => {
                            const input = document.getElementById(
                              `voucher-${redemption.id}`
                            ) as HTMLInputElement;
                            if (input?.value) {
                              processRedemption(redemption.id, "approved", input.value);
                            } else {
                              toast.error("Please enter a voucher code");
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const reason = prompt("Reason for rejection:");
                            if (reason) {
                              processRedemption(redemption.id, "rejected", undefined, reason);
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
