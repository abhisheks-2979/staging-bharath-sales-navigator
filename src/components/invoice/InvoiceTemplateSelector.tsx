import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Eye } from "lucide-react";
import { toast } from "sonner";
import InvoiceTemplate1 from "./InvoiceTemplate1";
import InvoiceTemplate2 from "./InvoiceTemplate2";
import InvoiceTemplate3 from "./InvoiceTemplate3";

export default function InvoiceTemplateSelector() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  // Sample data for preview
  const sampleCompany = {
    name: "BHARATH BEVERAGES",
    address: "S 15-7-366/2, Bharath Bagh, Kadri Rd, Mangaluru - 575003",
    contact_phone: "8951713030",
    email: "bharath.beverages@bharathgroup.co.in",
    gstin: "29ABDFB8743K1ZZ",
    state: "29-Karnataka",
    bank_name: "CANARA BANK",
    bank_account: "120032473436",
    ifsc: "CNRB0010105",
    account_holder_name: "BHARATH BEVERAGES",
    logo_url: "/bharath-beverages-logo.png"
  };

  const sampleRetailer = {
    name: "Sample Retailer Store",
    address: "123 Main Street, City - 560001",
    phone: "9876543210",
    gst_number: "29AAAAA0000A1Z5"
  };

  const sampleCart = [
    {
      id: "1",
      product_name: "Product A",
      quantity: 10,
      unit: "KG",
      rate: 100,
      total: 1000
    },
    {
      id: "2",
      product_name: "Product B",
      quantity: 5,
      unit: "Pieces",
      rate: 200,
      total: 1000
    }
  ];

  const handlePreview = (templateId: string) => {
    setPreviewTemplate(templateId);
    setShowPreview(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Select Invoice Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
            {templates.map((template) => (
              <div
                key={template.id}
                className={`relative border rounded-lg p-4 transition-all ${
                  selectedTemplate === template.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem 
                    value={template.id} 
                    id={template.id} 
                    className="mt-1" 
                    onClick={() => setSelectedTemplate(template.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={template.id} className="cursor-pointer" onClick={() => setSelectedTemplate(template.id)}>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template.id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Template
                    </Button>
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Template Preview - {templates.find(t => t.id === previewTemplate)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 border rounded-lg p-4 bg-white">
            {previewTemplate === "template1" && (
              <InvoiceTemplate1
                company={sampleCompany}
                retailer={sampleRetailer}
                cartItems={sampleCart}
              />
            )}
            {previewTemplate === "template2" && (
              <InvoiceTemplate2
                company={sampleCompany}
                retailer={sampleRetailer}
                cartItems={sampleCart}
              />
            )}
            {previewTemplate === "template3" && (
              <InvoiceTemplate3
                company={sampleCompany}
                retailer={sampleRetailer}
                cartItems={sampleCart}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
