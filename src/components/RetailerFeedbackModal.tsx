import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RetailerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId: string;
  retailerId: string;
  retailerName: string;
}

export const RetailerFeedbackModal = ({ 
  isOpen, 
  onClose, 
  visitId, 
  retailerId, 
  retailerName 
}: RetailerFeedbackModalProps) => {
  const [feedbackType, setFeedbackType] = useState("");
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Competition-specific fields
  const [competitorName, setCompetitorName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [insightType, setInsightType] = useState("");
  const [impactLevel, setImpactLevel] = useState("");
  const [actionRequired, setActionRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation based on feedback type
    if (!feedbackType) {
      toast({
        title: "Missing Information",
        description: "Please select feedback type",
        variant: "destructive"
      });
      return;
    }

    if (feedbackType === "competition") {
      if (!competitorName || !insightType || !comments) {
        toast({
          title: "Missing Information",
          description: "Please fill in competitor name, insight type, and description",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (rating === 0) {
        toast({
          title: "Missing Information",
          description: "Please select a rating",
          variant: "destructive"
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // For now, we'll use mock submission. Replace with actual Supabase call when types are updated
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      if (feedbackType === "competition") {
        toast({
          title: "Competition Insight Recorded",
          description: `Insight about ${competitorName} has been recorded for ${retailerName}`,
        });
      } else {
        toast({
          title: "Feedback Recorded",
          description: `${feedbackType.replace('_', ' ')} feedback for ${retailerName} has been recorded`,
        });
      }

      // Reset form
      setFeedbackType("");
      setRating(0);
      setComments("");
      setCompetitorName("");
      setProductCategory("");
      setInsightType("");
      setImpactLevel("");
      setActionRequired(false);
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record feedback",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
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
          <DialogTitle>Retailer Feedback</DialogTitle>
          <p className="text-sm text-muted-foreground">{retailerName}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedback-type">Feedback Type *</Label>
            <Select value={feedbackType} onValueChange={setFeedbackType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand_feedback">Brand Feedback</SelectItem>
                <SelectItem value="service_feedback">Service Feedback</SelectItem>
                <SelectItem value="product_feedback">Product Feedback</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Competition-specific fields */}
          {feedbackType === "competition" ? (
            <>
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
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
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
            </>
          ) : (
            <>
              <div>
                <Label>Rating *</Label>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleStarClick(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        size={24}
                        className={`${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating > 0 && `${rating} star${rating !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="comments">Comments</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Additional feedback or comments..."
                  rows={3}
                />
              </div>
            </>
          )}

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
              {isSubmitting ? "Recording..." : feedbackType === "competition" ? "Record Insight" : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};