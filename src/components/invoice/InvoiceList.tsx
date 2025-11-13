import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { InvoicePDFGenerator } from "./InvoicePDFGenerator";

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Fetch invoices with optional joins (left joins) to handle templates without customer/company data
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          retailers:customer_id (name, address, phone, gst_number),
          companies:company_id (*)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching templates:", error);
        throw error;
      }
      
      console.log("Fetched templates:", data);
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return <div className="text-center py-8">Loading invoices...</div>;
  }

  const selectTemplate = (templateId: string) => {
    localStorage.setItem('selected_invoice_template', templateId);
    toast.success("Template selected for cart invoices");
  };

  const getSelectedTemplate = () => {
    return localStorage.getItem('selected_invoice_template');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Templates ({invoices.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Template Number</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                  No templates found. Create your first template!
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const isSelected = getSelectedTemplate() === invoice.id;
                
                return (
                  <TableRow key={invoice.id} className={isSelected ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {invoice.invoice_number}
                        {isSelected && (
                          <Badge variant="default" className="ml-2">
                            <Check className="w-3 h-3 mr-1" />
                            Active Template
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <InvoicePDFGenerator 
                          invoiceId={invoice.id} 
                          buttonLabel="View Template"
                        />
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => selectTemplate(invoice.id)}
                          title="Use this template for all cart invoices"
                        >
                          {isSelected ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Selected
                            </>
                          ) : (
                            "Select Template"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
