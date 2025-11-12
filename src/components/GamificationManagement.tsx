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
import { Loader2, Plus, Trash2, Award, Settings, Users, Medal, Pencil, Trophy } from "lucide-react";
import { BadgeManagement } from "./BadgeManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
const ACTIVITY_TYPES = [{
  value: "new_retailer",
  label: "Adding a new retailer"
}, {
  value: "first_order_new_retailer",
  label: "Adding new orders from this new retailer"
}, {
  value: "order_value",
  label: "Order value"
}, {
  value: "order_quantity",
  label: "Order quantity"
}, {
  value: "focused_product_sales",
  label: "Focused product sales"
}, {
  value: "productive_visit",
  label: "Productive visits (visits with orders)"
}, {
  value: "order_frequency",
  label: "Frequency of orders from the retailer"
}, {
  value: "beat_growth",
  label: "Average growth of business in a beat"
}, {
  value: "competition_insight",
  label: "Capturing competition intelligence"
}, {
  value: "product_feedback",
  label: "Capturing market feedback"
}];
export function GamificationManagement() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [actions, setActions] = useState<GameAction[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [territories, setTerritories] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [gameStats, setGameStats] = useState<Map<string, GameStats>>(new Map());

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  useEffect(() => {
    fetchGames();
    fetchTerritories();
  }, []);
  useEffect(() => {
    if (selectedGame) {
      fetchActions(selectedGame.id);
    }
  }, [selectedGame]);
  const fetchTerritories = async () => {
    const {
      data
    } = await supabase.from("territories").select("name");
    if (data) setTerritories(data.map(t => t.name));
  };
  const fetchGames = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from("gamification_games").select("*").order("created_at", {
      ascending: false
    });
    if (error) {
      toast.error("Failed to load games");
    } else {
      setGames(data || []);
      if (data && data.length > 0) {
        setSelectedGame(data[0]);
        // Fetch stats for all games
        data.forEach(game => fetchGameStats(game.id));
      }
    }
    setLoading(false);
  };
  const fetchGameStats = async (gameId: string) => {
    // Fetch participants count
    const {
      data: participantsData
    } = await supabase.from("gamification_points").select("user_id").eq("game_id", gameId);
    const uniqueParticipants = new Set(participantsData?.map(p => p.user_id) || []).size;

    // Fetch total points distributed
    const {
      data: pointsData
    } = await supabase.from("gamification_points").select("points").eq("game_id", gameId);
    const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

    // Fetch active actions count
    const {
      data: actionsData
    } = await supabase.from("gamification_actions").select("id").eq("game_id", gameId).eq("is_enabled", true);
    const activeActions = actionsData?.length || 0;
    setGameStats(prev => new Map(prev).set(gameId, {
      participants: uniqueParticipants,
      total_points: totalPoints,
      active_actions: activeActions
    }));
  };
  const fetchActions = async (gameId: string) => {
    const {
      data,
      error
    } = await supabase.from("gamification_actions").select("*").eq("game_id", gameId);
    if (error) {
      toast.error("Failed to load actions");
    } else {
      setActions(data || []);
    }
  };
  const fetchRedemptions = async () => {
    const {
      data,
      error
    } = await supabase.from("gamification_redemptions").select("*").order("requested_at", {
      ascending: false
    });
    if (error) {
      toast.error("Failed to load redemptions");
      return;
    }

    // Fetch user profiles separately
    const userIds = [...new Set(data?.map(r => r.user_id) || [])];
    const {
      data: profilesData
    } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
    const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const redemptionsWithProfiles = data?.map(r => ({
      ...r,
      profiles: profileMap.get(r.user_id) || {
        full_name: "Unknown User"
      }
    })) || [];
    setRedemptions(redemptionsWithProfiles);
  };
  const createGame = async () => {
    if (!gameName || !startDate || !endDate || !selectedActivity || !rewardPoints) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (selectedTerritories.length === 0 && !isAllTerritories) {
      toast.error("Please select at least one territory");
      return;
    }
    const {
      data: gameData,
      error: gameError
    } = await supabase.from("gamification_games").insert({
      name: gameName,
      description: gameDescription,
      start_date: startDate,
      end_date: endDate,
      territories: isAllTerritories ? [] : selectedTerritories,
      is_all_territories: isAllTerritories,
      baseline_target: parseFloat(baselineTarget),
      is_active: true
    }).select().single();
    if (gameError) {
      toast.error("Failed to create game");
      return;
    }

    // Create the selected activity action
    const activity = ACTIVITY_TYPES.find(a => a.value === selectedActivity);
    const {
      error: actionsError
    } = await supabase.from("gamification_actions").insert({
      game_id: gameData.id,
      action_type: selectedActivity,
      action_name: activity?.label || selectedActivity,
      points: parseFloat(rewardPoints),
      is_enabled: true
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
    const {
      error
    } = await supabase.from("gamification_actions").update(updates).eq("id", actionId);
    if (error) {
      toast.error("Failed to update action");
    } else {
      toast.success("Action updated");
      if (selectedGame) fetchActions(selectedGame.id);
    }
  };
  const processRedemption = async (redemptionId: string, status: string, voucherCode?: string, rejectionReason?: string) => {
    const {
      error
    } = await supabase.from("gamification_redemptions").update({
      status,
      voucher_code: voucherCode,
      rejection_reason: rejectionReason,
      processed_at: new Date().toISOString()
    }).eq("id", redemptionId);
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
    setShowEditDialog(true);
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
    const {
      error
    } = await supabase.from("gamification_games").update({
      name: gameName,
      description: gameDescription,
      start_date: startDate,
      end_date: endDate,
      territories: isAllTerritories ? [] : selectedTerritories,
      is_all_territories: isAllTerritories,
      baseline_target: parseFloat(baselineTarget)
    }).eq("id", editingGame.id);
    if (error) {
      toast.error("Failed to update game");
      return;
    }

    // If new activity is selected, add it
    if (selectedActivity && rewardPoints) {
      const activity = ACTIVITY_TYPES.find(a => a.value === selectedActivity);
      const {
        error: actionsError
      } = await supabase.from("gamification_actions").insert({
        game_id: editingGame.id,
        action_type: selectedActivity,
        action_name: activity?.label || selectedActivity,
        points: parseFloat(rewardPoints),
        is_enabled: true
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

    // First delete all associated actions
    const {
      error: actionsError
    } = await supabase.from("gamification_actions").delete().eq("game_id", gameToDelete.id);
    if (actionsError) {
      toast.error("Failed to delete game actions");
      return;
    }

    // Then delete the game
    const {
      error: gameError
    } = await supabase.from("gamification_games").delete().eq("id", gameToDelete.id);
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
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Gamification Management</h2>
          <p className="text-muted-foreground">Configure games, actions, and manage redemptions</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
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
                <Label htmlFor="gameDescription">Description</Label>
                <Textarea id="gameDescription" value={gameDescription} onChange={e => setGameDescription(e.target.value)} placeholder="Describe the game objectives..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="baselineTarget">Baseline Target (Entry Points)</Label>
                <Input id="baselineTarget" type="number" value={baselineTarget} onChange={e => setBaselineTarget(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="activityName">Activity Name *</Label>
                <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                  <SelectTrigger id="activityName">
                    <SelectValue placeholder="Select an activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(activity => <SelectItem key={activity.value} value={activity.value}>
                        {activity.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="rewardPoints">Reward Points per Activity *</Label>
                <Input id="rewardPoints" type="number" value={rewardPoints} onChange={e => setRewardPoints(e.target.value)} placeholder="Enter points" min="0" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="allTerritories" checked={isAllTerritories} onCheckedChange={setIsAllTerritories} />
                <Label htmlFor="allTerritories">Apply to All Territories</Label>
              </div>
              {!isAllTerritories && <div>
                  <Label>Select Territories *</Label>
                  <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                    {territories.map(territory => <div key={territory} className="flex items-center space-x-2 mb-2">
                        <input type="checkbox" id={territory} checked={selectedTerritories.includes(territory)} onChange={e => {
                    if (e.target.checked) {
                      setSelectedTerritories([...selectedTerritories, territory]);
                    } else {
                      setSelectedTerritories(selectedTerritories.filter(t => t !== territory));
                    }
                  }} />
                        <Label htmlFor={territory}>{territory}</Label>
                      </div>)}
                  </div>
                </div>}
              <Button onClick={createGame} className="w-full">Create Game</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="games" className="space-y-4" onValueChange={v => v === "redemptions" && fetchRedemptions()}>
        <TabsList>
          <TabsTrigger value="games">
            <Settings className="mr-2 h-4 w-4" />
            Games & Actions
          </TabsTrigger>
          <TabsTrigger value="badges">
            <Medal className="mr-2 h-4 w-4" />
            Badges
          </TabsTrigger>
          <TabsTrigger value="redemptions">
            <Award className="mr-2 h-4 w-4" />
            Redemptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {games.map(game => {
            const stats = gameStats.get(game.id);
            const daysRemaining = Math.ceil((new Date(game.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const isExpired = daysRemaining < 0;
            return <Card key={game.id} className={`cursor-pointer transition-all hover:shadow-lg ${selectedGame?.id === game.id ? "border-primary ring-2 ring-primary/20" : ""}`} onClick={() => setSelectedGame(game)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{game.name}</CardTitle>
                        <CardDescription>{game.description || "No description"}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button variant="ghost" size="icon" onClick={e => {
                      e.stopPropagation();
                      openEditDialog(game);
                    }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={e => {
                      e.stopPropagation();
                      setGameToDelete(game);
                      setShowDeleteDialog(true);
                    }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Badge variant={game.is_active && !isExpired ? "default" : "secondary"}>
                          {isExpired ? "Expired" : game.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Date Information */}
                    <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">{new Date(game.start_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-medium">{new Date(game.end_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Days Remaining */}
                    {!isExpired && <div className="text-center p-2 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium text-primary">
                          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                        </p>
                      </div>}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-600">{stats?.participants || 0}</p>
                        <p className="text-xs text-muted-foreground">Participants</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <Trophy className="h-5 w-5 mx-auto mb-1 text-green-600" />
                        <p className="text-2xl font-bold text-green-600">{stats?.total_points || 0}</p>
                        <p className="text-xs text-muted-foreground">Points Given</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <Settings className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                        <p className="text-2xl font-bold text-purple-600">{stats?.active_actions || 0}</p>
                        <p className="text-xs text-muted-foreground">Active Actions</p>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-2 text-sm border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Target:</span>
                        <span className="font-medium">{game.baseline_target} points</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Territories:</span>
                        <span className="font-medium text-right">
                          {game.is_all_territories ? "All Territories" : `${game.territories.length} selected`}
                        </span>
                      </div>
                      {!game.is_all_territories && game.territories.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                          {game.territories.slice(0, 3).map(territory => <Badge key={territory} variant="outline" className="text-xs">
                              {territory}
                            </Badge>)}
                          {game.territories.length > 3 && <Badge variant="outline" className="text-xs">
                              +{game.territories.length - 3} more
                            </Badge>}
                        </div>}
                    </div>
                  </CardContent>
                </Card>;
          })}
          </div>

          {selectedGame && <Card>
              <CardHeader>
                <CardTitle>Action Configuration - {selectedGame.name}</CardTitle>
                <CardDescription>Set points for each action type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actions.map(action => <div key={action.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Switch checked={action.is_enabled} onCheckedChange={checked => updateAction(action.id, {
                  is_enabled: checked
                })} />
                      <div className="flex-1">
                        <Label>{action.action_name}</Label>
                      </div>
                      <div className="w-32">
                        <Input type="number" value={action.points} onChange={e => updateAction(action.id, {
                    points: parseFloat(e.target.value)
                  })} placeholder="Points" disabled={!action.is_enabled} />
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>}
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
                {redemptions.map(redemption => <div key={redemption.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold">{redemption.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(redemption.requested_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={redemption.status === "approved" ? "default" : redemption.status === "rejected" ? "destructive" : "secondary"}>
                        {redemption.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm"><strong>Points:</strong> {redemption.points_redeemed}</p>
                        <p className="text-sm"><strong>Voucher Amount:</strong> ₹{redemption.voucher_amount}</p>
                      </div>
                      {redemption.status === "pending" && <div className="flex gap-2">
                          <Button size="sm" onClick={() => {
                      const code = prompt("Enter voucher code:");
                      if (code) processRedemption(redemption.id, "approved", code);
                    }}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => {
                      const reason = prompt("Enter rejection reason:");
                      if (reason) processRedemption(redemption.id, "rejected", undefined, reason);
                    }}>
                            Reject
                          </Button>
                        </div>}
                    </div>
                  </div>)}
                {redemptions.length === 0 && <p className="text-center text-muted-foreground py-8">No redemption requests yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editGameName">Game Name *</Label>
              <Input id="editGameName" value={gameName} onChange={e => setGameName(e.target.value)} placeholder="Q1 2024 Sales Challenge" />
            </div>
            <div>
              <Label htmlFor="editGameDescription">Description</Label>
              <Textarea id="editGameDescription" value={gameDescription} onChange={e => setGameDescription(e.target.value)} placeholder="Describe the game objectives..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editStartDate">Start Date *</Label>
                <Input id="editStartDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="editEndDate">End Date *</Label>
                <Input id="editEndDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="editBaselineTarget">Baseline Target (Entry Points)</Label>
              <Input id="editBaselineTarget" type="number" value={baselineTarget} onChange={e => setBaselineTarget(e.target.value)} placeholder="0" />
            </div>
            
            <div className="border-t pt-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-2">Add New Activity (Optional)</p>
                <p>Existing activities can be managed in the Action Configuration section below.</p>
              </div>
              
              <div>
                <Label htmlFor="editActivityName">Activity Name</Label>
                <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                  <SelectTrigger id="editActivityName">
                    <SelectValue placeholder="Select an activity to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(activity => <SelectItem key={activity.value} value={activity.value}>
                        {activity.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editRewardPoints">Reward Points per Activity</Label>
                <Input id="editRewardPoints" type="number" value={rewardPoints} onChange={e => setRewardPoints(e.target.value)} placeholder="Enter points for new activity" min="0" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="editAllTerritories" checked={isAllTerritories} onCheckedChange={setIsAllTerritories} />
              <Label htmlFor="editAllTerritories">Apply to All Territories</Label>
            </div>
            {!isAllTerritories && <div>
                <Label>Select Territories *</Label>
                <div className="border rounded-md p-4 max-h-40 overflow-y-auto">
                  {territories.map(territory => <div key={territory} className="flex items-center space-x-2 mb-2">
                      <input type="checkbox" id={`edit-${territory}`} checked={selectedTerritories.includes(territory)} onChange={e => {
                  if (e.target.checked) {
                    setSelectedTerritories([...selectedTerritories, territory]);
                  } else {
                    setSelectedTerritories(selectedTerritories.filter(t => t !== territory));
                  }
                }} />
                      <Label htmlFor={`edit-${territory}`}>{territory}</Label>
                    </div>)}
                </div>
              </div>}
            <Button onClick={updateGame} className="w-full">Update Game</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{gameToDelete?.name}"? This will also delete all associated actions and cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setGameToDelete(null);
            }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteGame}>
                Delete Game
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}