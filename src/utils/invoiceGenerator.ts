import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceData {
  orderId: string;
  company: any;
  retailer: any;
  cartItems: any[];
  displayInvoiceNumber?: string;
  displayInvoiceDate?: string;
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
  const { orderId, company, retailer, cartItems, displayInvoiceNumber, displayInvoiceDate } = data;
  
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
  doc.rect(0, 0, pageWidth, 52, "F");

  // Logo image - compact size to match preview
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
      // Logo size approximately 120x80 px (42x28 points)
      doc.addImage(base64, imgFormat, 15, 10, 42, 28);
      companyNameX = 60;
    } catch (e) {
      console.warn("Failed to load logo image for invoice PDF:", e);
      companyNameX = 15;
    }
  }

  // Company name and details (left side)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text((company.name || "COMPANY NAME").toUpperCase(), companyNameX, 16);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  let headerY = 21;
  if (company.address) {
    const addressLines = doc.splitTextToSize(company.address, 90);
    doc.text(addressLines.slice(0, 2), companyNameX, headerY);
    headerY += addressLines.slice(0, 2).length * 3.5;
  }
  if (company.contact_phone) {
    doc.text(`Tel: ${company.contact_phone}`, companyNameX, headerY);
    headerY += 3.5;
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, companyNameX, headerY);
    headerY += 3.5;
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

  // Bill To section - add gap after header
  let yPos = 62;
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

  // Invoice details (right side) - add more space after header
  let invoiceY = 62;
  const invoiceNum = (displayInvoiceNumber && displayInvoiceNumber.trim()) || orderId?.slice(0, 8).toUpperCase() || "INV001";
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE #:", pageWidth - 60, invoiceY);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceNum, pageWidth - 15, invoiceY, { align: "right" });
  
  invoiceY += 8;
  doc.setFont("helvetica", "bold");
  doc.text("DATE:", pageWidth - 60, invoiceY);
  doc.setFont("helvetica", "normal");
  doc.text((displayInvoiceDate || new Date().toLocaleDateString("en-GB")), pageWidth - 15, invoiceY, { align: "right" });

  // Items table with green header
  const tableData = cartItems.map((item, index) => {
    const qty = Number(item.quantity) || 0;

    // If we have stored invoice values (from edited invoices), use them directly without conversion
    const hasStoredValues = item.taxable_amount != null && item.sgst_amount != null && item.cgst_amount != null;
    
    let effectiveRate: number;
    let rowTotal: number;
    
    if (hasStoredValues) {
      // Use stored values directly - they're already correct, no conversion needed
      effectiveRate = Number(item.price || item.rate) || 0;
      rowTotal = Number(item.taxable_amount) || 0;
    } else {
      // Calculate from base values with unit conversion
      effectiveRate = getDisplayRate(item);
      rowTotal = effectiveRate * qty;
    }

    return [
      (index + 1).toString(),
      getDisplayName(item),
      item.hsn_code || "-",
      item.unit || "Piece",
      qty.toString(),
      `Rs.${effectiveRate.toFixed(2)}`,
      `Rs.${rowTotal.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: 102,
    head: [["NO", "PRODUCT", "HSN/SAC", "UNIT", "QTY", "PRICE", "TOTAL"]],
    body: tableData,
    theme: "grid",
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.5,
      fontSize: 9,
      textColor: [0, 0, 0],
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [22, 163, 74], // Green header matching preview
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      lineWidth: 0.5,
      lineColor: [22, 163, 74],
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [0, 0, 0],
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: [247, 247, 247],
    },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: 'auto', halign: "left" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 28, halign: "right" },
    },
    margin: { left: 15, right: 15 },
  });

  // Calculate totals - prefer stored invoice values when present
  const hasStoredTotals = cartItems.some(item => 
    item.taxable_amount != null && item.sgst_amount != null && item.cgst_amount != null
  );

  const subtotal = cartItems.reduce((sum, item) => {
    if (hasStoredTotals && item.taxable_amount != null) {
      return sum + Number(item.taxable_amount);
    }
    const qty = Number(item.quantity) || 0;
    const displayRate = getDisplayRate(item);
    return sum + qty * displayRate;
  }, 0);

  const sgst = hasStoredTotals
    ? cartItems.reduce((sum, item) => sum + (Number(item.sgst_amount) || 0), 0)
    : subtotal * 0.025;

  const cgst = hasStoredTotals
    ? cartItems.reduce((sum, item) => sum + (Number(item.cgst_amount) || 0), 0)
    : subtotal * 0.025;

  const total = hasStoredTotals && cartItems.some(item => item.total_amount != null)
    ? cartItems.reduce((sum, item) => sum + (Number(item.total_amount) || 0), 0)
    : (subtotal + sgst + cgst);
  
  // Convert total to words
  const totalInWords = numberToWords(Math.floor(total)) + " Rupees" + 
    (total % 1 > 0 ? " and " + numberToWords(Math.round((total % 1) * 100)) + " Paise" : "") + " Only";

  // Totals section (right-aligned) - matching preview exactly
  yPos = (doc as any).lastAutoTable.finalY + 10;
  const rightCol = pageWidth - 15;
  const labelCol = pageWidth - 55;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  doc.text("SUB-TOTAL", labelCol, yPos);
  doc.text(`Rs.${subtotal.toFixed(2)}`, rightCol, yPos, { align: "right" });
  
  yPos += 5;
  doc.text("SGST (2.5%)", labelCol, yPos);
  doc.text(`Rs.${sgst.toFixed(2)}`, rightCol, yPos, { align: "right" });
  
  yPos += 5;
  doc.text("CGST (2.5%)", labelCol, yPos);
  doc.text(`Rs.${cgst.toFixed(2)}`, rightCol, yPos, { align: "right" });

  // Total amount box (green background - centered text)
  yPos += 6;
  const totalBoxWidth = 65;
  const totalBoxHeight = 10;
  const totalBoxX = pageWidth - 15 - totalBoxWidth;
  const totalBoxY = yPos - 3;
  doc.setFillColor(22, 163, 74); // Green background
  doc.rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  // Center the text horizontally and vertically in the box
  const totalText = `Total amount: Rs.${total.toFixed(2)}`;
  const textWidth = doc.getTextWidth(totalText);
  const centerX = totalBoxX + totalBoxWidth / 2 - textWidth / 2;
  const centerY = totalBoxY + totalBoxHeight / 2 + 3; // +3 to account for text baseline
  doc.text(totalText, centerX, centerY);
  
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
  doc.text("BANK DETAILS", 15, yPos);
  
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
  
  // QR Code and Signature section with proper spacing
  const sectionStartY = yPos;
  
  // Signature (right aligned) - matching preview
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text("For " + (company.name || "Company").toUpperCase(), pageWidth - 15, sectionStartY, { align: "right" });
  
  // Signature line
  const sigLineY = sectionStartY + 16;
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  doc.line(pageWidth - 55, sigLineY, pageWidth - 15, sigLineY);
  
  // Authorized Signatory text in italics
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text("Authorized Signatory", pageWidth - 35, sigLineY + 4, { align: "center" });
  
  // QR Code box (right side)
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
      
      const boxX = pageWidth - 95;
      const boxY = sectionStartY - 10;
      const boxW = 80;
      const boxH = 60;

      // Light gray rounded background box for QR, matching preview
      doc.setFillColor(248, 250, 252); // slate-50 style background
      doc.setDrawColor(203, 213, 225); // slate-300 border
      doc.setLineWidth(0.3);
      if ((doc as any).roundedRect) {
        (doc as any).roundedRect(boxX, boxY, boxW, boxH, 3, 3, "FD");
      } else {
        doc.rect(boxX, boxY, boxW, boxH, "FD");
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(55, 65, 81);
      doc.text("Scan QR for Payment", boxX + boxW / 2, boxY + 8, { align: "center" });

      const imgFormat = company.qr_code_url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
      doc.addImage(base64, imgFormat, boxX + (boxW - 34) / 2, boxY + 14, 34, 34);

      if (company.qr_upi) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        doc.text(`UPI: ${company.qr_upi}`, boxX + boxW / 2, boxY + 50, { align: "center" });
      }
      // ensure yPos goes below the QR box
      yPos = Math.max(yPos, boxY + boxH);
    } catch (error) {
      console.error("Error loading QR code:", error);
    }
  }

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

  // Dark footer bar with only thank you message - matching preview
  const footerHeight = 18;
  const footerY = pageHeight - footerHeight;
  doc.setFillColor(31, 41, 55);
  doc.rect(0, footerY, pageWidth, footerHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("THANK YOU FOR YOUR BUSINESS", pageWidth / 2, footerY + 12, { align: "center" });

  return doc.output('blob');
}

/**
 * Fetch order data and generate invoice using the selected template from Invoice Management
 * Checks for edited invoices first, falls back to generating from order data
 */
export async function fetchAndGenerateInvoice(orderId: string): Promise<{ blob: Blob; invoiceNumber: string }> {
  // First check if an edited invoice exists for this order
  const { data: editedInvoice } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("order_id", orderId)
    .eq("is_edited", true)
    .single();

  if (editedInvoice) {
    // Use edited invoice data
    console.log("📝 Using edited invoice data");
    
    // Fetch company details
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!company) throw new Error("Company not found");

    // Fetch retailer details from the original order
    const { data: order } = await supabase
      .from("orders")
      .select("retailer_id")
      .eq("id", orderId)
      .single();

    let retailer: any = null;
    if (order?.retailer_id) {
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

    // Transform invoice_items to cartItems format
    const cartItems = editedInvoice.invoice_items.map((item: any) => ({
      id: item.id,
      product_name: item.description,
      quantity: item.quantity,
      unit: item.unit,
      rate: item.price_per_unit,
      price: item.price_per_unit,
      total: item.total_amount,
      category: "",
      taxable_amount: item.taxable_amount,
      sgst_amount: item.sgst_amount,
      cgst_amount: item.cgst_amount,
      total_amount: item.total_amount,
    }));

    const displayInvoiceNumber = editedInvoice.invoice_number;
    const displayInvoiceDate = new Date(editedInvoice.invoice_date).toLocaleDateString("en-GB");

    const blob = await generateTemplate4Invoice({
      orderId,
      company,
      retailer,
      cartItems,
      displayInvoiceNumber,
      displayInvoiceDate
    });

    return { blob, invoiceNumber: editedInvoice.invoice_number };
  }

  // Fallback to generating from order data (original behavior)
  console.log("📦 Generating invoice from order data");
  
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

  const displayInvoiceNumber = (order as any).invoice_number || `INV-${order.id.substring(0, 8).toUpperCase()}`;
  const displayInvoiceDate = order.created_at ? new Date(order.created_at).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
  const invoiceNumber = displayInvoiceNumber;
  
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
        cartItems: order.order_items,
        displayInvoiceNumber,
        displayInvoiceDate
      });
      break;
  }

  return { blob, invoiceNumber };
}
