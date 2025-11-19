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
}

interface ReportGeneratorProps {
  data: RetailerReportData[];
  dateRange: string;
}

export const ReportGenerator = ({ data, dateRange }: ReportGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({
    retailerName: true,
    address: true,
    phoneNumber: true,
    visitStatus: true,
    orderPerKG: true,
    totalValue: true,
  });

  const columnLabels = {
    retailerName: "Retailer Name",
    address: "Address",
    phoneNumber: "Phone Number",
    visitStatus: "Visit Status",
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
          filteredRow[columnLabels[key as keyof typeof columnLabels]] = row[key as keyof RetailerReportData];
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

      const worksheet = XLSX.utils.json_to_sheet(selectedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(selectedData[0] || {}).map(key => ({
        wch: Math.min(
          Math.max(
            key.length,
            ...selectedData.map(row => String(row[key] || "").length)
          ),
          maxWidth
        )
      }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `Retailer_Report_${dateRange}.xlsx`);
      
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

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text("Retailer Report", 14, 15);
      doc.setFontSize(10);
      doc.text(`Period: ${dateRange}`, 14, 22);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 27);

      // Prepare table data
      const headers = Object.keys(selectedData[0] || {});
      const rows = selectedData.map(row => 
        headers.map(header => String(row[header] || ""))
      );

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 32 }
      });

      doc.save(`Retailer_Report_${dateRange}.pdf`);
      
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Retailer Report</DialogTitle>
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
                    retailerName: newValue,
                    address: newValue,
                    phoneNumber: newValue,
                    visitStatus: newValue,
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
              {data.length} retailer(s) • Period: {dateRange}
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
