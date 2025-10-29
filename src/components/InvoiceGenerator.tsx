import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvoiceItem {
  product_name: string;
  quantity: number;
  rate: number;
  total: number;
  unit?: string;
}

interface InvoiceGeneratorProps {
  orderId: string;
  className?: string;
}

export const InvoiceGenerator = ({ orderId, className }: InvoiceGeneratorProps) => {
  const generateInvoice = async () => {
    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_name,
            quantity,
            rate,
            total,
            unit
          )
        `)
        .eq("id", orderId)
        .single();

      console.log('Order data for invoice:', order);

      if (orderError) throw orderError;

      // Fetch retailer details
      const { data: retailer, error: retailerError } = await supabase
        .from("retailers")
        .select("*")
        .eq("id", order.retailer_id)
        .single();

      if (retailerError) throw retailerError;

      // Fetch distributor details if mapping exists
      let distributorName = "";
      let distributorPhone = "";
      let distributorAddress = "";
      
      const { data: mapping } = await supabase
        .from("distributor_retailer_mappings")
        .select("distributor_id")
        .eq("retailer_id", order.retailer_id)
        .eq("user_id", order.user_id)
        .maybeSingle();

      if (mapping?.distributor_id) {
        const { data: distributor } = await supabase
          .from("retailers")
          .select("name, phone, address")
          .eq("id", mapping.distributor_id)
          .eq("entity_type", "distributor")
          .maybeSingle();

        if (distributor) {
          distributorName = distributor.name;
          distributorPhone = distributor.phone || "";
          distributorAddress = distributor.address || "";
        }
      }

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Add company logo placeholder and header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text("INVOICE", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.text(`Order #${order.id.substring(0, 8)}`, pageWidth / 2, 30, { align: "center" });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      let yPos = 50;

      // Distributor details (if available)
      if (distributorName) {
        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text("Distributor Details:", 14, yPos);
        doc.setFont(undefined, "normal");
        doc.setFontSize(10);
        yPos += 7;
        doc.text(distributorName, 14, yPos);
        if (distributorPhone) {
          yPos += 5;
          doc.text(`Phone: ${distributorPhone}`, 14, yPos);
        }
        if (distributorAddress) {
          yPos += 5;
          const addressLines = doc.splitTextToSize(distributorAddress, 85);
          doc.text(addressLines, 14, yPos);
          yPos += addressLines.length * 5;
        }
        yPos += 10;
      }

      // Retailer details
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Retailer Details:", 14, yPos);
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      yPos += 7;
      doc.text(retailer.name, 14, yPos);
      yPos += 5;
      if (retailer.phone) {
        doc.text(`Phone: ${retailer.phone}`, 14, yPos);
        yPos += 5;
      }
      if (retailer.address) {
        const addressLines = doc.splitTextToSize(retailer.address, 85);
        doc.text(addressLines, 14, yPos);
        yPos += addressLines.length * 5;
      }
      if (retailer.gst_number) {
        doc.text(`GST: ${retailer.gst_number}`, 14, yPos);
        yPos += 5;
      }

      // Invoice date on the right side
      const invoiceDate = new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
      doc.text(`Date: ${invoiceDate}`, pageWidth - 14, 50, { align: "right" });

      yPos += 10;

      // Order items table
      const tableData = order.order_items.map((item: InvoiceItem) => [
        item.product_name,
        item.quantity.toString(),
        `Rs. ${item.rate.toFixed(2)}`,
        item.unit || "pcs",
        `Rs. ${item.total.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Product", "Qty", "Rate", "Unit", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold"
        },
        styles: {
          fontSize: 9,
          cellPadding: 5
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 30, halign: "right" },
          3: { cellWidth: 25, halign: "center" },
          4: { cellWidth: 35, halign: "right" }
        }
      });

      // Calculate totals
      const subtotal = order.subtotal || 0;
      const discount = order.discount_amount || 0;
      const amountAfterDiscount = subtotal - discount;
      const cgst = amountAfterDiscount * 0.09;
      const sgst = amountAfterDiscount * 0.09;
      const calculatedTotal = amountAfterDiscount + cgst + sgst;
      const total = order.total_amount || calculatedTotal;
      const previousPendingCleared = (order as any).previous_pending_cleared || 0;

      // Get final Y position after table
      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Totals section with better spacing
      const totalsX = pageWidth - 75;
      let totalsY = finalY;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      
      // Subtotal
      doc.text("Subtotal:", totalsX, totalsY);
      doc.text(`Rs. ${subtotal.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
      totalsY += 6;

      // Discount
      if (discount > 0) {
        doc.setTextColor(220, 38, 38); // Red for discount
        doc.text("Discount:", totalsX, totalsY);
        doc.text(`- Rs. ${discount.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
        doc.setTextColor(0, 0, 0);
        totalsY += 6;
      }

      // Amount after discount (if there was a discount)
      if (discount > 0) {
        doc.text("Amount after Discount:", totalsX, totalsY);
        doc.text(`Rs. ${amountAfterDiscount.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
        totalsY += 6;
      }

      // Taxes
      doc.text("CGST (9%):", totalsX, totalsY);
      doc.text(`Rs. ${cgst.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
      totalsY += 6;

      doc.text("SGST (9%):", totalsX, totalsY);
      doc.text(`Rs. ${sgst.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
      totalsY += 8;

      // Draw line above total
      doc.setLineWidth(0.5);
      doc.line(totalsX, totalsY, pageWidth - 14, totalsY);
      totalsY += 7;

      // Total Amount
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("Total Amount:", totalsX, totalsY);
      doc.text(`Rs. ${total.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });

      // Payment status and previous pending cleared
      if (previousPendingCleared > 0) {
        totalsY += 10;
        
        // Draw separator line
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200);
        doc.line(totalsX, totalsY, pageWidth - 14, totalsY);
        totalsY += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.setTextColor(34, 197, 94); // Green color
        doc.text("Previous Pending Cleared:", totalsX, totalsY);
        doc.text(`Rs. ${previousPendingCleared.toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
        doc.setTextColor(0, 0, 0);
        totalsY += 8;
        
        doc.setFont(undefined, "bold");
        doc.setFontSize(11);
        doc.text("Grand Total Paid:", totalsX, totalsY);
        doc.text(`Rs. ${(total + previousPendingCleared).toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
        doc.setFont(undefined, "normal");
      }

      if (order.is_credit_order) {
        totalsY += 10;
        
        // Draw separator line
        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200);
        doc.line(totalsX, totalsY, pageWidth - 14, totalsY);
        totalsY += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.setTextColor(34, 197, 94); // Green
        doc.text("Paid Now:", totalsX, totalsY);
        doc.text(`Rs. ${(order.credit_paid_amount || 0).toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
        doc.setTextColor(0, 0, 0);
        totalsY += 6;
        
        doc.setTextColor(220, 38, 38); // Red
        doc.setFont(undefined, "bold");
        doc.text("Pending Amount:", totalsX, totalsY);
        doc.text(`Rs. ${(order.credit_pending_amount || 0).toFixed(2)}`, pageWidth - 14, totalsY, { align: "right" });
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(8);
      doc.setFont(undefined, "italic");
      doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

      // Save PDF
      const fileName = `Invoice_${order.id.substring(0, 8)}_${invoiceDate.replace(/\s/g, "_")}.pdf`;
      doc.save(fileName);

      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  return (
    <Button
      onClick={generateInvoice}
      variant="outline"
      size="sm"
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Download Invoice
    </Button>
  );
};
