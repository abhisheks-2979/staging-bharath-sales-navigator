import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface InvoiceTemplate4Props {
  company: any;
  retailer: any;
  cartItems: any[];
  orderId?: string;
}

export default function InvoiceTemplate4({
  company,
  retailer,
  cartItems,
  orderId,
}: InvoiceTemplate4Props) {
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Dark header background
      doc.setFillColor(52, 52, 52);
      doc.rect(0, 0, pageWidth, 30, "F");

      // Company logo and name (left side)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(company.name || "COMPANY NAME", 15, 15);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("YOUR SLOGAN HERE", 15, 20);

      // INVOICE title (right side)
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", pageWidth - 15, 18, { align: "right" });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Bill To section
      let yPos = 45;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO", 15, yPos);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      yPos += 6;
      doc.text(retailer.name || "Customer Name", 15, yPos);
      yPos += 5;
      if (retailer.address) {
        const addressLines = doc.splitTextToSize(retailer.address, 80);
        doc.text(addressLines, 15, yPos);
        yPos += addressLines.length * 5;
      }
      if (retailer.phone) {
        doc.text(retailer.phone, 15, yPos);
      }

      // Invoice details (right side)
      yPos = 45;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE #", pageWidth - 70, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(orderId || "001", pageWidth - 15, yPos, { align: "right" });
      
      yPos += 6;
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE DATE", pageWidth - 70, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString(), pageWidth - 15, yPos, { align: "right" });

      // Items table with green header
      const tableData = cartItems.map((item, index) => [
        (index + 1).toString(),
        item.product_name || "Item/Service",
        `₹${item.price?.toFixed(2) || "0.00"}`,
        item.quantity?.toString() || "1",
        `₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: 75,
        head: [["NO", "DESCRIPTION", "PRICE", "QTY", "TOTAL"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [139, 195, 74], // Green color
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          1: { cellWidth: 80 },
          2: { cellWidth: 25, halign: "right" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 30, halign: "right" },
        },
        margin: { left: 15, right: 15 },
      });

      // Calculate totals
      const subtotal = cartItems.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
        0
      );
      const sgst = subtotal * 0.025; // 2.5%
      const cgst = subtotal * 0.025; // 2.5%
      const total = subtotal + sgst + cgst;

      // Totals section (right-aligned)
      yPos = (doc as any).lastAutoTable.finalY + 15;
      const rightCol = pageWidth - 15;
      const labelCol = pageWidth - 70;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      doc.text("SUB-TOTAL", labelCol, yPos);
      doc.text(`₹${subtotal.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      yPos += 6;
      doc.text("SGST (2.5%)", labelCol, yPos);
      doc.text(`₹${sgst.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      yPos += 6;
      doc.text("CGST (2.5%)", labelCol, yPos);
      doc.text(`₹${cgst.toFixed(2)}`, rightCol, yPos, { align: "right" });

      // Total Due box (green background)
      yPos += 10;
      doc.setFillColor(139, 195, 74);
      doc.rect(labelCol - 5, yPos - 5, 70, 10, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Total Due", labelCol, yPos);
      doc.text(`₹${total.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      doc.setTextColor(0, 0, 0);

      // Payment Method section
      yPos += 20;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT METHOD", 15, yPos);
      
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (company.bank_name) {
        doc.text(`Bank: ${company.bank_name}`, 15, yPos);
        yPos += 5;
      }
      if (company.account_name) {
        doc.text(`Account Name: ${company.account_name}`, 15, yPos);
        yPos += 5;
      }
      if (company.account_number) {
        doc.text(`Account Number: ${company.account_number}`, 15, yPos);
        yPos += 5;
      }
      if (company.ifsc_code) {
        doc.text(`IFSC Code: ${company.ifsc_code}`, 15, yPos);
      }

      // Signature area (right side)
      const sigYPos = yPos - 15;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Authorized Signature", pageWidth - 15, sigYPos + 20, { align: "right" });

      // Terms and Conditions
      yPos += 15;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TERM AND CONDITIONS", 15, yPos);
      
      yPos += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const terms = company.terms_conditions || "Please pay within 15 days from the date of invoice. Late payment is subject to fees of 5% per month.";
      const termsLines = doc.splitTextToSize(terms, pageWidth - 30);
      doc.text(termsLines, 15, yPos);

      // Thank you message
      yPos = pageHeight - 35;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("THANK YOU FOR YOUR BUSINESS", pageWidth / 2, yPos, { align: "center" });

      // Dark footer
      doc.setFillColor(52, 52, 52);
      doc.rect(0, pageHeight - 25, pageWidth, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const footerText = `${company.address || "123 Anywhere St., Any City"} - ${company.phone || "123-456-7890"} - ${company.email || "hello@reallygreatsite.com"}`;
      doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });

      doc.save(`invoice-${orderId || "001"}.pdf`);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate invoice");
    }
  };

  return (
    <Button onClick={generatePDF} className="w-full">
      <Download className="w-4 h-4 mr-2" />
      Download Invoice (Template 4)
    </Button>
  );
}
