import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RetailerReportData {
  retailerName: string;
  address: string;
  phoneNumber: string;
  visitStatus: string;
  orderPerKG: number;
  totalValue: number;
  invoiceDate?: string;
  invoiceNumber?: string;
  productName?: string;
  paymentMode?: string;
}

interface ReportGeneratorProps {
  data: RetailerReportData[];
  dateRange: string;
}

export const ReportGenerator = ({ data, dateRange }: ReportGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({
    invoiceDate: true,
    invoiceNumber: true,
    retailerName: true,
    address: true,
    phoneNumber: true,
    productName: true,
    visitStatus: true,
    paymentMode: true,
    orderPerKG: true,
    totalValue: true,
  });

  const columnLabels = {
    invoiceDate: "Invoice Date",
    invoiceNumber: "Invoice Number",
    retailerName: "Retailer Name",
    address: "Address",
    phoneNumber: "Phone Number",
    productName: "Product Name",
    visitStatus: "Visit Status",
    paymentMode: "Payment Mode",
    orderPerKG: "Order Per KG",
    totalValue: "Total Value (₹)",
  };

  const handleColumnToggle = (column: keyof typeof selectedColumns) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const getSelectedData = () => {
    return data.map(row => {
      const filteredRow: any = {};
      Object.entries(selectedColumns).forEach(([key, isSelected]) => {
        if (isSelected) {
          filteredRow[columnLabels[key as keyof typeof columnLabels]] = row[key as keyof RetailerReportData] ?? '-';
        }
      });
      return filteredRow;
    });
  };

  const handleExportExcel = () => {
    try {
      const selectedData = getSelectedData();
      
      if (selectedData.length === 0) {
        toast({
          title: "No data to export",
          description: "Please select at least one column",
          variant: "destructive"
        });
        return;
      }

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      // Add date header row at the top
      const headerRow = [`Report Date: ${dateRange}`, '', '', ''];
      const emptyRow = [''];
      
      // Convert data to array of arrays for more control
      const headers = Object.keys(selectedData[0] || {});
      const dataRows = selectedData.map(row => headers.map(header => row[header]));
      
      // Combine all rows
      const allRows = [
        headerRow,
        emptyRow,
        headers,
        ...dataRows
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = headers.map((header, idx) => ({
        wch: Math.min(
          Math.max(
            header.length,
            ...dataRows.map(row => String(row[idx] || "").length)
          ),
          maxWidth
        )
      }));
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      XLSX.writeFile(workbook, `Retailer_Report_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      
      toast({
        title: "Excel Export Successful",
        description: `Report exported successfully for ${dateRange}`,
      });
      
      setOpen(false);
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export Excel file",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const selectedData = getSelectedData();
      
      if (selectedData.length === 0) {
        toast({
          title: "No data to export",
          description: "Please select at least one column",
          variant: "destructive"
        });
        return;
      }

      const doc = new jsPDF('landscape');
      
      // Add title with date prominently displayed
      doc.setFontSize(18);
      doc.setTextColor(41, 128, 185);
      doc.text("Retailer Report", 14, 15);
      
      doc.setFontSize(14);
      doc.setTextColor(60, 60, 60);
      doc.text(`Date: ${dateRange}`, 14, 24);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 31);

      // Prepare table data
      const headers = Object.keys(selectedData[0] || {});
      const rows = selectedData.map(row => 
        headers.map(header => String(row[header] || "-"))
      );

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 38,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 38, left: 10, right: 10 },
        tableWidth: 'auto'
      });

      doc.save(`Retailer_Report_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      
      toast({
        title: "PDF Export Successful",
        description: `Report exported successfully for ${dateRange}`,
      });
      
      setOpen(false);
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file",
        variant: "destructive"
      });
    }
  };

  const allSelected = Object.values(selectedColumns).every(val => val);
  const noneSelected = Object.values(selectedColumns).every(val => !val);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-xs sm:text-sm w-full">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Generate Report</span>
          <span className="sm:hidden">Report</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Retailer Report</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Report Date: <span className="font-semibold text-foreground">{dateRange}</span>
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Columns to Export</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newValue = noneSelected;
                  setSelectedColumns({
                    invoiceDate: newValue,
                    invoiceNumber: newValue,
                    retailerName: newValue,
                    address: newValue,
                    phoneNumber: newValue,
                    productName: newValue,
                    visitStatus: newValue,
                    paymentMode: newValue,
                    orderPerKG: newValue,
                    totalValue: newValue,
                  });
                }}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            {Object.entries(columnLabels).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={selectedColumns[key as keyof typeof selectedColumns]}
                  onCheckedChange={() => handleColumnToggle(key as keyof typeof selectedColumns)}
                />
                <Label
                  htmlFor={key}
                  className="text-sm font-normal cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {data.length} record(s) • Period: {dateRange}
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleExportExcel}
                disabled={noneSelected}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
              
              <Button
                onClick={handleExportPDF}
                disabled={noneSelected}
                variant="outline"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
