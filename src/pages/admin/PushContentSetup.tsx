import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Template {
  id: string;
  template_name: string;
  template_type: string;
  description: string;
  content_structure: any;
  default_schedule_time: string;
  is_active: boolean;
}

const templateTypes = [
  { value: "day_summary", label: "My Day Summary" },
  { value: "next_day_plan", label: "Next Day Plan" },
  { value: "weekly_update", label: "This Week Update" },
  { value: "expense_report", label: "My Weekly Expense Report" },
  { value: "performance", label: "My Performance Report" },
  { value: "top_retailers", label: "My Top Retailers" },
  { value: "focused_products", label: "Focused Products Update" },
  { value: "high_value_orders", label: "High Value Orders" },
];

export default function PushContentSetup() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    template_name: "",
    template_type: "",
    description: "",
    default_schedule_time: "09:00",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("push_content_templates")
      .select("*")
      .order("template_name");

    if (data) {
      setTemplates(data);
    }
  };

  const handleSubmit = async () => {
    if (!formData.template_name || !formData.template_type) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const templateData = {
        template_name: formData.template_name,
        template_type: formData.template_type,
        description: formData.description,
        content_structure: getDefaultContentStructure(formData.template_type),
        default_schedule_time: formData.default_schedule_time + ":00",
        is_active: true,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("push_content_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        const { error } = await supabase
          .from("push_content_templates")
          .insert(templateData);

        if (error) throw error;
        toast.success("Template created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to save template: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("push_content_templates")
        .update({ is_active: !currentStatus })
        .eq("id", templateId);

      if (error) throw error;
      toast.success(currentStatus ? "Template deactivated" : "Template activated");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to update template status");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("push_content_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to delete template");
    }
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_type: template.template_type,
      description: template.description,
      default_schedule_time: template.default_schedule_time?.slice(0, 5) || "09:00",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      template_type: "",
      description: "",
      default_schedule_time: "09:00",
    });
    setEditingTemplate(null);
  };

  const getDefaultContentStructure = (templateType: string) => {
    const structures: Record<string, any> = {
      day_summary: { sections: ["visits", "orders", "expenses", "distance_traveled"] },
      next_day_plan: { sections: ["scheduled_visits", "beat_plan", "reminders"] },
      weekly_update: { sections: ["total_visits", "total_orders", "achievements", "comparison"] },
      expense_report: { sections: ["total_expenses", "category_breakdown", "pending_approvals"] },
      performance: { sections: ["sales", "visits", "productivity", "targets"] },
      top_retailers: { sections: ["top_by_value", "top_by_frequency", "growth"] },
      focused_products: { sections: ["retailers_list", "products_sold", "achievements"] },
      high_value_orders: { sections: ["order_list", "total_value", "retailers"] },
    };
    return structures[templateType] || { sections: [] };
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Push Content Setup</h1>
              <p className="text-muted-foreground">Manage automated content templates for users</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Type *</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, template_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={formData.template_name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, template_name: e.target.value }))
                    }
                    placeholder="e.g., My Day Summary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe what this template does"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Schedule Time</Label>
                  <Input
                    type="time"
                    value={formData.default_schedule_time}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, default_schedule_time: e.target.value }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : editingTemplate ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className={template.is_active ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{template.template_name}</CardTitle>
                      {template.is_active ? (
                        <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1">
                          <EyeOff className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      {template.description || "No description"}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      Default time: {template.default_schedule_time?.slice(0, 5) || "Not set"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={() =>
                        toggleTemplateStatus(template.id, template.is_active)
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}

          {templates.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No templates created yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "New Template" to create your first push content template.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}