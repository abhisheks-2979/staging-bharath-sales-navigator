import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CompetitionInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  visitId: string;
  retailerId: string;
  retailerName: string;
}

export const CompetitionInsightModal = ({ 
  isOpen, 
  onClose, 
  onBack,
  visitId, 
  retailerId, 
  retailerName 
}: CompetitionInsightModalProps) => {
  const [competitorName, setCompetitorName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [insightType, setInsightType] = useState("");
  const [description, setDescription] = useState("");
  const [impactLevel, setImpactLevel] = useState("");
  const [actionRequired, setActionRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);

  const processPhoto = async (file: File) => {
    setPhotoFile(file);
    setIsScanning(true);

    try {
      // Upload photo to Supabase storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('competition-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('competition-photos')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);

      // Scan the photo using new edge function with duplicate detection
      const { data: scanData, error: scanError } = await supabase.functions.invoke(
        'scan-competition-insight',
        { body: { imageUrl: publicUrl } }
      );

      if (scanError) throw scanError;

      // Check if it's a duplicate
      if (scanData.isDuplicate) {
        toast({
          title: "Duplicate Competitor Detected!",
          description: scanData.message,
          variant: "destructive"
        });
        
        // Still auto-fill with the detected data but show warning
        if (scanData.existingData) {
          setCompetitorName(scanData.existingData.competitor_name);
          setDescription(scanData.existingData.product_details || '');
        }
        return;
      }

      // Auto-fill form with extracted data
      const extractedData = scanData.extractedData;
      if (extractedData.competitor_name) setCompetitorName(extractedData.competitor_name);
      if (extractedData.product_details) setDescription(extractedData.product_details);
      if (extractedData.category) setProductCategory(extractedData.category);
      
      toast({
        title: "Photo Scanned Successfully",
        description: "Competition information extracted and auto-filled",
      });
    } catch (error) {
      console.error('Error scanning photo:', error);
      toast({
        title: "Scan Failed",
        description: "Failed to extract information from photo. Please fill manually.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPhoto(file);
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        await processPhoto(file);
      }
    };
    input.click();
    setShowCameraOptions(false);
  };

  const handleGalleryUpload = () => {
    const input = document.getElementById('photo') as HTMLInputElement;
    input?.click();
    setShowCameraOptions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!competitorName || !insightType || !description || !impactLevel) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Competitor Name, Insight Type, Description, Impact Level)",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check for duplicates before inserting
      const { data: duplicateCheck } = await supabase
        .rpc('check_duplicate_competitor', { 
          competitor_name_param: competitorName 
        });

      if (duplicateCheck && duplicateCheck.length > 0) {
        toast({
          title: "Duplicate Competitor",
          description: `"${competitorName}" already exists in the system. No need to add it again.`,
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('competition_insights')
        .insert([{
          user_id: user.id,
          retailer_id: retailerId,
          visit_id: visitId,
          competitor_name: competitorName,
          competitor_image_url: photoUrl || '',
          product_details: description,
          product_category: productCategory || null,
          insight_type: insightType,
          description: description,
          impact_level: impactLevel || null,
          action_required: actionRequired
        }]);

      if (error) throw error;
      
      toast({
        title: "Competition Insight Recorded",
        description: `Insight about ${competitorName} has been recorded for ${retailerName}`,
      });

      // Reset form
      setCompetitorName("");
      setProductCategory("");
      setInsightType("");
      setDescription("");
      setImpactLevel("");
      setActionRequired(false);
      setPhotoFile(null);
      setPhotoUrl("");
      
      onClose();
    } catch (error) {
      console.error('Error recording insight:', error);
      toast({
        title: "Error",
        description: "Failed to record competition insight",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-1 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>Competition Insight</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">{retailerName}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="photo">Competition Photo</Label>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCameraOptions(!showCameraOptions)}
                className="w-full"
                disabled={isScanning}
              >
                <Camera className="h-4 w-4 mr-2" />
                {photoFile ? 'Change Photo' : 'Add Photo'}
              </Button>
              
              {showCameraOptions && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCameraCapture}
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGalleryUpload}
                    className="flex-1"
                  >
                    Gallery
                  </Button>
                </div>
              )}
              
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={isScanning}
                className="hidden"
              />
              
              {isScanning && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Scanning photo...</span>
                </div>
              )}
              
              {photoFile && !isScanning && (
                <p className="text-sm text-muted-foreground">
                  Photo selected: {photoFile.name}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capture or upload a photo to auto-fill competitor details
            </p>
          </div>

          <div>
            <Label htmlFor="competitor">Competitor Name *</Label>
            <Input
              id="competitor"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              placeholder="Enter competitor name"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Product Category</Label>
            <Input
              id="category"
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              placeholder="e.g., Rice, Oil, Pulses"
            />
          </div>

          <div>
            <Label htmlFor="insight-type">Insight Type *</Label>
            <Select value={insightType} onValueChange={setInsightType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select insight type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pricing">Pricing</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
                <SelectItem value="placement">Placement</SelectItem>
                <SelectItem value="product_availability">Product Availability</SelectItem>
                <SelectItem value="customer_preference">Customer Preference</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="impact">Impact Level *</Label>
            <Select value={impactLevel} onValueChange={setImpactLevel} required>
              <SelectTrigger>
                <SelectValue placeholder="Select impact level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            {impactLevel && (
              <Badge className={`mt-2 ${getImpactColor(impactLevel)}`}>
                {impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)} Impact
              </Badge>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the competition insight in detail..."
              rows={3}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="action-required"
              checked={actionRequired}
              onChange={(e) => setActionRequired(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="action-required">Action Required</Label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Recording..." : "Record Insight"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};