import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Edit, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ProgramsManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: programs, isLoading } = useQuery({
    queryKey: ["retailer-loyalty-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retailer_loyalty_programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (program: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("retailer_loyalty_programs").insert({
        ...program,
        created_by: userData?.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-loyalty-programs"] });
      toast.success("Program created successfully");
      setIsCreateOpen(false);
    },
    onError: () => toast.error("Failed to create program"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("retailer_loyalty_programs")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retailer-loyalty-programs"] });
      toast.success("Program updated successfully");
      setEditingProgram(null);
    },
    onError: () => toast.error("Failed to update program"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const program = {
      program_name: formData.get("program_name"),
      description: formData.get("description"),
      start_date: formData.get("start_date"),
      end_date: formData.get("end_date"),
      points_to_rupee_conversion: Number(formData.get("conversion")),
      is_all_territories: formData.get("all_territories") === "on",
      is_active: formData.get("is_active") === "on",
    };

    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, updates: program });
    } else {
      createMutation.mutate(program);
    }
  };

  if (isLoading) {
    return <div>Loading programs...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Loyalty Programs</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage retailer loyalty programs
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Loyalty Program</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="program_name">Program Name</Label>
                <Input
                  id="program_name"
                  name="program_name"
                  placeholder="e.g., Diwali Loyalty 2025"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Program description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input type="date" id="start_date" name="start_date" required />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input type="date" id="end_date" name="end_date" required />
                </div>
              </div>
              <div>
                <Label htmlFor="conversion">Points to Rupee Conversion</Label>
                <Input
                  type="number"
                  id="conversion"
                  name="conversion"
                  placeholder="e.g., 10 (10 points = ₹1)"
                  defaultValue="10"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="all_territories" name="all_territories" defaultChecked />
                <Label htmlFor="all_territories">Apply to all territories</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_active" name="is_active" defaultChecked />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <Button type="submit" className="w-full">
                Create Program
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {programs?.map((program) => (
          <Card key={program.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{program.program_name}</CardTitle>
                <Badge variant={program.is_active ? "default" : "secondary"}>
                  {program.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{program.description}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(program.start_date).toLocaleDateString()} -{" "}
                    {new Date(program.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>{program.points_to_rupee_conversion} points = ₹1</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setEditingProgram(program)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Program
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {programs?.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No programs yet. Create your first one!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
