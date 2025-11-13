import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { toast } from "sonner";

export default function InvoiceTemplateSelector() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentTemplate();
  }, []);

  const fetchCurrentTemplate = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, invoice_template")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setCompanyId(data.id);
      setSelectedTemplate(data.invoice_template || "template1");
    }
  };

  const handleSaveTemplate = async () => {
    if (!companyId) {
      toast.error("Please save company details first in the Company Settings tab");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ invoice_template: selectedTemplate })
        .eq("id", companyId);

      if (error) throw error;
      toast.success("Invoice template saved successfully");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    {
      id: "template1",
      name: "Template 1 - Traditional GST Layout",
      description: "Classic invoice layout with detailed GST breakdown, ideal for formal business transactions"
    },
    {
      id: "template2",
      name: "Template 2 - Modern Minimalist",
      description: "Clean and simple design with essential details, perfect for modern businesses"
    },
    {
      id: "template3",
      name: "Template 3 - Professional Elegant",
      description: "Sophisticated layout with elegant typography and organized sections"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Invoice Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
          {templates.map((template) => (
            <div
              key={template.id}
              className={`relative border rounded-lg p-4 transition-all cursor-pointer hover:border-primary ${
                selectedTemplate === template.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={template.id} className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{template.name}</span>
                      {selectedTemplate === template.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.description}
                    </p>
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </RadioGroup>

        <Button
          onClick={handleSaveTemplate}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Saving..." : "Save Template Selection"}
        </Button>
      </CardContent>
    </Card>
  );
}
