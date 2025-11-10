import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VisitInvoicePDFGeneratorProps {
  orderId: string;
  className?: string;
}

export const VisitInvoicePDFGenerator = ({ orderId, className }: VisitInvoicePDFGeneratorProps) => {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      // Fetch order with all related data
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (*)
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (companyError) console.error("Error fetching company:", companyError);

      // Fetch retailer data
      let customerData: any = null;
      if (order.retailer_id) {
        const { data: retailer } = await supabase
          .from("retailers")
          .select("name, address, phone, gst_number")
          .eq("id", order.retailer_id)
          .single();

        customerData = retailer ? {
          name: retailer.name,
          address: retailer.address,
          contact_phone: retailer.phone,
          gstin: retailer.gst_number,
          state: "29-Karnataka",
        } : null;
      }

      // Fetch distributor info if mapped
      let distributorInfo = null;
      if (order.retailer_id) {
        const { data: mapping } = await supabase
          .from("distributor_retailer_mappings")
          .select("distributor_id")
          .eq("retailer_id", order.retailer_id)
          .eq("user_id", order.user_id)
          .maybeSingle();
        
        if (mapping?.distributor_id) {
          // Get distributor details from retailers table (distributors are stored as retailers with entity_type = 'distributor')
          const { data: distributor } = await supabase
            .from("retailers")
            .select("name, address, phone, gst_number")
            .eq("id", mapping.distributor_id)
            .eq("entity_type", "distributor")
            .maybeSingle();
          
          if (distributor) {
            distributorInfo = {
              name: distributor.name,
              contact_person: '',
              address: distributor.address,
              phone: distributor.phone,
              gst_number: distributor.gst_number
            };
          }
        }
      }

      // Generate invoice number based on order
      const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;
      const invoiceDate = new Date(order.created_at);

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
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
      
      if (companyData?.logo_url) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = companyData.logo_url;
          });
          doc.addImage(img, "PNG", 15, headerStartY, 25, 15);
        } catch (error) {
          console.error("Error loading logo:", error);
        }
      }

      // Company name and details
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(companyData?.name || "BHARATH BEVERAGES", 45, headerStartY + 5);
      
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      const companyDetails = [
        companyData?.address,
        `Phone: ${companyData?.contact_phone || ''}`,
        `Email: ${companyData?.email || ''}`,
        `GSTIN: ${companyData?.gstin || ''}`,
        `State: ${companyData?.state || '29-Karnataka'}`
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
      doc.text(`No: ${invoiceNumber}`, invoiceDetailsX, yPos + 10);
      doc.text(`Date: ${invoiceDate.toLocaleDateString("en-IN")}`, invoiceDetailsX, yPos + 14);
      doc.text(`Place Of Supply: 29-Karnataka`, invoiceDetailsX, yPos + 18);

      yPos += 35;

      // Items table
      const items = order.order_items || [];
      const tableData = items.map((item: any, index: number) => {
        const quantity = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const taxableAmount = quantity * rate;
        const gstRate = 18; // Default GST rate
        const gstAmount = (taxableAmount * gstRate) / 100;
        const totalAmount = taxableAmount + gstAmount;

        return [
          (index + 1).toString(),
          item.product_name || item.description || '',
          "090230", // Default HSN
          quantity.toString(),
          item.unit || "Kg",
          `₹ ${rate.toFixed(2)}`,
          `₹ ${gstAmount.toFixed(2)} (${gstRate}%)`,
          `₹ ${totalAmount.toFixed(2)}`
        ];
      });

      // Calculate totals
      const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
      const subTotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
      const totalGst = (subTotal * 18) / 100;
      const grandTotal = subTotal + totalGst;
      
      tableData.push([
        "",
        "Total",
        "",
        totalQty.toString(),
        "",
        "",
        `₹ ${totalGst.toFixed(2)}`,
        `₹ ${grandTotal.toFixed(2)}`
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
      const cgst = totalGst / 2;
      const sgst = totalGst / 2;

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Tax Summary:", 10, yPos);
      yPos += 3;

      const taxTableData = [[
        "090230",
        `${subTotal.toFixed(2)}`,
        "9.0",
        `${cgst.toFixed(2)}`,
        "9.0",
        `${sgst.toFixed(2)}`,
        `${totalGst.toFixed(2)}`
      ]];

      taxTableData.push([
        "TOTAL",
        `${subTotal.toFixed(2)}`,
        "",
        `${cgst.toFixed(2)}`,
        "",
        `${sgst.toFixed(2)}`,
        `${totalGst.toFixed(2)}`
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
      doc.text(`: ₹ ${subTotal.toFixed(2)}`, totalsX + 22, yPos, { align: "right" });
      yPos += 5;

      doc.setFont(undefined, "bold");
      doc.text("Total", totalsX, yPos);
      doc.text(`: ₹ ${grandTotal.toFixed(2)}`, totalsX + 22, yPos, { align: "right" });
      yPos += 7;

      // Amount in words
      doc.setFontSize(8);
      doc.setFont(undefined, "bold");
      doc.text("Invoice Amount in Words:", 10, yPos);
      doc.setFont(undefined, "normal");
      yPos += 4;
      const amountInWords = convertNumberToWords(grandTotal);
      doc.text(amountInWords, 10, yPos);

      yPos += 10;

      // Terms & Conditions
      doc.rect(10, yPos, pageWidth - 20, 8);
      doc.setFont(undefined, "bold");
      doc.text("Terms & Conditions:", 12, yPos + 5);
      yPos += 10;
      
      if (companyData?.terms_conditions) {
        doc.setFont(undefined, "normal");
        doc.setFontSize(7);
        const terms = companyData.terms_conditions;
        const termsLines = doc.splitTextToSize(terms, pageWidth - 24);
        doc.text(termsLines, 12, yPos);
        yPos += termsLines.length * 3 + 5;
      } else {
        doc.setFont(undefined, "normal");
        doc.setFontSize(7);
        doc.text("Thanks for doing business with us!", 12, yPos);
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
      doc.text(`For ${companyData?.name || "BHARATH BEVERAGES"}:`, signatureX + 2, yPos + 5);
      
      doc.setFont(undefined, "normal");
      doc.setFontSize(7);
      let bankY = yPos + 10;

      // Add QR code if available
      if (companyData?.qr_code_url) {
        try {
          const qrImg = new Image();
          qrImg.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
            qrImg.src = companyData.qr_code_url;
          });
          doc.addImage(qrImg, "PNG", bankDetailsX + 5, bankY, 20, 20);
        } catch (error) {
          console.error("Error loading QR code:", error);
        }
      }

      // Bank details text next to QR
      const bankTextX = bankDetailsX + 28;
      if (companyData?.bank_name) {
        doc.text(`Name : ${companyData.bank_name}`, bankTextX, bankY);
        bankY += 4;
      }

      if (companyData?.bank_account) {
        doc.text(`Account No.: ${companyData.bank_account}`, bankTextX, bankY);
        bankY += 4;
      }

      if (companyData?.ifsc) {
        doc.text(`IFSC code : ${companyData.ifsc}`, bankTextX, bankY);
        bankY += 4;
      }

      if (companyData?.account_holder_name) {
        doc.text(`Account holder's name : ${companyData.account_holder_name}`, bankTextX, bankY);
      }

      // Signature area
      doc.setFont(undefined, "normal");
      doc.text("Authorized Signatory", signatureX + 2, yPos + bottomSectionHeight - 5);

      // Save PDF
      const fileName = `Invoice_${invoiceNumber}.pdf`;
      doc.save(fileName);

      toast.success("Invoice PDF generated successfully!");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast.error(error.message || "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert number to words
  const convertNumberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero Rupees only';
    
    const numStr = Math.floor(num).toString();
    let words = '';
    
    if (numStr.length > 7) {
      const crores = parseInt(numStr.slice(0, -7));
      words += convertNumberToWords(crores) + ' Crore ';
      num = num % 10000000;
    }
    
    if (numStr.length > 5) {
      const lakhs = Math.floor(num / 100000);
      if (lakhs > 0) {
        words += convertNumberToWords(lakhs) + ' Lakh ';
        num = num % 100000;
      }
    }
    
    if (numStr.length > 3) {
      const thousands = Math.floor(num / 1000);
      if (thousands > 0) {
        words += convertNumberToWords(thousands) + ' Thousand ';
        num = num % 1000;
      }
    }
    
    if (num > 0) {
      const hundreds = Math.floor(num / 100);
      if (hundreds > 0) {
        words += ones[hundreds] + ' Hundred ';
        num = num % 100;
      }
      
      if (num >= 20) {
        words += tens[Math.floor(num / 10)] + ' ';
        num = num % 10;
      } else if (num >= 10) {
        words += teens[num - 10] + ' ';
        num = 0;
      }
      
      if (num > 0) {
        words += ones[num] + ' ';
      }
    }
    
    return words.trim() + ' Rupees only';
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={generatePDF}
      className={className}
    >
      <FileText className="mr-2 h-4 w-4" />
      {loading ? "Generating..." : "Download Invoice"}
    </Button>
  );
};
