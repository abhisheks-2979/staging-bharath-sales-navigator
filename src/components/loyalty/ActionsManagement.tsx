import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ACTION_TYPES = [
  { value: "first_order", label: "First Order Bonus", icon: "🎉" },
  { value: "order_frequency", label: "Order Frequency Reward", icon: "⚡" },
  { value: "order_value_tiers", label: "Order Value Tiers", icon: "💰" },
  { value: "consecutive_orders", label: "Consecutive Order Streak", icon: "🔥" },
  { value: "new_product_trial", label: "New Product Trial", icon: "🆕" },
  { value: "bulk_order", label: "Bulk Order Bonus", icon: "📦" },
  { value: "timely_payment", label: "Timely Payment", icon: "✅" },
  { value: "monthly_volume", label: "Monthly Volume Achievement", icon: "📊" },
];

export function ActionsManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ["retailer-loyalty-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retailer_loyalty_programs")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: actions, isLoading } = useQuery({
    queryKey: ["retailer-loyalty-actions", selectedProgram],
    queryFn: async () => {
      if (!selectedProgram) return [];
      const { data, error } = await supabase
        .from("retailer_loyalty_actions")
        .select("*")
        .eq("program_id", selectedProgram)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgram,
  });

  const createMutation = useMutation({
    mutationFn: async (action: any) => {
      const { error } = await supabase.from("retailer_loyalty_actions").insert(action);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-loyalty-actions"] });
      toast.success("Action created successfully");
      setIsCreateOpen(false);
    },
    onError: () => toast.error("Failed to create action"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("retailer_loyalty_actions")
        .update({ is_enabled: enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-loyalty-actions"] });
      toast.success("Action updated");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const action = {
      program_id: selectedProgram,
      action_type: formData.get("action_type"),
      action_name: formData.get("action_name"),
      points: Number(formData.get("points")),
      is_enabled: true,
      metadata: {},
    };
    createMutation.mutate(action);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Loyalty Actions</h2>
          <p className="text-sm text-muted-foreground">
            Configure point-earning actions for programs
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.program_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedProgram}>
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Loyalty Action</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="action_type">Action Type</Label>
                  <Select name="action_type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="action_name">Action Name</Label>
                  <Input
                    id="action_name"
                    name="action_name"
                    placeholder="e.g., First Order Welcome Bonus"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="points">Points</Label>
                  <Input
                    type="number"
                    id="points"
                    name="points"
                    placeholder="e.g., 50"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Action
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!selectedProgram ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Select a program to view actions</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div>Loading actions...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {actions?.map((action) => {
            const actionType = ACTION_TYPES.find((t) => t.value === action.action_type);
            return (
              <Card key={action.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>{actionType?.icon}</span>
                      <span>{action.action_name}</span>
                    </CardTitle>
                    <Switch
                      checked={action.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: action.id, enabled: checked })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-semibold">{action.points} Points</span>
                  </div>
                  <Badge variant="secondary">{actionType?.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {actions?.length === 0 && selectedProgram && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No actions yet. Add your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
