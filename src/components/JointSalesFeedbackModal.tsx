import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck, Star } from "lucide-react";

interface JointSalesFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailerId: string;
  retailerName: string;
  beatPlanId?: string | null;
  visitId?: string;
  managerId?: string | null;
  onFeedbackSubmitted?: () => void;
}

export const JointSalesFeedbackModal = ({
  isOpen,
  onClose,
  retailerId,
  retailerName,
  beatPlanId,
  visitId,
  managerId,
  onFeedbackSubmitted
}: JointSalesFeedbackModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState(managerId || "");
  const [availableManagers, setAvailableManagers] = useState<Array<{ id: string; name: string }>>([]);
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

  // Load available managers (users with manager/admin roles)
  useEffect(() => {
    const loadManagers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all profiles except current user for potential joint visit partners
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .neq('id', user.id)
          .order('full_name');

        if (!error && data) {
          setAvailableManagers(data.map(p => ({ 
            id: p.id, 
            name: p.full_name || p.username || 'Unknown User'
          })));
        }
      } catch (error) {
        console.error('Error loading managers:', error);
      }
    };

    if (isOpen && !managerId) {
      loadManagers();
    }
  }, [isOpen, managerId]);

  // Load existing feedback
  useEffect(() => {
    const loadExistingFeedback = async () => {
      try {
        // Try to find existing feedback by retailer and date
        const today = new Date().toISOString().split('T')[0];
        let query = supabase
          .from('joint_sales_feedback')
          .select('*')
          .eq('retailer_id', retailerId)
          .eq('feedback_date', today);

        if (beatPlanId) {
          query = query.eq('beat_plan_id', beatPlanId);
        }

        const { data, error } = await query.maybeSingle();

        if (!error && data) {
          setSelectedManagerId(data.manager_id);
          setFeedback({
            retailing_feedback: data.retailing_feedback || "",
            placement_feedback: data.placement_feedback || "",
            sales_increase_feedback: data.sales_increase_feedback || "",
            new_products_introduced: data.new_products_introduced || "",
            competition_knowledge: data.competition_knowledge || "",
            trends_feedback: data.trends_feedback || "",
            product_quality_feedback: data.product_quality_feedback || "",
            service_feedback: data.service_feedback || "",
            schemes_feedback: data.schemes_feedback || "",
            pricing_feedback: data.pricing_feedback || "",
            consumer_feedback: data.consumer_feedback || "",
            joint_sales_impact: data.joint_sales_impact || "",
            order_increase_amount: data.order_increase_amount?.toString() || ""
          });
        }
      } catch (error) {
        console.error('Error loading feedback:', error);
      }
    };

    if (isOpen && retailerId) {
      loadExistingFeedback();
    }
  }, [isOpen, beatPlanId, retailerId]);

  // Update selectedManagerId when managerId prop changes
  useEffect(() => {
    if (managerId) {
      setSelectedManagerId(managerId);
    }
  }, [managerId]);

  const handleSubmit = async () => {
    if (!selectedManagerId) {
      toast({
        title: "Manager Required",
        description: "Please select the joint visit partner/manager",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const feedbackData: any = {
        manager_id: selectedManagerId,
        fse_user_id: user.id,
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
      };

      // Only include beat_plan_id if it exists
      if (beatPlanId) {
        feedbackData.beat_plan_id = beatPlanId;
      }

      const { error } = await supabase
        .from('joint_sales_feedback')
        .upsert(feedbackData);

      if (error) throw error;

      toast({
        title: "Joint Visit Recorded",
        description: "Joint sales feedback has been saved successfully",
      });

      // Notify parent component
      onFeedbackSubmitted?.();
      
      // Dispatch event for VisitCard to refresh
      window.dispatchEvent(new CustomEvent('jointSalesFeedbackSubmitted', {
        detail: { retailerId }
      }));

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

  const renderStarRating = (value: string, onChange: (value: string) => void) => {
    const rating = parseInt(value) || 0;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star.toString())}
            className="focus:outline-none transition-colors"
          >
            <Star
              size={24}
              className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
            />
          </button>
        ))}
      </div>
    );
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
          {/* Joint Visit Partner Selection */}
          {!managerId && (
            <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
              <Label className="text-purple-800 dark:text-purple-200 font-medium">Joint Visit Partner *</Label>
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select who joined the visit" />
                </SelectTrigger>
                <SelectContent>
                  {availableManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Select the team member who joined you on this visit
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Retailing Performance</Label>
              {renderStarRating(feedback.retailing_feedback, (value) => 
                setFeedback({ ...feedback, retailing_feedback: value })
              )}
              <p className="text-xs text-muted-foreground">Rate retailer's display and selling approach</p>
            </div>

            <div className="space-y-2">
              <Label>Product Placement</Label>
              <Select
                value={feedback.placement_feedback}
                onValueChange={(value) => setFeedback({ ...feedback, placement_feedback: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select placement quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Excellent - Prime shelf space">Excellent - Prime shelf space</SelectItem>
                  <SelectItem value="Good - Visible location">Good - Visible location</SelectItem>
                  <SelectItem value="Average - Needs improvement">Average - Needs improvement</SelectItem>
                  <SelectItem value="Poor - Not visible">Poor - Not visible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sales Increase Strategy</Label>
              <Select
                value={feedback.sales_increase_feedback}
                onValueChange={(value) => setFeedback({ ...feedback, sales_increase_feedback: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy discussed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upselling techniques">Upselling techniques</SelectItem>
                  <SelectItem value="Cross-selling opportunities">Cross-selling opportunities</SelectItem>
                  <SelectItem value="Promotional campaigns">Promotional campaigns</SelectItem>
                  <SelectItem value="Stock optimization">Stock optimization</SelectItem>
                  <SelectItem value="Customer engagement">Customer engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>New Products Introduced</Label>
              <Select
                value={feedback.new_products_introduced}
                onValueChange={(value) => setFeedback({ ...feedback, new_products_introduced: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Multiple new SKUs introduced">Multiple new SKUs introduced</SelectItem>
                  <SelectItem value="1-2 new products added">1-2 new products added</SelectItem>
                  <SelectItem value="Interest shown, will stock later">Interest shown, will stock later</SelectItem>
                  <SelectItem value="No new products introduced">No new products introduced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Competition Knowledge</Label>
              {renderStarRating(feedback.competition_knowledge, (value) => 
                setFeedback({ ...feedback, competition_knowledge: value })
              )}
              <p className="text-xs text-muted-foreground">Rate awareness of competitor activities</p>
            </div>

            <div className="space-y-2">
              <Label>Market Trends Awareness</Label>
              <Select
                value={feedback.trends_feedback}
                onValueChange={(value) => setFeedback({ ...feedback, trends_feedback: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trend awareness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Highly aware of trends">Highly aware of trends</SelectItem>
                  <SelectItem value="Moderate awareness">Moderate awareness</SelectItem>
                  <SelectItem value="Limited awareness">Limited awareness</SelectItem>
                  <SelectItem value="Not aware of trends">Not aware of trends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product Quality Feedback</Label>
              {renderStarRating(feedback.product_quality_feedback, (value) => 
                setFeedback({ ...feedback, product_quality_feedback: value })
              )}
              <p className="text-xs text-muted-foreground">Rate customer satisfaction with quality</p>
            </div>

            <div className="space-y-2">
              <Label>Service Quality</Label>
              {renderStarRating(feedback.service_feedback, (value) => 
                setFeedback({ ...feedback, service_feedback: value })
              )}
              <p className="text-xs text-muted-foreground">Rate overall service and support</p>
            </div>

            <div className="space-y-2">
              <Label>Schemes Effectiveness</Label>
              <Select
                value={feedback.schemes_feedback}
                onValueChange={(value) => setFeedback({ ...feedback, schemes_feedback: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select scheme effectiveness" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Highly effective - Driving sales">Highly effective - Driving sales</SelectItem>
                  <SelectItem value="Moderately effective">Moderately effective</SelectItem>
                  <SelectItem value="Not very effective">Not very effective</SelectItem>
                  <SelectItem value="Needs better schemes">Needs better schemes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pricing Competitiveness</Label>
              <Select
                value={feedback.pricing_feedback}
                onValueChange={(value) => setFeedback({ ...feedback, pricing_feedback: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pricing feedback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Very competitive">Very competitive</SelectItem>
                  <SelectItem value="Competitive">Competitive</SelectItem>
                  <SelectItem value="Slightly higher than competitors">Slightly higher than competitors</SelectItem>
                  <SelectItem value="Too expensive">Too expensive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Consumer Satisfaction</Label>
              {renderStarRating(feedback.consumer_feedback, (value) => 
                setFeedback({ ...feedback, consumer_feedback: value })
              )}
              <p className="text-xs text-muted-foreground">Rate end consumer satisfaction</p>
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