import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceData {
  orderId: string;
  company: any;
  retailer: any;
  cartItems: any[];
}

// Helper function to convert number to words (Indian system)
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

/**
 * Generate Template 4 (Green Accent Professional) invoice PDF
 * This is the ONLY template used throughout the application
 */
export async function generateTemplate4Invoice(data: InvoiceData): Promise<Blob> {
  const { orderId, company, retailer, cartItems } = data;
  
  // Helper functions for consistent display (matches preview component)
  const normalizeUnit = (u?: string) => (u || "").toLowerCase().replace(/\./g, "").trim();
  
  const getDisplayRate = (item: any) => {
    const baseRate = Number(item.rate || item.price) || 0;
    const baseUnit = normalizeUnit(item.base_unit || item.unit);
    const targetUnit = normalizeUnit(item.unit);
    if (!baseUnit || !item.base_unit) return baseRate;

    // KG ↔ Gram conversions
    if (baseUnit === "kg" || baseUnit === "kilogram" || baseUnit === "kilograms") {
      if (["gram", "grams", "g", "gm"].includes(targetUnit)) return baseRate / 1000;
      if (targetUnit === "kg") return baseRate;
    } else if (["g", "gm", "gram", "grams"].includes(baseUnit)) {
      if (targetUnit === "kg") return baseRate * 1000;
      if (["g", "gm", "gram", "grams"].includes(targetUnit)) return baseRate;
    }
    return baseRate;
  };

  // Get display name - show only variant name if it's a variant, or base product name
  const getDisplayName = (item: any) => {
    const fullName = item.product_name || item.name || "";
    // Check if this is a variant (contains " - ")
    if (fullName.includes(" - ")) {
      const parts = fullName.split(" - ");
      const variantPart = parts[1];
      // If variant is "Base variant", show only the base product name
      if (variantPart.toLowerCase() === "base variant") {
        return parts[0];
      }
      // Otherwise show only the variant name
      return variantPart;
    }
    // If no variant, return the full name
    return fullName;
  };
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Dark header background - matching template4 (bg-gray-800: rgb(31, 41, 55))
  doc.setFillColor(31, 41, 55);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Logo image (no background circle, to match template4 preview)
  let companyNameX = 15;
  if (company.logo_url) {
    try {
      const response = await fetch(company.logo_url);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const imgFormat = company.logo_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
      // Slightly larger logo to match preview proportions
      doc.addImage(base64, imgFormat, 15, 8, 28, 28);
      companyNameX = 50;
    } catch (e) {
      console.warn("Failed to load logo image for invoice PDF:", e);
      companyNameX = 15;
    }
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
  doc.text("INVOICE", pageWidth - 15, 28, { align: "right" });

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
  doc.setTextColor(0, 0, 0); // Retailer name in black for professional look
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
    const rate = getDisplayRate(item);
    const qty = item.quantity || 0;
    const total = rate * qty;
    return [
      (index + 1).toString(),
      getDisplayName(item),
      item.hsn_code || "-",
      item.unit || "Piece",
      qty.toString(),
      `Rs ${(rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `Rs ${(total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
    ];
  });

  autoTable(doc, {
    startY: 95,
    head: [["NO", "PRODUCT", "HSN/SAC", "UNIT", "QTY", "PRICE", "TOTAL"]],
    body: tableData,
    theme: "grid",
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      fontSize: 8,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [22, 163, 74], // bg-green-600 - matching template4
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
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 'auto', halign: "left" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 10, halign: "center" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 24, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => {
    const displayRate = getDisplayRate(item);
    return sum + (item.quantity || 0) * displayRate;
  }, 0);
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
  doc.text(`Rs ${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos, { align: "right" });
  
  yPos += 5;
  doc.text("SGST (2.5%)", labelCol, yPos);
  doc.text(`Rs ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos, { align: "right" });
  
  yPos += 5;
  doc.text("CGST (2.5%)", labelCol, yPos);
  doc.text(`Rs ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos, { align: "right" });

  // Total Due box (green background - matching template4 bg-green-600)
  yPos += 8;
  doc.setFillColor(22, 163, 74); // bg-green-600
  doc.rect(labelCol - 5, yPos - 4, rightCol - labelCol + 20, 9, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total Due", labelCol, yPos);
  doc.text(`Rs ${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, rightCol, yPos, { align: "right" });
  
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
  if (company.qr_upi) {
    doc.text(`UPI ID: ${company.qr_upi}`, 15, yPos);
    yPos += 4;
  }
  
  // Add QR Code if available
  if (company.qr_code_url) {
    try {
      const response = await fetch(company.qr_code_url);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const imgFormat = company.qr_code_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
      doc.addImage(base64, imgFormat, pageWidth - 50, yPos - 30, 30, 30);
      doc.setFontSize(7);
      doc.text("Scan to Pay", pageWidth - 35, yPos + 2, { align: "center" });
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
  doc.text("TERMS AND CONDITIONS", 15, yPos);
  
  yPos += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81); // Muted gray for terms
  const terms = company.terms_conditions || "Please pay within 15 days from the date of invoice. Late payment is subject to fees of 5% per month.";
  const termsLines = doc.splitTextToSize(terms, pageWidth - 30);
  doc.text(termsLines, 15, yPos);

  // Thank you message
  yPos = pageHeight - 32;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74); // Green accent to match template4
  doc.text("THANK YOU FOR YOUR BUSINESS", pageWidth / 2, yPos, { align: "center" });

  // Dark footer - matching template4 (bg-gray-800: rgb(31, 41, 55))
  doc.setFillColor(31, 41, 55);
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

  return doc.output('blob');
}

/**
 * Fetch order data and generate invoice using the selected template from Invoice Management
 */
export async function fetchAndGenerateInvoice(orderId: string): Promise<{ blob: Blob; invoiceNumber: string }> {
  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", orderId)
    .single();

  if (orderError) throw orderError;

  // Fetch company with template selection
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!company) throw new Error("Company not found");

  // Fetch retailer
  let retailer: any = null;
  if (order.retailer_id) {
    const { data: retailerData } = await supabase
      .from("retailers")
      .select("name, address, phone, gst_number")
      .eq("id", order.retailer_id)
      .single();
    retailer = retailerData;
  }

  if (!retailer) {
    retailer = { name: "Customer", address: "", phone: "", gst_number: "" };
  }

  const invoiceNumber = `INV-${order.id.substring(0, 8).toUpperCase()}`;
  
  // Get the selected template from company settings (default to template4)
  const selectedTemplate = company.invoice_template || 'template4';
  
  console.log('Generating invoice with template:', selectedTemplate);
  console.log('Company data:', { name: company.name, template: company.invoice_template });
  
  // Currently, only template4 is implemented for PDF generation
  // When other templates are added, extend this switch statement
  let blob: Blob;
  
  switch (selectedTemplate) {
    case 'template1':
    case 'template2':
    case 'template3':
    case 'template4':
    default:
      // All templates currently use template4 PDF generation
      // The template4 design matches the preview in Invoice Management
      blob = await generateTemplate4Invoice({
        orderId: order.id,
        company,
        retailer,
        cartItems: order.order_items
      });
      break;
  }

  return { blob, invoiceNumber };
}
