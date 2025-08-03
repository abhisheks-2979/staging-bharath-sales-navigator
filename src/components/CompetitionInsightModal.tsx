import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface CompetitionInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  retailerId: string;
  retailerName: string;
}

export const CompetitionInsightModal = ({ 
  isOpen, 
  onClose, 
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!competitorName || !insightType || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For now, we'll use mock submission. Replace with actual Supabase call when types are updated
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
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
      
      onClose();
    } catch (error) {
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
          <DialogTitle>Competition Insight</DialogTitle>
          <p className="text-sm text-muted-foreground">{retailerName}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="impact">Impact Level</Label>
            <Select value={impactLevel} onValueChange={setImpactLevel}>
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