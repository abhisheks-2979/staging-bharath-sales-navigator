import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { downloadPDF } from "@/utils/fileDownloader";

interface Retailer {
  id: string;
  name: string;
  address: string;
  phone?: string;
  category?: string;
  priority?: string;
  last_visit_date?: string;
  order_value?: number;
}

interface BeatRetailerExportProps {
  beatName: string;
  retailers: Retailer[];
}

const columnConfig = {
  name: { label: "Retailer Name", default: true },
  phone: { label: "Phone Number", default: true },
  address: { label: "Address", default: true },
  category: { label: "Category", default: false },
  priority: { label: "Priority", default: false },
  last_visit_date: { label: "Last Visit Date", default: false },
  order_value: { label: "Order Value (₹)", default: false },
};

type ColumnKey = keyof typeof columnConfig;

export const BeatRetailerExport = ({ beatName, retailers }: BeatRetailerExportProps) => {
  const [open, setOpen] = useState(false);
  
  const [selectedColumns, setSelectedColumns] = useState<Record<ColumnKey, boolean>>(
    Object.fromEntries(
      Object.entries(columnConfig).map(([key, config]) => [key, config.default])
    ) as Record<ColumnKey, boolean>
  );

  const handleColumnToggle = (column: ColumnKey) => {
    setSelectedColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const getSelectedData = () => {
    return retailers.map((retailer, index) => {
      const row: Record<string, string | number> = { "S.No": index + 1 };
      
      Object.entries(selectedColumns).forEach(([key, isSelected]) => {
        if (isSelected) {
          const colKey = key as ColumnKey;
          const label = columnConfig[colKey].label;
          let value = retailer[colKey as keyof Retailer];
          
          if (colKey === 'last_visit_date' && value) {
            value = new Date(value as string).toLocaleDateString('en-IN');
          } else if (colKey === 'order_value' && value) {
            value = `₹${(value as number).toLocaleString('en-IN')}`;
          }
          
          row[label] = value ?? '-';
        }
      });
      
      return row;
    });
  };

  const handleExportExcel = () => {
    try {
      const selectedData = getSelectedData();
      
      if (selectedData.length === 0) {
        toast.error("No retailers to export");
        return;
      }

      const workbook = XLSX.utils.book_new();
      
      // Header rows
      const titleRow = [`Beat: ${beatName}`];
      const countRow = [`Total Retailers: ${retailers.length}`];
      const dateRow = [`Generated: ${new Date().toLocaleDateString('en-IN')}`];
      const emptyRow = [''];
      
      // Data headers and rows
      const headers = Object.keys(selectedData[0] || {});
      const dataRows = selectedData.map(row => headers.map(header => row[header]));
      
      const allRows = [
        titleRow,
        countRow,
        dateRow,
        emptyRow,
        headers,
        ...dataRows
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);

      // Auto-size columns - compact widths
      const colWidths = headers.map((header, idx) => ({
        wch: Math.min(
          Math.max(
            header.length,
            ...dataRows.map(row => String(row[idx] || "").length)
          ),
          30 // Max width reduced for compact layout
        )
      }));
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Retailers");

      const fileName = `${beatName.replace(/[^a-zA-Z0-9]/g, '_')}_Retailers.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success("Excel exported successfully");
      setOpen(false);
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel file");
    }
  };

  const handleExportPDF = async () => {
    try {
      const selectedData = getSelectedData();
      
      if (selectedData.length === 0) {
        toast.error("No retailers to export");
        return;
      }

      // Use portrait for compact layout, landscape if many columns
      const selectedCount = Object.values(selectedColumns).filter(Boolean).length;
      const orientation = selectedCount > 4 ? 'landscape' : 'portrait';
      const doc = new jsPDF(orientation);
      
      // Beat heading
      doc.setFontSize(16);
      doc.setTextColor(41, 128, 185);
      doc.text(`Beat: ${beatName}`, 14, 15);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`Total Retailers: ${retailers.length}`, 14, 23);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 29);

      // Prepare table data
      const headers = Object.keys(selectedData[0] || {});
      const rows = selectedData.map(row => 
        headers.map(header => String(row[header] || "-"))
      );

      // Compact table styling to fit more on one page
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        styles: { 
          fontSize: 8, 
          cellPadding: 1.5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [41, 128, 185], 
          textColor: 255, 
          fontStyle: 'bold',
          fontSize: 8
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { top: 35, left: 10, right: 10, bottom: 10 },
        tableWidth: 'auto',
        columnStyles: {
          0: { cellWidth: 12 }, // S.No column narrow
        }
      });

      const fileName = `${beatName.replace(/[^a-zA-Z0-9]/g, '_')}_Retailers.pdf`;
      const pdfBlob = doc.output('blob');
      await downloadPDF(pdfBlob, fileName);
      
      toast.success("PDF exported successfully");
      setOpen(false);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF file");
    }
  };

  const allSelected = Object.values(selectedColumns).every(val => val);
  const noneSelected = Object.values(selectedColumns).every(val => !val);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Retailers</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Beat: <span className="font-semibold text-foreground">{beatName}</span>
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Columns</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newValue = !allSelected;
                  setSelectedColumns(
                    Object.fromEntries(
                      Object.keys(columnConfig).map(key => [key, newValue])
                    ) as Record<ColumnKey, boolean>
                  );
                }}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            {Object.entries(columnConfig).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${key}`}
                  checked={selectedColumns[key as ColumnKey]}
                  onCheckedChange={() => handleColumnToggle(key as ColumnKey)}
                />
                <Label
                  htmlFor={`col-${key}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {config.label}
                </Label>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground">
              {retailers.length} retailer(s) will be exported
            </p>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleExportExcel}
                disabled={noneSelected}
                className="gap-2"
                size="sm"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              
              <Button
                onClick={handleExportPDF}
                disabled={noneSelected}
                variant="outline"
                className="gap-2"
                size="sm"
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
