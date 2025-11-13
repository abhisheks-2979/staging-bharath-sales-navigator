import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InvoiceTemplate1 from "./InvoiceTemplate1";
import InvoiceTemplate2 from "./InvoiceTemplate2";
import InvoiceTemplate3 from "./InvoiceTemplate3";

interface InvoiceTemplateRendererProps {
  orderId: string;
  retailerId: string;
  cartItems: any[];
}

export default function InvoiceTemplateRenderer({
  orderId,
  retailerId,
  cartItems,
}: InvoiceTemplateRendererProps) {
  const [company, setCompany] = useState<any>(null);
  const [retailer, setRetailer] = useState<any>(null);
  const [customTemplate, setCustomTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [orderId, retailerId]);

  const fetchData = async () => {
    try {
      // Fetch company details
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (companyData) {
        setCompany(companyData);
        
        // If template is not a default one, fetch custom template
        const templateId = companyData.invoice_template || "template1";
        if (!["template1", "template2", "template3"].includes(templateId)) {
          const { data: customTemplateData } = await supabase
            .from("custom_invoice_templates")
            .select("*")
            .eq("id", templateId)
            .eq("is_active", true)
            .single();
          
          if (customTemplateData) {
            setCustomTemplate(customTemplateData);
          }
        }
      }

      // Fetch retailer details
      const { data: retailerData } = await supabase
        .from("retailers")
        .select("*")
        .eq("id", retailerId)
        .single();

      if (retailerData) {
        setRetailer(retailerData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load invoice data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading invoice...</div>;
  }

  if (!company || !retailer) {
    return <div className="text-sm text-destructive">Missing company or retailer data</div>;
  }

  // Render the appropriate template based on company settings
  const selectedTemplate = company.invoice_template || "template1";

  return (
    <div className="space-y-4">
      {selectedTemplate === "template1" && (
        <InvoiceTemplate1
          company={company}
          retailer={retailer}
          cartItems={cartItems}
          orderId={orderId}
        />
      )}
      {selectedTemplate === "template2" && (
        <InvoiceTemplate2
          company={company}
          retailer={retailer}
          cartItems={cartItems}
          orderId={orderId}
        />
      )}
      {selectedTemplate === "template3" && (
        <InvoiceTemplate3
          company={company}
          retailer={retailer}
          cartItems={cartItems}
          orderId={orderId}
        />
      )}
      {customTemplate && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted p-3 border-b">
            <h3 className="font-semibold text-foreground">{customTemplate.name}</h3>
            {customTemplate.description && (
              <p className="text-sm text-muted-foreground mt-1">{customTemplate.description}</p>
            )}
          </div>
          <div className="p-4">
            {customTemplate.template_file_url.endsWith('.pdf') ? (
              <iframe
                src={customTemplate.template_file_url}
                className="w-full h-[600px] border-0"
                title="Invoice Template Preview"
              />
            ) : (
              <img
                src={customTemplate.template_file_url}
                alt={customTemplate.name}
                className="w-full h-auto"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
