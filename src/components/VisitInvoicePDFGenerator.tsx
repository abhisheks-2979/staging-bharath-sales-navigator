import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, MessageSquare, Mail } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchAndGenerateInvoice } from "@/utils/invoiceGenerator";

interface VisitInvoicePDFGeneratorProps {
  orderId: string;
  customerPhone?: string;
  className?: string;
}

export const VisitInvoicePDFGenerator = ({ orderId, customerPhone, className }: VisitInvoicePDFGeneratorProps) => {
  const [loading, setLoading] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      // Generate Template 4 invoice using unified generator
      const { blob, invoiceNumber } = await fetchAndGenerateInvoice(orderId);
      
      // Download the PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Invoice downloaded successfully!");
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(error.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const sendViaWhatsApp = async () => {
    if (!customerPhone) {
      toast.error("Customer phone number not available");
      return;
    }

    setSendingWhatsApp(true);
    try {
      // Generate Template 4 invoice
      const { blob, invoiceNumber } = await fetchAndGenerateInvoice(orderId);
      
      const fileName = `invoice-${invoiceNumber}.pdf`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, blob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = await supabase.storage
        .from('invoices')
        .getPublicUrl(uploadData.path);

      console.log('PDF uploaded to:', publicUrl);

      // Send via WhatsApp
      const { error } = await supabase.functions.invoke('send-invoice-whatsapp', {
        body: { 
          invoiceId: orderId,
          customerPhone: customerPhone,
          pdfUrl: publicUrl,
          invoiceNumber: invoiceNumber
        }
      });

      if (error) throw error;
      
      toast.success("Invoice sent via WhatsApp successfully!");
    } catch (error: any) {
      console.error('Error sending invoice via WhatsApp:', error);
      toast.error(error.message || "Failed to send invoice via WhatsApp");
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const sendViaEmail = async () => {
    setSendingEmail(true);
    try {
      // Email functionality to be implemented
      toast.info("Email sharing coming soon!");
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const sendViaSMS = async () => {
    setSendingSMS(true);
    try {
      // SMS functionality to be implemented
      toast.info("SMS sharing coming soon!");
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast.error("Failed to send SMS");
    } finally {
      setSendingSMS(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Invoice Download Button */}
      <Button
        variant="outline"
        size="sm"
        disabled={loading || sendingWhatsApp || sendingEmail || sendingSMS}
        onClick={generatePDF}
        className="flex-1"
      >
        <Download className="mr-2 h-4 w-4" />
        {loading ? "Generating..." : "Invoice"}
      </Button>

      {/* Share Options */}
      {customerPhone && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Share:</span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={loading || sendingWhatsApp}
              onClick={sendViaWhatsApp}
              title="Share via WhatsApp"
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={loading || sendingEmail}
              onClick={sendViaEmail}
              title="Share via Email"
            >
              <Mail className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={loading || sendingSMS}
              onClick={sendViaSMS}
              title="Share via SMS"
            >
              <MessageSquare className="h-4 w-4 text-orange-600" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
