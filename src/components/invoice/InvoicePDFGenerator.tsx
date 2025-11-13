import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoicePDFGeneratorProps {
  invoiceId: string;
  className?: string;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
}

export const InvoicePDFGenerator = ({ 
  invoiceId, 
  className, 
  buttonLabel = "Download PDF",
  buttonIcon 
}: InvoicePDFGeneratorProps) => {
  const [loading, setLoading] = useState(false);

  const defaultIcon = buttonLabel === "Download PDF" ? <Download className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />;

  const generatePDF = async () => {
    setLoading(true);
    try {
      // Fetch invoice with all related data  
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          invoice_items (*),
          companies (*)
        `)
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch retailer data separately
      let customerData: any = null;
      if (invoice.customer_id) {
        const { data: retailer } = await supabase
          .from("retailers")
          .select("name, address, phone, gst_number")
          .eq("id", invoice.customer_id)
          .single();

        // Map retailer data to customer format for PDF generation
        customerData = retailer ? {
          name: retailer.name,
          address: retailer.address,
          contact_phone: retailer.phone,
          gstin: retailer.gst_number,
          state: "29-Karnataka",
        } : null;
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 15;

      // Title at top center
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Tax Invoice", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Draw border for header section
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.rect(10, yPos, pageWidth - 20, 40);

      // Company logo and details in header
      const headerStartY = yPos + 5;
      
      if (invoice.companies?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = invoice.companies.logo_url;
          });
          doc.addImage(img, "PNG", 15, headerStartY, 25, 15);
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }

      // Company name and details
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(invoice.companies?.name || "BHARATH BEVERAGES", 45, headerStartY + 5);
      
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      const companyDetails = [
        invoice.companies?.address,
        `Phone: ${invoice.companies?.contact_phone || ''}`,
        `Email: ${invoice.companies?.email || ''}`,
        `GSTIN: ${invoice.companies?.gstin || ''}`,
        `State: ${invoice.companies?.state || ''}`
      ].filter(Boolean);
      
      let companyY = headerStartY + 10;
      companyDetails.forEach((detail) => {
        if (detail) {
          const lines = doc.splitTextToSize(detail, 140);
          doc.text(lines, 45, companyY);
          companyY += lines.length * 3.5;
        }
      });

      yPos += 45;

      // Bill To and Invoice Details boxes
      doc.rect(10, yPos, (pageWidth - 20) / 2, 30);
      doc.rect(10 + (pageWidth - 20) / 2, yPos, (pageWidth - 20) / 2, 30);

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Bill To:", 15, yPos + 5);
      doc.text("Invoice Details:", 15 + (pageWidth - 20) / 2, yPos + 5);

      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
      
      // Customer details
      const custName = customerData?.name || "";
      doc.text(custName, 15, yPos + 10);
      
      if (customerData?.address) {
        const custAddr = doc.splitTextToSize(customerData.address, 80);
        doc.text(custAddr, 15, yPos + 14);
      }
      
      if (customerData?.contact_phone) {
        doc.text(`Contact No: ${customerData.contact_phone}`, 15, yPos + 22);
      }
      
      if (customerData?.state) {
        doc.text(`State: ${customerData.state}`, 15, yPos + 26);
      }

      // Invoice details
      const invoiceDetailsX = 15 + (pageWidth - 20) / 2;
      doc.text(`No: ${invoice.invoice_number}`, invoiceDetailsX, yPos + 10);
      doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString("en-IN")}`, invoiceDetailsX, yPos + 14);
      
      if (invoice.due_date) {
        doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString("en-IN")}`, invoiceDetailsX, yPos + 18);
      }
      
      if (invoice.place_of_supply) {
        doc.text(`Place Of Supply: ${invoice.place_of_supply}`, invoiceDetailsX, yPos + 22);
      }

      yPos += 35;

      // Transportation Details
      if (invoice.vehicle_number) {
        doc.rect(10, yPos, pageWidth - 20, 8);
        doc.setFont(undefined, "bold");
        doc.text("Transportation Details:", 15, yPos + 5);
        doc.setFont(undefined, "normal");
        yPos += 10;
        doc.rect(10, yPos, pageWidth - 20, 6);
        doc.text(`Vehicle Number: ${invoice.vehicle_number}`, 15, yPos + 4);
        yPos += 8;
      }

      // Items table
      const tableData = invoice.invoice_items.map((item: any, index: number) => {
        const taxable = Number(item.taxable_amount);
        const gstAmt = Number(item.cgst_amount) + Number(item.sgst_amount);
        return [
          (index + 1).toString(),
          item.description,
          item.hsn_sac || "",
          item.quantity.toString(),
          item.unit || "Kg",
          `₹ ${Number(item.price_per_unit).toFixed(2)}`,
          `₹ ${gstAmt.toFixed(2)} (${item.gst_rate}%)`,
          `₹ ${Number(item.total_amount).toFixed(2)}`
        ];
      });

      // Add total row
      const totalQty = invoice.invoice_items.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);
      const totalGst = invoice.invoice_items.reduce((sum: number, item: any) => 
        sum + Number(item.cgst_amount) + Number(item.sgst_amount), 0);
      
      tableData.push([
        "",
        "Total",
        "",
        totalQty.toString(),
        "",
        "",
        `₹ ${totalGst.toFixed(2)}`,
        `₹ ${Number(invoice.sub_total).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Item name", "HSN/ SAC", "Quantity", "Unit", "Price/ Unit(₹)", "GST(₹)", "Amount(₹)"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontSize: 8,
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.5,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 60 },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 25, halign: "center" },
          7: { cellWidth: 25, halign: "right" }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Tax Summary Table
      const taxSummary: { [key: string]: { taxable: number, cgstRate: number, cgst: number, sgstRate: number, sgst: number, total: number } } = {};
      
      invoice.invoice_items.forEach((item: any) => {
        const hsn = item.hsn_sac || "N/A";
        if (!taxSummary[hsn]) {
          taxSummary[hsn] = { taxable: 0, cgstRate: item.gst_rate / 2, cgst: 0, sgstRate: item.gst_rate / 2, sgst: 0, total: 0 };
        }
        taxSummary[hsn].taxable += Number(item.taxable_amount);
        taxSummary[hsn].cgst += Number(item.cgst_amount);
        taxSummary[hsn].sgst += Number(item.sgst_amount);
        taxSummary[hsn].total += Number(item.cgst_amount) + Number(item.sgst_amount);
      });

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Tax Summary:", 10, yPos);
      yPos += 3;

      const taxTableData = Object.entries(taxSummary).map(([hsn, values]) => [
        hsn,
        `${values.taxable.toFixed(2)}`,
        `${values.cgstRate.toFixed(1)}`,
        `${values.cgst.toFixed(2)}`,
        `${values.sgstRate.toFixed(1)}`,
        `${values.sgst.toFixed(2)}`,
        `${values.total.toFixed(2)}`
      ]);

      // Add total row for tax summary
      const totalTaxable = Object.values(taxSummary).reduce((sum, v) => sum + v.taxable, 0);
      const totalCgst = Object.values(taxSummary).reduce((sum, v) => sum + v.cgst, 0);
      const totalSgst = Object.values(taxSummary).reduce((sum, v) => sum + v.sgst, 0);
      const totalTax = Object.values(taxSummary).reduce((sum, v) => sum + v.total, 0);
      
      taxTableData.push([
        "TOTAL",
        `${totalTaxable.toFixed(2)}`,
        "",
        `${totalCgst.toFixed(2)}`,
        "",
        `${totalSgst.toFixed(2)}`,
        `${totalTax.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["HSN/ SAC", "Taxable amount (₹)", "CGST\nRate (%)", "Amt (₹)", "SGST\nRate (%)", "Amt (₹)", "Total Tax (₹)"]],
        body: taxTableData,
        theme: "grid",
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontSize: 7,
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: "center"
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: "center"
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30, halign: "right" },
          2: { cellWidth: 20 },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 20 },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 25, halign: "right" }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Totals section on right side
      const totalsX = pageWidth - 60;
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      
      doc.text("Sub Total", totalsX, yPos);
      doc.text(`: ₹ ${Number(invoice.sub_total).toFixed(2)}`, totalsX + 22, yPos, { align: "right" });
      yPos += 5;

      doc.setFont(undefined, "bold");
      doc.text("Total", totalsX, yPos);
      doc.text(`: ₹ ${Number(invoice.total_amount).toFixed(2)}`, totalsX + 22, yPos, { align: "right" });
      yPos += 7;

      // Amount in words
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text("Invoice Amount in Words:", 10, yPos);
      doc.setFont(undefined, "normal");
      yPos += 4;
      doc.text(invoice.amount_in_words || "", 10, yPos);

      yPos += 10;

      // Terms & Conditions
      doc.rect(10, yPos, pageWidth - 20, 8);
      doc.setFont(undefined, "bold");
      doc.text("Terms & Conditions:", 12, yPos + 5);
      yPos += 10;
      
      if (invoice.terms || invoice.companies?.terms_conditions) {
        doc.setFont(undefined, "normal");
        doc.setFontSize(7);
        const terms = invoice.terms || invoice.companies?.terms_conditions || "";
        const termsLines = doc.splitTextToSize(terms, pageWidth - 24);
        doc.text(termsLines, 12, yPos);
        yPos += termsLines.length * 3 + 5;
      } else {
        yPos += 5;
      }

      // Bank Details and Signature side by side with boxes
      const bankDetailsX = 10;
      const signatureX = pageWidth / 2;
      const bottomSectionHeight = 45;
      
      doc.rect(bankDetailsX, yPos, (pageWidth - 20) / 2, bottomSectionHeight);
      doc.rect(signatureX, yPos, (pageWidth - 20) / 2, bottomSectionHeight);

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Bank Details:", bankDetailsX + 2, yPos + 5);
      doc.text(`For ${invoice.companies?.name || "BHARATH BEVERAGES"}:`, signatureX + 2, yPos + 5);
      
      doc.setFont(undefined, "normal");
      doc.setFontSize(7);
      let bankY = yPos + 10;

      // Add QR code if available
      if (invoice.companies?.qr_code_url) {
        try {
          const qrImg = new Image();
          qrImg.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
            qrImg.src = invoice.companies.qr_code_url;
          });
          doc.addImage(qrImg, "PNG", bankDetailsX + 5, bankY, 20, 20);
        } catch (error) {
          console.error("Error loading QR code:", error);
        }
      }

      // Bank details text next to QR
      const bankTextX = bankDetailsX + 28;
      if (invoice.companies?.bank_name) {
        doc.text(`Name : ${invoice.companies.bank_name}`, bankTextX, bankY);
        bankY += 4;
      }

      if (invoice.companies?.bank_account) {
        doc.text(`Account No.: ${invoice.companies.bank_account}`, bankTextX, bankY);
        bankY += 4;
      }

      if (invoice.companies?.ifsc) {
        doc.text(`IFSC code : ${invoice.companies.ifsc}`, bankTextX, bankY);
        bankY += 4;
      }

      if (invoice.companies?.account_holder_name) {
        doc.text(`Account holder's name : ${invoice.companies.account_holder_name}`, bankTextX, bankY);
      }

      // Signature area
      doc.setFont(undefined, "normal");
      doc.text("Authorized Signatory", signatureX + 2, yPos + bottomSectionHeight - 5);

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
      {buttonIcon || defaultIcon}
      {loading ? "Generating..." : buttonLabel}
    </Button>
  );
};
