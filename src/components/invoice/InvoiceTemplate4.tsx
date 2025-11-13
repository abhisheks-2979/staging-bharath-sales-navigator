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
      doc.rect(0, 0, pageWidth, 35, "F");

      // Logo circle background (green)
      if (company.logo_url) {
        doc.setFillColor(139, 195, 74);
        doc.circle(22, 17, 10, "F");
        
        // Add logo image
        const logoImg = new Image();
        logoImg.src = company.logo_url;
        logoImg.onload = () => {
          doc.addImage(logoImg, "PNG", 15, 10, 14, 14);
        };
      }

      // Company name and slogan (left side, next to logo)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const companyNameX = company.logo_url ? 35 : 15;
      doc.text((company.name || "COMPANY NAME").toUpperCase(), companyNameX, 15);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text("YOUR SLOGAN HERE", companyNameX, 21);

      // INVOICE title (right side)
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", pageWidth - 15, 20, { align: "right" });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Bill To section
      let yPos = 50;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("BILL TO", 15, yPos);
      
      yPos += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 100, 200); // Blue for retailer name
      doc.text(retailer.name || "Customer Name", 15, yPos);
      
      doc.setTextColor(0, 0, 0);
      yPos += 5;
      if (retailer.address) {
        const addressLines = doc.splitTextToSize(retailer.address, 80);
        doc.text(addressLines, 15, yPos);
        yPos += addressLines.length * 4;
      }
      if (retailer.phone) {
        doc.text(retailer.phone, 15, yPos);
      }

      // Invoice details (right side)
      yPos = 50;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("INVOICE #", pageWidth - 60, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(orderId || "001", pageWidth - 15, yPos, { align: "right" });
      
      yPos += 6;
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE DATE", pageWidth - 60, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString("en-GB"), pageWidth - 15, yPos, { align: "right" });

      // Items table with green header
      const tableData = cartItems.map((item, index) => [
        (index + 1).toString(),
        item.product_name || "Item/Service",
        `₹ ${item.price?.toFixed(2) || "0.00"}`,
        item.quantity?.toString() || "1",
        `₹ ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: 85,
        head: [["NO", "DESCRIPTION", "PRICE", "QTY", "TOTAL"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [139, 195, 74],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          1: { cellWidth: 85, halign: "left" },
          2: { cellWidth: 25, halign: "center" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 30, halign: "center" },
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
      yPos = (doc as any).lastAutoTable.finalY + 12;
      const rightCol = pageWidth - 18;
      const labelCol = pageWidth - 65;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      
      doc.text("SUB-TOTAL", labelCol, yPos, { align: "right" });
      doc.text(`₹ ${subtotal.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      yPos += 5;
      doc.text("SGST (2.5%)", labelCol, yPos, { align: "right" });
      doc.text(`₹ ${sgst.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      yPos += 5;
      doc.text("CGST (2.5%)", labelCol, yPos, { align: "right" });
      doc.text(`₹ ${cgst.toFixed(2)}`, rightCol, yPos, { align: "right" });

      // Total Due box (green background)
      yPos += 8;
      doc.setFillColor(139, 195, 74);
      doc.rect(labelCol - 8, yPos - 4, 73, 9, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Total Due", labelCol, yPos, { align: "right" });
      doc.text(`₹ ${total.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      doc.setTextColor(0, 0, 0);

      // Payment Method section
      yPos += 18;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT METHOD", 15, yPos);
      
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (company.bank_name) {
        doc.text(`Bank: ${company.bank_name}`, 15, yPos);
        yPos += 4;
      }
      if (company.account_name) {
        doc.text(`Account Name: ${company.account_name}`, 15, yPos);
        yPos += 4;
      }
      if (company.account_number) {
        doc.text(`Account Number: ${company.account_number}`, 15, yPos);
        yPos += 4;
      }
      if (company.ifsc_code) {
        doc.text(`IFSC Code: ${company.ifsc_code}`, 15, yPos);
      }

      // Signature area (right side)
      const sigYPos = yPos - 18;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Authorized Signature", pageWidth - 40, sigYPos + 25, { align: "center" });
      doc.line(pageWidth - 55, sigYPos + 23, pageWidth - 25, sigYPos + 23);

      // Terms and Conditions
      yPos += 12;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TERM AND CONDITIONS", 15, yPos);
      
      yPos += 5;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 100, 200); // Blue text for terms
      const terms = company.terms_conditions || "Please pay within 15 days from the date of invoice. Late payment is subject to fees of 5% per month.";
      const termsLines = doc.splitTextToSize(terms, pageWidth - 30);
      doc.text(termsLines, 15, yPos);

      // Thank you message
      yPos = pageHeight - 32;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 100, 200); // Blue
      doc.text("THANK YOU FOR YOUR BUSINESS", pageWidth / 2, yPos, { align: "center" });

      // Dark footer
      doc.setFillColor(52, 52, 52);
      doc.rect(0, pageHeight - 23, pageWidth, 23, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const footerParts = [];
      if (company.address) footerParts.push(company.address);
      if (company.contact_phone) footerParts.push(company.contact_phone);
      if (company.email) footerParts.push(company.email);
      const footerText = footerParts.join(" - ");
      doc.text(footerText, pageWidth / 2, pageHeight - 12, { align: "center" });

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
