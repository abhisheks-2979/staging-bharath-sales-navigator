import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useJointSales, JointSalesFeedback } from "@/hooks/useJointSales";
import { cn } from "@/lib/utils";

interface JointSalesFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailerId: string;
  retailerName: string;
  fseUserId: string;
  fseName: string;
  beatPlanId?: string;
  visitId?: string;
}

export const JointSalesFeedbackModal = ({
  isOpen,
  onClose,
  retailerId,
  retailerName,
  fseUserId,
  fseName,
  beatPlanId,
  visitId,
}: JointSalesFeedbackModalProps) => {
  const { submitJointSalesFeedback } = useJointSales();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ratings state
  const [brandingRating, setBrandingRating] = useState(0);
  const [retailingRating, setRetailingRating] = useState(0);
  const [pricingRating, setPricingRating] = useState(0);
  const [schemesRating, setSchemesRating] = useState(0);
  const [competitionRating, setCompetitionRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [samplingRating, setSamplingRating] = useState(0);
  const [distributorRating, setDistributorRating] = useState(0);
  const [salesTrendsRating, setSalesTrendsRating] = useState(0);
  const [futureGrowthRating, setFutureGrowthRating] = useState(0);

  // Dropdown selections
  const [brandingStatus, setBrandingStatus] = useState("");
  const [shelfVisibility, setShelfVisibility] = useState("");
  const [pricingCompliance, setPricingCompliance] = useState("");
  const [schemeAwareness, setSchemeAwareness] = useState("");
  const [competitionPresence, setCompetitionPresence] = useState("");
  const [samplingStatus, setSamplingStatus] = useState("");
  const [distributorService, setDistributorService] = useState("");
  const [salesTrend, setSalesTrend] = useState("");
  const [growthPotential, setGrowthPotential] = useState("");

  // Text fields
  const [retailerNotes, setRetailerNotes] = useState("");
  const [conversationHighlights, setConversationHighlights] = useState("");
  const [actionItems, setActionItems] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const StarRating = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "h-6 w-6",
                star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  const handleSubmit = async () => {
    if (brandingRating === 0 && retailingRating === 0 && pricingRating === 0) {
      toast({
        title: "Missing Feedback",
        description: "Please provide at least one rating before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const feedback: JointSalesFeedback = {
        retailer_id: retailerId,
        fse_user_id: fseUserId,
        manager_id: "", // Will be set by the hook
        beat_plan_id: beatPlanId,
        visit_id: visitId,
        feedback_date: new Date().toISOString().split('T')[0],
        
        branding_rating: brandingRating || undefined,
        retailing_rating: retailingRating || undefined,
        pricing_feedback_rating: pricingRating || undefined,
        schemes_rating: schemesRating || undefined,
        competition_rating: competitionRating || undefined,
        product_feedback_rating: productRating || undefined,
        sampling_rating: samplingRating || undefined,
        distributor_feedback_rating: distributorRating || undefined,
        sales_trends_rating: salesTrendsRating || undefined,
        future_growth_rating: futureGrowthRating || undefined,
        
        branding_status: brandingStatus || undefined,
        shelf_visibility: shelfVisibility || undefined,
        pricing_compliance: pricingCompliance || undefined,
        scheme_awareness: schemeAwareness || undefined,
        competition_presence: competitionPresence || undefined,
        sampling_status: samplingStatus || undefined,
        distributor_service: distributorService || undefined,
        sales_trend: salesTrend || undefined,
        growth_potential: growthPotential || undefined,
        
        retailer_notes: retailerNotes || undefined,
        conversation_highlights: conversationHighlights || undefined,
        action_items: actionItems || undefined,
        additional_notes: additionalNotes || undefined,
      };

      await submitJointSalesFeedback(feedback);

      toast({
        title: "Feedback Submitted",
        description: "Joint sales feedback has been recorded successfully",
      });

      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Joint Sales Feedback</DialogTitle>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Retailer: <span className="font-medium">{retailerName}</span></p>
            <p>FSE: <span className="font-medium">{fseName}</span></p>
            <p>Date: <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
          </div>
        </DialogHeader>

        <Accordion type="multiple" className="w-full">
          <AccordionItem value="branding">
            <AccordionTrigger>Branding & Display</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={brandingRating} onChange={setBrandingRating} />
              </div>
              <div>
                <Label>Branding Status</Label>
                <Select value={brandingStatus} onValueChange={setBrandingStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="retailing">
            <AccordionTrigger>Retailing & Shelf</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={retailingRating} onChange={setRetailingRating} />
              </div>
              <div>
                <Label>Shelf Visibility</Label>
                <Select value={shelfVisibility} onValueChange={setShelfVisibility}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prominent">Prominent</SelectItem>
                    <SelectItem value="visible">Visible</SelectItem>
                    <SelectItem value="hidden">Hidden</SelectItem>
                    <SelectItem value="not_displayed">Not Displayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pricing">
            <AccordionTrigger>Pricing Feedback</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={pricingRating} onChange={setPricingRating} />
              </div>
              <div>
                <Label>Pricing Compliance</Label>
                <Select value={pricingCompliance} onValueChange={setPricingCompliance}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select compliance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="slight_deviation">Slight Deviation</SelectItem>
                    <SelectItem value="major_deviation">Major Deviation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="schemes">
            <AccordionTrigger>Schemes</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={schemesRating} onChange={setSchemesRating} />
              </div>
              <div>
                <Label>Scheme Awareness</Label>
                <Select value={schemeAwareness} onValueChange={setSchemeAwareness}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select awareness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fully_aware">Fully Aware</SelectItem>
                    <SelectItem value="partially_aware">Partially Aware</SelectItem>
                    <SelectItem value="not_aware">Not Aware</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="competition">
            <AccordionTrigger>Competition</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={competitionRating} onChange={setCompetitionRating} />
              </div>
              <div>
                <Label>Competition Presence</Label>
                <Select value={competitionPresence} onValueChange={setCompetitionPresence}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select presence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="product">
            <AccordionTrigger>Product Feedback</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={productRating} onChange={setProductRating} />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sampling">
            <AccordionTrigger>Sampling</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={samplingRating} onChange={setSamplingRating} />
              </div>
              <div>
                <Label>Sampling Status</Label>
                <Select value={samplingStatus} onValueChange={setSamplingStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="not_required">Not Required</SelectItem>
                    <SelectItem value="refused">Refused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="distributor">
            <AccordionTrigger>Distributor Feedback</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={distributorRating} onChange={setDistributorRating} />
              </div>
              <div>
                <Label>Distributor Service</Label>
                <Select value={distributorService} onValueChange={setDistributorService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sales-trends">
            <AccordionTrigger>Sales Trends</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={salesTrendsRating} onChange={setSalesTrendsRating} />
              </div>
              <div>
                <Label>Sales Trend</Label>
                <Select value={salesTrend} onValueChange={setSalesTrend}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="growing">Growing</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="declining">Declining</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="future-growth">
            <AccordionTrigger>Future Growth</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div>
                <Label>Rating</Label>
                <StarRating value={futureGrowthRating} onChange={setFutureGrowthRating} />
              </div>
              <div>
                <Label>Growth Potential</Label>
                <Select value={growthPotential} onValueChange={setGrowthPotential}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select potential" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-4 mt-4">
          <div>
            <Label>Retailer Conversation Highlights</Label>
            <Textarea
              value={conversationHighlights}
              onChange={(e) => setConversationHighlights(e.target.value)}
              placeholder="Key points discussed with the retailer..."
              rows={3}
            />
          </div>

          <div>
            <Label>Action Items</Label>
            <Textarea
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="Follow-up actions required..."
              rows={3}
            />
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any other observations or feedback..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
