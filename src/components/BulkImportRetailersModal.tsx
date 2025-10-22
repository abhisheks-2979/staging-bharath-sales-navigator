import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";

interface BulkImportRetailersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRetailer {
  name: string;
  address: string;
  phone: string;
  beat_name: string;
  beat_id: string;
  notes: string;
}

export const BulkImportRetailersModal = ({ open, onOpenChange, onSuccess }: BulkImportRetailersModalProps) => {
  const { user } = useAuth();
  const [textData, setTextData] = useState("");
  const [importing, setImporting] = useState(false);

  const parseData = (data: string): ParsedRetailer[] => {
    const lines = data.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header line
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Split by tab or multiple spaces (common in pasted table data)
      const parts = line.split(/\t+|\s{2,}/).map(s => s.trim());
      
      if (parts.length < 11) return null;

      const [
        retailerName,
        primaryState,
        billingStreet,
        billingCity,
        billingPostalCode,
        billingState,
        billingCountry,
        ownersName,
        ownersNumber,
        beatName,
        recordType,
        accountOwner
      ] = parts;

      // Construct full address
      const address = [billingStreet, billingCity, billingState, billingPostalCode, billingCountry]
        .filter(Boolean)
        .join(', ');

      // Generate beat_id from beat_name (lowercase, replace spaces with hyphens)
      const beatId = beatName.toLowerCase().replace(/\s+/g, '-');

      // Store additional info in notes
      const notes = [
        `Owner: ${ownersName}`,
        `Account Owner: ${accountOwner}`,
        `Record Type: ${recordType}`,
        `Primary State: ${primaryState}`
      ].join(' | ');

      return {
        name: retailerName,
        address,
        phone: ownersNumber,
        beat_name: beatName,
        beat_id: beatId,
        notes
      };
    }).filter((r): r is ParsedRetailer => r !== null);
  };

  const handleImport = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    if (!textData.trim()) {
      toast({ title: "Error", description: "Please paste your data", variant: "destructive" });
      return;
    }

    setImporting(true);

    try {
      const retailers = parseData(textData);
      
      if (retailers.length === 0) {
        toast({ 
          title: "No data found", 
          description: "Please check your data format", 
          variant: "destructive" 
        });
        setImporting(false);
        return;
      }

      // Prepare batch insert
      const payload = retailers.map(r => ({
        user_id: user.id,
        name: r.name,
        address: r.address,
        phone: r.phone,
        beat_id: r.beat_id,
        beat_name: r.beat_name,
        notes: r.notes,
        status: 'active',
        entity_type: 'retailer'
      }));

      const { error } = await supabase
        .from('retailers')
        .insert(payload);

      if (error) {
        console.error('Import error:', error);
        toast({ 
          title: "Import failed", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Success", 
          description: `Successfully imported ${retailers.length} retailers` 
        });
        setTextData("");
        onOpenChange(false);
        onSuccess();
      }
    } catch (err) {
      console.error('Parse error:', err);
      toast({ 
        title: "Error", 
        description: "Failed to parse data. Please check the format.", 
        variant: "destructive" 
      });
    }

    setImporting(false);
  };

  const sampleData = `Retailer Name	Primary State	BillingStreet	BillingCity	BillingPostalCode	BillingState	BillingCountry	Owners Name	Owners Number	Beat Name	Record Type	Account Owner
Vinay sts	Karnataka	Malli katte	Mangalore	575003	Karnataka	India	Vinay	8088346425	Kaikamba Karkala	Retailer	Girish`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Retailers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Data Format</p>
                <p className="text-xs text-muted-foreground">
                  Paste tab-separated data with columns: Retailer Name, Primary State, BillingStreet, 
                  BillingCity, BillingPostalCode, BillingState, BillingCountry, Owners Name, 
                  Owners Number, Beat Name, Record Type, Account Owner
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Paste your data below:</label>
            <Textarea
              placeholder={sampleData}
              value={textData}
              onChange={(e) => setTextData(e.target.value)}
              className="font-mono text-xs min-h-[300px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {textData.trim() ? `${textData.trim().split('\n').length - 1} rows detected` : 'Waiting for data...'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || !textData.trim()}>
            {importing ? "Importing..." : "Import Retailers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
