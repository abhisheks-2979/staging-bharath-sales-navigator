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

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  const convertTwoDigit = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  };
  
  const convertThreeDigit = (n: number): string => {
    if (n === 0) return "";
    if (n < 100) return convertTwoDigit(n);
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertTwoDigit(n % 100) : "");
  };
  
  if (num < 100) return convertTwoDigit(num);
  if (num < 1000) return convertThreeDigit(num);
  if (num < 100000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertThreeDigit(thousands) + " Thousand" + (remainder ? " " + convertThreeDigit(remainder) : "");
  }
  if (num < 10000000) {
    const lakhs = Math.floor(num / 100000);
    let remainder = num % 100000;
    let result = convertTwoDigit(lakhs) + " Lakh";
    if (remainder >= 1000) {
      result += " " + convertThreeDigit(Math.floor(remainder / 1000)) + " Thousand";
      remainder = remainder % 1000;
    }
    if (remainder > 0) {
      result += " " + convertThreeDigit(remainder);
    }
    return result;
  }
  return num.toString();
};

export default function InvoiceTemplate4({
  company,
  retailer,
  cartItems,
  orderId,
}: InvoiceTemplate4Props) {
  const generatePDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Dark header background
      doc.setFillColor(52, 52, 52);
      doc.rect(0, 0, pageWidth, 45, "F");

      // Logo circle background (green)
      let companyNameX = 15;
      if (company.logo_url) {
        doc.setFillColor(139, 195, 74);
        doc.circle(22, 17, 10, "F");
        
        try {
          doc.addImage(company.logo_url, "PNG", 15, 10, 14, 14);
        } catch (e) {
          console.log("Logo load failed");
        }
        companyNameX = 35;
      }

      // Company name and details (left side)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text((company.name || "COMPANY NAME").toUpperCase(), companyNameX, 15);
      
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      let headerY = 20;
      if (company.address) {
        const addressLines = doc.splitTextToSize(company.address, 90);
        doc.text(addressLines.slice(0, 2), companyNameX, headerY);
        headerY += addressLines.slice(0, 2).length * 3;
      }
      if (company.contact_phone) {
        doc.text(`Tel: ${company.contact_phone}`, companyNameX, headerY);
        headerY += 3;
      }
      if (company.email) {
        doc.text(`Email: ${company.email}`, companyNameX, headerY);
        headerY += 3;
      }
      if (company.gstin) {
        doc.text(`GSTIN: ${company.gstin}`, companyNameX, headerY);
      }

      // INVOICE title (right side)
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE", pageWidth - 15, 18, { align: "right" });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Bill To section
      let yPos = 55;
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
        doc.text(`Phone: ${retailer.phone}`, 15, yPos);
        yPos += 4;
      }
      if (retailer.gst_number) {
        doc.text(`GSTIN: ${retailer.gst_number}`, 15, yPos);
      }

      // Invoice details (right side)
      let invoiceY = 55;
      const invoiceNum = orderId?.slice(0, 8).toUpperCase() || "INV001";
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("INVOICE #", pageWidth - 60, invoiceY);
      doc.setFont("helvetica", "normal");
      doc.text(invoiceNum, pageWidth - 15, invoiceY, { align: "right" });
      
      invoiceY += 6;
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE DATE", pageWidth - 60, invoiceY);
      doc.setFont("helvetica", "normal");
      doc.text(new Date().toLocaleDateString("en-GB"), pageWidth - 15, invoiceY, { align: "right" });

      // Items table with green header
      const tableData = cartItems.map((item, index) => {
        const rate = item.rate || item.price || 0;
        const qty = item.quantity || 0;
        const total = rate * qty;
        return [
          (index + 1).toString(),
          item.product_name || item.name || "Item",
          item.hsn_code || "-",
          item.unit || "Piece",
          qty.toString(),
          `₹${rate.toFixed(2)}`,
          `₹${total.toFixed(2)}`,
        ];
      });

      autoTable(doc, {
        startY: 95,
        head: [["NO", "DESCRIPTION", "HSN/SAC", "UNIT", "QTY", "PRICE", "TOTAL"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [139, 195, 74],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [0, 0, 0],
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 50, halign: "left" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 26, halign: "right" },
        },
        margin: { left: 15, right: 15 },
      });

      // Calculate totals
      const subtotal = cartItems.reduce(
        (sum, item) => sum + (item.rate || item.price || 0) * (item.quantity || 0),
        0
      );
      const sgst = subtotal * 0.025; // 2.5%
      const cgst = subtotal * 0.025; // 2.5%
      const total = subtotal + sgst + cgst;
      
      // Convert total to words
      const totalInWords = numberToWords(Math.floor(total)) + " Rupees" + 
        (total % 1 > 0 ? " and " + numberToWords(Math.round((total % 1) * 100)) + " Paise" : "") + " Only";

      // Totals section (right-aligned)
      yPos = (doc as any).lastAutoTable.finalY + 12;
      const rightCol = pageWidth - 15;
      const labelCol = pageWidth - 60;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      
      doc.text("SUB-TOTAL", labelCol, yPos);
      doc.text(`₹${subtotal.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      yPos += 5;
      doc.text("SGST (2.5%)", labelCol, yPos);
      doc.text(`₹${sgst.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      yPos += 5;
      doc.text("CGST (2.5%)", labelCol, yPos);
      doc.text(`₹${cgst.toFixed(2)}`, rightCol, yPos, { align: "right" });

      // Total Due box (green background)
      yPos += 8;
      doc.setFillColor(139, 195, 74);
      doc.rect(labelCol - 5, yPos - 4, rightCol - labelCol + 20, 9, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Due", labelCol, yPos);
      doc.text(`₹${total.toFixed(2)}`, rightCol, yPos, { align: "right" });
      
      doc.setTextColor(0, 0, 0);
      
      // Total in Words
      yPos += 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Amount in Words:", 15, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 4;
      const wordsLines = doc.splitTextToSize(totalInWords, pageWidth - 30);
      doc.text(wordsLines, 15, yPos);

      // Payment Method section
      yPos += 14;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT METHOD", 15, yPos);
      
      yPos += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      if (company.bank_name) {
        doc.text(`Bank Name: ${company.bank_name}`, 15, yPos);
        yPos += 4;
      }
      if (company.account_holder_name) {
        doc.text(`Account Holder: ${company.account_holder_name}`, 15, yPos);
        yPos += 4;
      }
      if (company.bank_account) {
        doc.text(`Account Number: ${company.bank_account}`, 15, yPos);
        yPos += 4;
      }
      if (company.ifsc) {
        doc.text(`IFSC Code: ${company.ifsc}`, 15, yPos);
        yPos += 4;
      }
      if (company.upi_id) {
        doc.text(`UPI ID: ${company.upi_id}`, 15, yPos);
        yPos += 4;
      }
      
      // Add QR Code if available
      if (company.qr_code_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = company.qr_code_url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          if (img.complete) {
            doc.addImage(img, "PNG", pageWidth - 50, yPos - 30, 30, 30);
            doc.setFontSize(7);
            doc.text("Scan to Pay", pageWidth - 35, yPos + 2, { align: "center" });
          }
        } catch (error) {
          console.error("Error loading QR code:", error);
        }
      }

      // Signature area (right side)
      const sigYPos = yPos - 22;
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("For " + (company.name || "Company"), pageWidth - 40, sigYPos + 18, { align: "center" });
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text("Authorized Signatory", pageWidth - 40, sigYPos + 30, { align: "center" });
      doc.line(pageWidth - 55, sigYPos + 28, pageWidth - 25, sigYPos + 28);

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

      doc.save(`invoice-${invoiceNum}.pdf`);
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
