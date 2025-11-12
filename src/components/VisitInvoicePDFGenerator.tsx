import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, MessageSquare, Mail } from "lucide-react";
import { MessageCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      
      let companyY = headerStartY + 10;
      
      // Address
      if (companyData?.address) {
        const addrLines = doc.splitTextToSize(companyData.address, 140);
        doc.text(addrLines, 45, companyY);
        companyY += addrLines.length * 3.5;
      }
      
      // Phone
      if (companyData?.contact_phone) {
        doc.text("Phone: " + companyData.contact_phone, 45, companyY);
        companyY += 3.5;
      }
      
      // Email
      if (companyData?.email) {
        doc.text("Email: " + companyData.email, 45, companyY);
        companyY += 3.5;
      }
      
      // GSTIN
      if (companyData?.gstin) {
        doc.text("GSTIN: " + companyData.gstin, 45, companyY);
        companyY += 3.5;
      }
      
      // State
      const state = companyData?.state || "29-Karnataka";
      doc.text("State: " + state, 45, companyY);

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
      let billToY = yPos + 10;
      
      if (customerData?.name) {
        doc.text(customerData.name, 15, billToY);
        billToY += 4;
      }
      
      if (customerData?.address) {
        const custAddr = doc.splitTextToSize(customerData.address, 80);
        doc.text(custAddr, 15, billToY);
        billToY += custAddr.length * 3.5;
      }
      
      if (customerData?.contact_phone) {
        doc.text("Contact: " + customerData.contact_phone, 15, billToY);
        billToY += 3.5;
      }
      
      if (customerData?.gstin) {
        doc.text("GSTIN: " + customerData.gstin, 15, billToY);
      }

      // Invoice details
      const invoiceDetailsX = 15 + (pageWidth - 20) / 2;
      doc.text("No: " + invoiceNumber, invoiceDetailsX, yPos + 10);
      doc.text("Date: " + invoiceDate.toLocaleDateString("en-IN"), invoiceDetailsX, yPos + 14);
      doc.text("Place Of Supply: Karnataka", invoiceDetailsX, yPos + 18);

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
          "Rs " + rate.toFixed(2),
          gstRate.toString() + "%",
          "Rs " + totalAmount.toFixed(2)
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
        "Rs " + totalGst.toFixed(2),
        "Rs " + grandTotal.toFixed(2)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Item Name", "HSN/SAC", "Qty", "Unit", "Rate (Rs)", "GST %", "Amount (Rs)"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontSize: 8,
          fontStyle: "bold",
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: "center"
        },
        bodyStyles: {
          fontSize: 8
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 60, halign: "left" },
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
        subTotal.toFixed(2),
        "9.0",
        cgst.toFixed(2),
        "9.0",
        sgst.toFixed(2),
        totalGst.toFixed(2)
      ]];

      taxTableData.push([
        "TOTAL",
        subTotal.toFixed(2),
        "",
        cgst.toFixed(2),
        "",
        sgst.toFixed(2),
        totalGst.toFixed(2)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["HSN/SAC", "Taxable Amt (Rs)", "CGST Rate %", "CGST Amt (Rs)", "SGST Rate %", "SGST Amt (Rs)", "Total Tax (Rs)"]],
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
        bodyStyles: {
          fontSize: 7
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          lineWidth: 0.5,
          lineColor: [0, 0, 0],
          halign: "center",
          font: "helvetica"
        },
        columnStyles: {
          0: { cellWidth: 25, halign: "center" },
          1: { cellWidth: 30, halign: "right" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 25, halign: "right" },
          6: { cellWidth: 25, halign: "right" }
        }
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Totals section on right side
      const totalsX = pageWidth - 70;
      doc.setFontSize(9);
      doc.setFont(undefined, "normal");
      
      doc.text("Subtotal:", totalsX, yPos);
      doc.text("Rs " + subTotal.toFixed(2), totalsX + 40, yPos, { align: "right" });
      yPos += 5;

      doc.setFont(undefined, "bold");
      doc.text("Total:", totalsX, yPos);
      doc.text("Rs " + grandTotal.toFixed(2), totalsX + 40, yPos, { align: "right" });
      yPos += 8;

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
      if (companyData?.account_holder_name) {
        doc.text("Account Name: " + companyData.account_holder_name, bankTextX, bankY);
        bankY += 4;
      }
      
      if (companyData?.bank_name) {
        doc.text("Bank: " + companyData.bank_name, bankTextX, bankY);
        bankY += 4;
      }

      if (companyData?.bank_account) {
        doc.text("A/C No: " + companyData.bank_account, bankTextX, bankY);
        bankY += 4;
      }

      if (companyData?.ifsc) {
        doc.text("IFSC: " + companyData.ifsc, bankTextX, bankY);
      }

      // Signature area with line
      const sigY = yPos + bottomSectionHeight - 10;
      doc.line(signatureX + 2, sigY, signatureX + (pageWidth - 20) / 2 - 5, sigY);
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

  // Helper function to convert number to words (Indian numbering system)
  const convertNumberToWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (amount === 0) return 'Zero Rupees Only';
    
    // Separate rupees and paise
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    
    const convertToWords = (n: number): string => {
      if (n === 0) return '';
      
      let words = '';
      
      // Crores
      if (n >= 10000000) {
        const crores = Math.floor(n / 10000000);
        words += convertToWords(crores) + ' Crore ';
        n = n % 10000000;
      }
      
      // Lakhs
      if (n >= 100000) {
        const lakhs = Math.floor(n / 100000);
        words += convertToWords(lakhs) + ' Lakh ';
        n = n % 100000;
      }
      
      // Thousands
      if (n >= 1000) {
        const thousands = Math.floor(n / 1000);
        words += convertToWords(thousands) + ' Thousand ';
        n = n % 1000;
      }
      
      // Hundreds
      if (n >= 100) {
        const hundreds = Math.floor(n / 100);
        words += ones[hundreds] + ' Hundred ';
        n = n % 100;
      }
      
      // Tens and Ones
      if (n >= 20) {
        words += tens[Math.floor(n / 10)] + ' ';
        n = n % 10;
      } else if (n >= 10) {
        words += teens[n - 10] + ' ';
        n = 0;
      }
      
      if (n > 0) {
        words += ones[n] + ' ';
      }
      
      return words.trim();
    };
    
    let result = convertToWords(rupees) + ' Rupees';
    
    if (paise > 0) {
      result += ' and ' + convertToWords(paise) + ' Paise';
    }
    
    return result + ' Only';
  };

  const sendViaWhatsApp = async () => {
    if (!customerPhone) {
      toast.error("Customer phone number not available");
      return;
    }

    setSendingWhatsApp(true);
    try {
      // First generate the PDF
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
      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .limit(1)
        .maybeSingle();

      // Fetch retailer data
      let customerData: any = null;
      if (order.retailer_id) {
        const { data: retailer } = await supabase
          .from("retailers")
          .select("name, address, phone, gst_number")
          .eq("id", order.retailer_id)
          .single();

        customerData = retailer;
      }

      // Generate PDF using the same logic
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;

      // Title
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("Tax Invoice", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Company header
      doc.rect(10, yPos, pageWidth - 20, 40);
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

      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text(companyData?.name || "BHARATH BEVERAGES", 45, headerStartY + 5);
      
      doc.setFontSize(8);
      doc.setFont(undefined, "normal");
      let companyY = headerStartY + 10;
      
      if (companyData?.address) {
        const addrLines = doc.splitTextToSize(companyData.address, 140);
        doc.text(addrLines, 45, companyY);
        companyY += addrLines.length * 3.5;
      }
      if (companyData?.contact_phone) {
        doc.text("Phone: " + companyData.contact_phone, 45, companyY);
        companyY += 3.5;
      }
      if (companyData?.email) {
        doc.text("Email: " + companyData.email, 45, companyY);
        companyY += 3.5;
      }
      if (companyData?.gstin) {
        doc.text("GSTIN: " + companyData.gstin, 45, companyY);
      }

      yPos += 45;

      // Bill To and Invoice Details
      doc.rect(10, yPos, (pageWidth - 20) / 2, 30);
      doc.rect(10 + (pageWidth - 20) / 2, yPos, (pageWidth - 20) / 2, 30);

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Bill To:", 15, yPos + 5);
      doc.text("Invoice Details:", 15 + (pageWidth - 20) / 2, yPos + 5);

      doc.setFont(undefined, "normal");
      doc.setFontSize(8);
      
      let billToY = yPos + 10;
      if (customerData?.name) {
        doc.text(customerData.name, 15, billToY);
        billToY += 4;
      }
      if (customerData?.address) {
        const custAddr = doc.splitTextToSize(customerData.address, 80);
        doc.text(custAddr, 15, billToY);
        billToY += custAddr.length * 3.5;
      }
      if (customerData?.phone) {
        doc.text("Contact: " + customerData.phone, 15, billToY);
      }

      const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;
      const invoiceDate = new Date(order.created_at);
      const invoiceDetailsX = 15 + (pageWidth - 20) / 2;
      doc.text("No: " + invoiceNumber, invoiceDetailsX, yPos + 10);
      doc.text("Date: " + invoiceDate.toLocaleDateString("en-IN"), invoiceDetailsX, yPos + 14);
      doc.text("Place Of Supply: Karnataka", invoiceDetailsX, yPos + 18);

      yPos += 35;

      // Items table
      const items = order.order_items || [];
      const tableData = items.map((item: any, index: number) => {
        const quantity = Number(item.quantity || 0);
        const rate = Number(item.rate || 0);
        const taxableAmount = quantity * rate;
        const gstRate = 18;
        const gstAmount = (taxableAmount * gstRate) / 100;
        const totalAmount = taxableAmount + gstAmount;

        return [
          (index + 1).toString(),
          item.product_name || '',
          "090230",
          quantity.toString(),
          item.unit || "Kg",
          "Rs " + rate.toFixed(2),
          gstRate.toString() + "%",
          "Rs " + totalAmount.toFixed(2)
        ];
      });

      const totalQty = items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
      const subTotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
      const totalGst = (subTotal * 18) / 100;
      const grandTotal = subTotal + totalGst;

      tableData.push(["", "Total", "", totalQty.toString(), "", "", "Rs " + totalGst.toFixed(2), "Rs " + grandTotal.toFixed(2)]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Item Name", "HSN/SAC", "Qty", "Unit", "Rate (Rs)", "GST %", "Amount (Rs)"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Get PDF as blob
      const pdfBlob = doc.output('blob');
      const fileName = `Invoice_${invoiceNumber}.pdf`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(`${order.user_id}/${fileName}`, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
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
          <span className="text-sm font-medium text-muted-foreground">Share:</span>
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
