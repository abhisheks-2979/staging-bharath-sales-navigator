import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import InvoicePreview from "./InvoicePreview";

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
        // Force default template usage everywhere (Template 4)
        // Explicitly clear any custom template so preview always uses our default renderer
        setCustomTemplate(null);
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

  // Force Template 4 everywhere regardless of company setting
  const selectedTemplate = "template4";
  
  // Map template IDs to template styles
  const getTemplateStyle = (): "template1" | "template2" | "template3" | "template4" => {
    return "template4";
  };

  return (
    <div className="space-y-4">
      {!customTemplate ? (
        <InvoicePreview
          company={company}
          retailer={retailer}
          cartItems={cartItems}
          orderId={orderId}
          templateStyle={getTemplateStyle()}
        />
      ) : (
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
