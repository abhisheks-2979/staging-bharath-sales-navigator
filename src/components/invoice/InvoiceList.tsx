import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, MessageSquare, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          retailers:customer_id (name, address, phone, gst_number),
          companies (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error: any) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const sendWhatsApp = async (invoiceId: string, customerPhone: string | null) => {
    if (!customerPhone) {
      toast.error("Customer phone number not found");
      return;
    }

    try {
      toast.info("Sending invoice via WhatsApp...");
      const { data, error } = await supabase.functions.invoke('send-invoice-whatsapp', {
        body: { invoiceId, customerPhone }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Invoice sent via WhatsApp successfully!");
      } else {
        throw new Error(data.error || 'Failed to send WhatsApp message');
      }
    } catch (error: any) {
      console.error('WhatsApp send error:', error);
      toast.error(error.message || "Failed to send invoice via WhatsApp");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      draft: "secondary",
      issued: "default",
      paid: "success",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status.toUpperCase()}</Badge>;
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
        <CardTitle>All Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.retailers?.name || "N/A"}</TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), "dd MMM yyyy")}</TableCell>
                    <TableCell>₹{parseFloat(invoice.total_amount).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => selectTemplate(invoice.id)}
                          title="Use this template for cart invoices"
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                        <InvoicePDFGenerator invoiceId={invoice.id} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info("View template details")}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteInvoice(invoice.id)}
                        >
                          <Trash2 className="w-4 h-4" />
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
