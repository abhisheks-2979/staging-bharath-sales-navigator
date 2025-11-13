import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Eye, Upload, X } from "lucide-react";
import { toast } from "sonner";
import InvoicePreview from "./InvoicePreview";

export default function InvoiceTemplateSelector() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [importData, setImportData] = useState({
    name: "",
    description: "",
    file: null as File | null
  });
  const [companyData, setCompanyData] = useState<any | null>(null);
  useEffect(() => {
    fetchCurrentTemplate();
    fetchCustomTemplates();
  }, []);

  const fetchCurrentTemplate = async () => {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setCompanyId(data.id);
      setSelectedTemplate(data.invoice_template || "template1");
      setCompanyData(data);
    }
  };

  const fetchCustomTemplates = async () => {
    const { data, error } = await supabase
      .from("custom_invoice_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching custom templates:", error);
      return;
    }

    setCustomTemplates(data || []);
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
    },
    {
      id: "template4",
      name: "Template 4 - Green Accent Professional",
      description: "Modern design with green accents, dark header/footer, and clean layout"
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only invoice templates (PDF and images)
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload an invoice template file (PDF, PNG, or JPG only)");
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      e.target.value = ''; // Reset input
      return;
    }

    setImportData({ ...importData, file });
  };

  const handleImportTemplate = async () => {
    if (!importData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!importData.file) {
      toast.error("Please select a file to upload");
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = importData.file.name.split('.').pop();
      const fileName = `template-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('invoice-templates')
        .upload(filePath, importData.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoice-templates')
        .getPublicUrl(filePath);

      // Save template metadata
      const { error: insertError } = await supabase
        .from('custom_invoice_templates')
        .insert({
          name: importData.name.trim(),
          description: importData.description.trim() || null,
          template_file_url: publicUrl,
        });

      if (insertError) throw insertError;

      toast.success("Template imported successfully");
      setShowImportDialog(false);
      setImportData({ name: "", description: "", file: null });
      fetchCustomTemplates();
    } catch (error: any) {
      console.error("Error importing template:", error);
      toast.error(error.message || "Failed to import template");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCustomTemplate = async (templateId: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from('invoice-templates')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('custom_invoice_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success("Template deleted successfully");
      fetchCustomTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error(error.message || "Failed to delete template");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Invoice Template</CardTitle>
            <Button onClick={() => setShowImportDialog(true)} size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import Template
            </Button>
          </div>
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

            {/* Custom Templates */}
            {customTemplates.map((template) => (
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
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                    </Label>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(template.template_file_url, '_blank');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Template
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomTemplate(template.id, template.template_file_url);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Template Preview - {templates.find(t => t.id === previewTemplate)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewTemplate && (
              <InvoicePreview
                company={companyData || sampleCompany}
                retailer={sampleRetailer}
                cartItems={sampleCart}
                orderId="INV12345678"
                templateStyle={previewTemplate as "template1" | "template2" | "template3" | "template4"}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Template Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Custom Invoice Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Custom Design 2024"
                value={importData.name}
                onChange={(e) => setImportData({ ...importData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                placeholder="Describe your template..."
                value={importData.description}
                onChange={(e) => setImportData({ ...importData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="template-file">Upload Invoice Template *</Label>
              <Input
                id="template-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload your invoice template design as PDF or image (PNG/JPG). Max 5MB.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Only invoice template files accepted - no text documents or other file types.
              </p>
              {importData.file && (
                <p className="text-sm text-primary mt-2">
                  Selected: {importData.file.name}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportData({ name: "", description: "", file: null });
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button onClick={handleImportTemplate} disabled={uploading}>
                {uploading ? "Uploading..." : "Import Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
