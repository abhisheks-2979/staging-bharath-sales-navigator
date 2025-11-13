import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface InvoiceTemplate3Props {
  company: any;
  retailer: any;
  cartItems: any[];
  orderId?: string;
}

export default function InvoiceTemplate3({
  company,
  retailer,
  cartItems,
  orderId,
}: InvoiceTemplate3Props) {
  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      let yPos = 15;

      // Elegant Header with Line
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(company.name || "Company Name", 15, yPos);
      
      yPos += 8;
      doc.setLineWidth(0.5);
      doc.line(15, yPos, pageWidth - 15, yPos);
      
      yPos += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(company.address || "", 15, yPos);
      yPos += 5;
      doc.text(`GSTIN: ${company.gstin || "N/A"} | Phone: ${company.contact_phone || ""} | Email: ${company.email || ""}`, 15, yPos);
      
      yPos += 15;

      // Invoice Header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", 15, yPos);
      
      doc.setFontSize(10);
      doc.text(`Invoice #: ${orderId?.slice(0, 8) || "N/A"}`, pageWidth - 15, yPos, { align: "right" });
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, yPos, { align: "right" });
      
      yPos += 15;

      // Two Column Layout - Bill To and Ship From
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO:", 15, yPos);
      
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.text(retailer.name || "Retailer", 15, yPos);
      yPos += 5;
      doc.text(retailer.address || "", 15, yPos, { maxWidth: 80 });
      yPos += 5;
      if (retailer.gst_number) {
        doc.text(`GSTIN: ${retailer.gst_number}`, 15, yPos);
      }
      
      yPos += 15;

      // Items Table - Professional Style
      const tableData = cartItems.map((item, index) => [
        index + 1,
        item.product_name || item.name,
        item.quantity,
        item.unit || "Piece",
        `₹${(item.rate || item.price || 0).toFixed(2)}`,
        `₹${((item.quantity || 0) * (item.rate || item.price || 0)).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Item", "Qty", "Unit", "Rate", "Amount"]],
        body: tableData,
        theme: "striped",
        headStyles: { 
          fillColor: [44, 62, 80],
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          5: { halign: "right" },
        },
        margin: { left: 15, right: 15 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Totals with elegant spacing
      const subtotal = cartItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || item.price || 0), 0);
      const cgst = subtotal * 0.025;
      const sgst = subtotal * 0.025;
      const total = subtotal + cgst + sgst;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      const rightMargin = pageWidth - 15;
      const labelX = rightMargin - 70;
      
      doc.text("Subtotal:", labelX, yPos);
      doc.text(`₹${subtotal.toFixed(2)}`, rightMargin, yPos, { align: "right" });
      yPos += 6;
      
      doc.text("CGST @ 2.5%:", labelX, yPos);
      doc.text(`₹${cgst.toFixed(2)}`, rightMargin, yPos, { align: "right" });
      yPos += 6;
      
      doc.text("SGST @ 2.5%:", labelX, yPos);
      doc.text(`₹${sgst.toFixed(2)}`, rightMargin, yPos, { align: "right" });
      yPos += 8;
      
      // Total with line
      doc.setLineWidth(0.5);
      doc.line(labelX, yPos - 2, rightMargin, yPos - 2);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", labelX, yPos + 4);
      doc.text(`₹${total.toFixed(2)}`, rightMargin, yPos + 4, { align: "right" });
      
      yPos += 15;

      // Bank Details Box
      if (company.bank_name) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.rect(15, yPos, pageWidth - 30, 20);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("BANK DETAILS", 20, yPos + 6);
        yPos += 11;
        doc.setFont("helvetica", "normal");
        doc.text(`Bank: ${company.bank_name}`, 20, yPos);
        yPos += 5;
        doc.text(`Account: ${company.bank_account || ""} | IFSC: ${company.ifsc || ""}`, 20, yPos);
      }

      // Footer
      yPos = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("This is a computer-generated invoice", pageWidth / 2, yPos, { align: "center" });

      // Save PDF
      doc.save(`Invoice_${orderId?.slice(0, 8) || Date.now()}.pdf`);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate invoice");
    }
  };

  return (
    <Button onClick={generatePDF} className="w-full" variant="outline">
      <Download className="w-4 h-4 mr-2" />
      Download Invoice (Template 3)
    </Button>
  );
}
