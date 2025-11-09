import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoicePDFGeneratorProps {
  invoiceId: string;
  className?: string;
}

export const InvoicePDFGenerator = ({ invoiceId, className }: InvoicePDFGeneratorProps) => {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      // Fetch invoice with all related data
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*),
          companies (*),
          customers (*)
        `)
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Add company logo if available
      if (invoice.companies?.logo_url) {
        try {
          // Load logo as image
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = invoice.companies.logo_url;
          });
          
          // Add logo to PDF
          doc.addImage(img, "PNG", 14, yPos, 40, 20);
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }

      // Company details (right side of logo)
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(invoice.companies?.name || "BHARATH BEVERAGES", 60, yPos + 5);
      
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      if (invoice.companies?.address) {
        const addressLines = doc.splitTextToSize(invoice.companies.address, 120);
        doc.text(addressLines, 60, yPos + 12);
        yPos += addressLines.length * 4;
      }
      
      yPos += 20;
      
      if (invoice.companies?.contact_phone) {
        doc.text(`Phone: ${invoice.companies.contact_phone}`, 60, yPos);
        yPos += 5;
      }
      
      if (invoice.companies?.email) {
        doc.text(`Email: ${invoice.companies.email}`, 60, yPos);
        yPos += 5;
      }
      
      if (invoice.companies?.gstin) {
        doc.text(`GSTIN: ${invoice.companies.gstin}`, 60, yPos);
        yPos += 5;
      }
      
      if (invoice.companies?.state) {
        doc.text(`State: ${invoice.companies.state}`, 60, yPos);
      }

      yPos += 15;

      // Invoice title
      doc.setFillColor(41, 128, 185);
      doc.rect(0, yPos, pageWidth, 15, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      doc.text("TAX INVOICE", pageWidth / 2, yPos + 10, { align: "center" });
      
      yPos += 20;
      doc.setTextColor(0, 0, 0);

      // Bill To and Invoice Details side by side
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Bill To:", 14, yPos);
      doc.text("Invoice Details:", pageWidth / 2 + 10, yPos);
      
      doc.setFont(undefined, "normal");
      doc.setFontSize(9);
      yPos += 6;

      // Customer details (left)
      const customerName = invoice.customers?.name || "";
      doc.text(customerName, 14, yPos);
      doc.text(`No: ${invoice.invoice_number}`, pageWidth / 2 + 10, yPos);
      yPos += 5;

      if (invoice.customers?.address) {
        const custAddressLines = doc.splitTextToSize(invoice.customers.address, 80);
        doc.text(custAddressLines, 14, yPos);
      }
      
      doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString("en-IN")}`, pageWidth / 2 + 10, yPos);
      yPos += 5;

      if (invoice.due_date) {
        doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString("en-IN")}`, pageWidth / 2 + 10, yPos);
        yPos += 5;
      }

      if (invoice.customers?.contact_phone) {
        doc.text(`Contact No: ${invoice.customers.contact_phone}`, 14, yPos + 10);
      }

      if (invoice.place_of_supply) {
        doc.text(`Place Of Supply: ${invoice.place_of_supply}`, pageWidth / 2 + 10, yPos);
        yPos += 5;
      }

      if (invoice.customers?.state) {
        doc.text(`State: ${invoice.customers.state}`, 14, yPos + 15);
      }

      yPos += 25;

      // Transportation Details
      if (invoice.vehicle_number) {
        doc.setFont(undefined, "bold");
        doc.text("Transportation Details:", 14, yPos);
        doc.setFont(undefined, "normal");
        yPos += 6;
        doc.text(`Vehicle Number: ${invoice.vehicle_number}`, 14, yPos);
        yPos += 10;
      }

      // Items table
      const tableData = invoice.invoice_items.map((item: any, index: number) => [
        (index + 1).toString(),
        item.description,
        item.hsn_sac || "",
        item.quantity.toString(),
        item.unit || "Piece",
        `₹ ${Number(item.price_per_unit).toFixed(2)}`,
        `₹ ${item.gst_rate}%`,
        `₹ ${Number(item.total_amount).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Item name", "HSN/ SAC", "Quantity", "Unit", "Price/ Unit(₹)", "GST(%)", "Amount(₹)"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold"
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 20, halign: "center" },
          7: { cellWidth: 30, halign: "right" }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Tax Summary Table
      const taxSummary: { [key: string]: { taxable: number, cgst: number, sgst: number, total: number } } = {};
      
      invoice.invoice_items.forEach((item: any) => {
        const hsn = item.hsn_sac || "N/A";
        if (!taxSummary[hsn]) {
          taxSummary[hsn] = { taxable: 0, cgst: 0, sgst: 0, total: 0 };
        }
        taxSummary[hsn].taxable += Number(item.taxable_amount);
        taxSummary[hsn].cgst += Number(item.cgst_amount);
        taxSummary[hsn].sgst += Number(item.sgst_amount);
        taxSummary[hsn].total += Number(item.cgst_amount) + Number(item.sgst_amount);
      });

      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Tax Summary:", 14, yPos);
      yPos += 7;

      const taxTableData = Object.entries(taxSummary).map(([hsn, values]) => [
        hsn,
        `₹ ${values.taxable.toFixed(2)}`,
        `${((values.cgst / values.taxable) * 100).toFixed(2)}%`,
        `₹ ${values.cgst.toFixed(2)}`,
        `${((values.sgst / values.taxable) * 100).toFixed(2)}%`,
        `₹ ${values.sgst.toFixed(2)}`,
        `₹ ${values.total.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["HSN/ SAC", "Taxable amount (₹)", "CGST Rate (%)", "Amt (₹)", "SGST Rate (%)", "Amt (₹)", "Total Tax (₹)"]],
        body: taxTableData,
        theme: "plain",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: 0,
          fontSize: 8,
          fontStyle: "bold"
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Totals section
      const totalsX = pageWidth - 70;
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      
      doc.text("Sub Total", totalsX, yPos);
      doc.text(`: ₹ ${Number(invoice.sub_total).toFixed(2)}`, totalsX + 25, yPos);
      yPos += 6;

      doc.text("Total", totalsX, yPos);
      doc.text(`: ₹ ${Number(invoice.total_amount).toFixed(2)}`, totalsX + 25, yPos);
      yPos += 8;

      // Amount in words
      doc.setFont(undefined, "bold");
      doc.text("Invoice Amount in Words:", 14, yPos);
      doc.setFont(undefined, "normal");
      yPos += 5;
      doc.text(invoice.amount_in_words || "", 14, yPos);

      yPos += 15;

      // Terms & Conditions
      if (invoice.terms || invoice.companies?.terms_conditions) {
        doc.setFont(undefined, "bold");
        doc.text("Terms & Conditions:", 14, yPos);
        doc.setFont(undefined, "normal");
        yPos += 5;
        const terms = invoice.terms || invoice.companies?.terms_conditions || "";
        const termsLines = doc.splitTextToSize(terms, pageWidth - 28);
        doc.text(termsLines, 14, yPos);
        yPos += termsLines.length * 5 + 10;
      }

      // Bank Details and Signature side by side
      const bankDetailsX = 14;
      const signatureX = pageWidth / 2 + 10;
      
      doc.setFont(undefined, "bold");
      doc.text("Bank Details:", bankDetailsX, yPos);
      doc.text(`For ${invoice.companies?.name || "BHARATH BEVERAGES"}:`, signatureX, yPos);
      doc.setFont(undefined, "normal");
      yPos += 7;

      if (invoice.companies?.bank_name) {
        doc.text(`Name : ${invoice.companies.bank_name}`, bankDetailsX, yPos);
        yPos += 5;
      }

      if (invoice.companies?.bank_account) {
        doc.text(`Account No.: ${invoice.companies.bank_account}`, bankDetailsX, yPos);
        yPos += 5;
      }

      if (invoice.companies?.ifsc) {
        doc.text(`IFSC code : ${invoice.companies.ifsc}`, bankDetailsX, yPos);
        yPos += 5;
      }

      if (invoice.companies?.account_holder_name) {
        doc.text(`Account holder's name : ${invoice.companies.account_holder_name}`, bankDetailsX, yPos);
      }

      // Signature
      const signatureY = yPos + 20;
      doc.setFont(undefined, "normal");
      doc.text("Authorized Signatory", signatureX, signatureY);

      // Save PDF
      const fileName = `Invoice_${invoice.invoice_number.replace(/\//g, "_")}.pdf`;
      doc.save(fileName);

      toast.success("Invoice PDF generated successfully!");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={generatePDF}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Download PDF"}
    </Button>
  );
};
