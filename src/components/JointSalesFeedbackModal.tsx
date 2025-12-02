import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck } from "lucide-react";

interface JointSalesFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailerId: string;
  retailerName: string;
  beatPlanId: string;
  visitId?: string;
  managerId: string;
}

export const JointSalesFeedbackModal = ({
  isOpen,
  onClose,
  retailerId,
  retailerName,
  beatPlanId,
  visitId,
  managerId
}: JointSalesFeedbackModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    retailing_feedback: "",
    placement_feedback: "",
    sales_increase_feedback: "",
    new_products_introduced: "",
    competition_knowledge: "",
    trends_feedback: "",
    product_quality_feedback: "",
    service_feedback: "",
    schemes_feedback: "",
    pricing_feedback: "",
    consumer_feedback: "",
    joint_sales_impact: "",
    order_increase_amount: ""
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('joint_sales_feedback')
        .upsert({
          manager_id: managerId,
          fse_user_id: user.id,
          beat_plan_id: beatPlanId,
          retailer_id: retailerId,
          visit_id: visitId || null,
          feedback_date: new Date().toISOString().split('T')[0],
          retailing_feedback: feedback.retailing_feedback,
          placement_feedback: feedback.placement_feedback,
          sales_increase_feedback: feedback.sales_increase_feedback,
          new_products_introduced: feedback.new_products_introduced,
          competition_knowledge: feedback.competition_knowledge,
          trends_feedback: feedback.trends_feedback,
          product_quality_feedback: feedback.product_quality_feedback,
          service_feedback: feedback.service_feedback,
          schemes_feedback: feedback.schemes_feedback,
          pricing_feedback: feedback.pricing_feedback,
          consumer_feedback: feedback.consumer_feedback,
          joint_sales_impact: feedback.joint_sales_impact,
          order_increase_amount: parseFloat(feedback.order_increase_amount) || 0,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Feedback Submitted",
        description: "Joint sales feedback has been saved successfully",
      });

      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Joint Sales Feedback - {retailerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retailing Feedback</Label>
              <Textarea
                value={feedback.retailing_feedback}
                onChange={(e) => setFeedback({ ...feedback, retailing_feedback: e.target.value })}
                placeholder="Comment on retailer's display and selling approach"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Placement Feedback</Label>
              <Textarea
                value={feedback.placement_feedback}
                onChange={(e) => setFeedback({ ...feedback, placement_feedback: e.target.value })}
                placeholder="Product placement and shelf visibility"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Sales Increase Strategy</Label>
              <Textarea
                value={feedback.sales_increase_feedback}
                onChange={(e) => setFeedback({ ...feedback, sales_increase_feedback: e.target.value })}
                placeholder="Strategies discussed to increase sales"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>New Products Introduced</Label>
              <Textarea
                value={feedback.new_products_introduced}
                onChange={(e) => setFeedback({ ...feedback, new_products_introduced: e.target.value })}
                placeholder="New products introduced during visit"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Competition Knowledge</Label>
              <Textarea
                value={feedback.competition_knowledge}
                onChange={(e) => setFeedback({ ...feedback, competition_knowledge: e.target.value })}
                placeholder="Competitor activity and market insights"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Market Trends</Label>
              <Textarea
                value={feedback.trends_feedback}
                onChange={(e) => setFeedback({ ...feedback, trends_feedback: e.target.value })}
                placeholder="Current market trends observed"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Product Quality Feedback</Label>
              <Textarea
                value={feedback.product_quality_feedback}
                onChange={(e) => setFeedback({ ...feedback, product_quality_feedback: e.target.value })}
                placeholder="Feedback on product quality"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Service Feedback</Label>
              <Textarea
                value={feedback.service_feedback}
                onChange={(e) => setFeedback({ ...feedback, service_feedback: e.target.value })}
                placeholder="Overall service and support feedback"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Schemes Feedback</Label>
              <Textarea
                value={feedback.schemes_feedback}
                onChange={(e) => setFeedback({ ...feedback, schemes_feedback: e.target.value })}
                placeholder="Feedback on current schemes and promotions"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Pricing Feedback</Label>
              <Textarea
                value={feedback.pricing_feedback}
                onChange={(e) => setFeedback({ ...feedback, pricing_feedback: e.target.value })}
                placeholder="Pricing strategy and competitiveness"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Consumer Feedback</Label>
              <Textarea
                value={feedback.consumer_feedback}
                onChange={(e) => setFeedback({ ...feedback, consumer_feedback: e.target.value })}
                placeholder="End consumer feedback and preferences"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Order Increase Amount (₹)</Label>
              <Input
                type="number"
                value={feedback.order_increase_amount}
                onChange={(e) => setFeedback({ ...feedback, order_increase_amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Overall Joint Sales Impact</Label>
            <Textarea
              value={feedback.joint_sales_impact}
              onChange={(e) => setFeedback({ ...feedback, joint_sales_impact: e.target.value })}
              placeholder="Summarize the overall impact of this joint sales visit"
              rows={4}
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