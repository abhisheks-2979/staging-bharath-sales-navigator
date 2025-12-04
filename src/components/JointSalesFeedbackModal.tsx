import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck, Star, TrendingUp, Store, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

// Scoring configuration
const DROPDOWN_SCORES: Record<string, number> = {
  // Placement
  "Excellent - Prime shelf space": 10,
  "Good - Visible location": 7,
  "Average - Needs improvement": 4,
  "Poor - Not visible": 2,
  // New Products
  "Multiple new SKUs introduced": 10,
  "1-2 new products added": 7,
  "Interest shown, will stock later": 4,
  "No new products introduced": 2,
  // Schemes
  "Highly effective - Driving sales": 10,
  "Moderately effective": 7,
  "Not very effective": 4,
  "Needs better schemes": 2,
  // Pricing
  "Very competitive": 10,
  "Competitive": 7,
  "Slightly higher than competitors": 4,
  "Too expensive": 2,
};

export const calculateJointVisitScore = (feedback: any): number => {
  const starFields = [
    'retailing_feedback',
    'competition_knowledge', 
    'product_quality_feedback',
    'service_feedback',
    'consumer_feedback'
  ];
  
  const dropdownFields = [
    'placement_feedback',
    'new_products_introduced',
    'schemes_feedback',
    'pricing_feedback'
  ];
  
  let totalScore = 0;
  let validFields = 0;
  
  // Star ratings (1-5, convert to 0-10)
  starFields.forEach(field => {
    const value = parseInt(feedback[field]) || 0;
    if (value > 0) {
      totalScore += value * 2; // Convert 5-star to 10-point scale
      validFields++;
    }
  });
  
  // Dropdown scores
  dropdownFields.forEach(field => {
    const value = feedback[field];
    if (value && DROPDOWN_SCORES[value]) {
      totalScore += DROPDOWN_SCORES[value];
      validFields++;
    }
  });
  
  if (validFields === 0) return 0;
  return Math.round((totalScore / validFields) * 10) / 10;
};

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
    new_products_introduced: "",
    competition_knowledge: "",
    product_quality_feedback: "",
    service_feedback: "",
    schemes_feedback: "",
    pricing_feedback: "",
    consumer_feedback: "",
    joint_sales_impact: "",
    order_increase_amount: ""
  });

  // Calculate live score
  const currentScore = calculateJointVisitScore(feedback);

  // Load available managers
  useEffect(() => {
    const loadManagers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

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
            new_products_introduced: data.new_products_introduced || "",
            competition_knowledge: data.competition_knowledge || "",
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

  useEffect(() => {
    if (managerId) {
      setSelectedManagerId(managerId);
    }
  }, [managerId]);

  const handleSubmit = async () => {
    if (!selectedManagerId) {
      toast({
        title: "Manager Required",
        description: "Please select the joint visit partner",
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
        new_products_introduced: feedback.new_products_introduced,
        competition_knowledge: feedback.competition_knowledge,
        product_quality_feedback: feedback.product_quality_feedback,
        service_feedback: feedback.service_feedback,
        schemes_feedback: feedback.schemes_feedback,
        pricing_feedback: feedback.pricing_feedback,
        consumer_feedback: feedback.consumer_feedback,
        joint_sales_impact: feedback.joint_sales_impact,
        order_increase_amount: parseFloat(feedback.order_increase_amount) || 0,
        updated_at: new Date().toISOString()
      };

      if (beatPlanId) {
        feedbackData.beat_plan_id = beatPlanId;
      }

      const { error } = await supabase
        .from('joint_sales_feedback')
        .upsert(feedbackData);

      if (error) throw error;

      toast({
        title: "Joint Visit Recorded",
        description: `Feedback saved with score: ${currentScore}/10`,
      });

      onFeedbackSubmitted?.();
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
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200"}
            />
          </button>
        ))}
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-100";
    if (score >= 6) return "text-yellow-600 bg-yellow-100";
    if (score >= 4) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Joint Sales Feedback
            </DialogTitle>
            {currentScore > 0 && (
              <Badge className={`text-lg px-3 py-1 ${getScoreColor(currentScore)}`}>
                Score: {currentScore}/10
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{retailerName}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Joint Visit Partner Selection */}
          {!managerId && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
              <Label className="text-purple-800 dark:text-purple-200 font-medium">Joint Visit Partner *</Label>
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger className="mt-2">
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
            </div>
          )}

          {/* Section 1: Performance Ratings (Star Ratings) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
              <Star className="h-4 w-4" />
              Performance Ratings
            </div>
            <div className="grid gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Retailing Performance</Label>
                  <p className="text-xs text-muted-foreground">Display & selling approach</p>
                </div>
                {renderStarRating(feedback.retailing_feedback, (value) => 
                  setFeedback({ ...feedback, retailing_feedback: value })
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Product Quality</Label>
                  <p className="text-xs text-muted-foreground">Customer satisfaction with quality</p>
                </div>
                {renderStarRating(feedback.product_quality_feedback, (value) => 
                  setFeedback({ ...feedback, product_quality_feedback: value })
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Service Quality</Label>
                  <p className="text-xs text-muted-foreground">Overall service & support</p>
                </div>
                {renderStarRating(feedback.service_feedback, (value) => 
                  setFeedback({ ...feedback, service_feedback: value })
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Competition Knowledge</Label>
                  <p className="text-xs text-muted-foreground">Awareness of competitor activities</p>
                </div>
                {renderStarRating(feedback.competition_knowledge, (value) => 
                  setFeedback({ ...feedback, competition_knowledge: value })
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Consumer Satisfaction</Label>
                  <p className="text-xs text-muted-foreground">End consumer feedback</p>
                </div>
                {renderStarRating(feedback.consumer_feedback, (value) => 
                  setFeedback({ ...feedback, consumer_feedback: value })
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Store Assessment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
              <Store className="h-4 w-4" />
              Store Assessment
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label className="font-medium">Product Placement</Label>
                <Select
                  value={feedback.placement_feedback}
                  onValueChange={(value) => setFeedback({ ...feedback, placement_feedback: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent - Prime shelf space">Excellent - Prime shelf</SelectItem>
                    <SelectItem value="Good - Visible location">Good - Visible</SelectItem>
                    <SelectItem value="Average - Needs improvement">Average</SelectItem>
                    <SelectItem value="Poor - Not visible">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Schemes Effectiveness</Label>
                <Select
                  value={feedback.schemes_feedback}
                  onValueChange={(value) => setFeedback({ ...feedback, schemes_feedback: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Highly effective - Driving sales">Highly effective</SelectItem>
                    <SelectItem value="Moderately effective">Moderate</SelectItem>
                    <SelectItem value="Not very effective">Low</SelectItem>
                    <SelectItem value="Needs better schemes">Needs improvement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Pricing Competitiveness</Label>
                <Select
                  value={feedback.pricing_feedback}
                  onValueChange={(value) => setFeedback({ ...feedback, pricing_feedback: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Very competitive">Very competitive</SelectItem>
                    <SelectItem value="Competitive">Competitive</SelectItem>
                    <SelectItem value="Slightly higher than competitors">Slightly higher</SelectItem>
                    <SelectItem value="Too expensive">Too expensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">New Products Introduced</Label>
                <Select
                  value={feedback.new_products_introduced}
                  onValueChange={(value) => setFeedback({ ...feedback, new_products_introduced: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Multiple new SKUs introduced">Multiple SKUs</SelectItem>
                    <SelectItem value="1-2 new products added">1-2 products</SelectItem>
                    <SelectItem value="Interest shown, will stock later">Interest shown</SelectItem>
                    <SelectItem value="No new products introduced">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3: Sales Outcome */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-300">
              <TrendingUp className="h-4 w-4" />
              Sales Outcome
            </div>
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Order Increase Amount (₹)</Label>
                <Input
                  type="number"
                  value={feedback.order_increase_amount}
                  onChange={(e) => setFeedback({ ...feedback, order_increase_amount: e.target.value })}
                  placeholder="Enter additional order value due to joint visit"
                  className="max-w-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
              <MessageSquare className="h-4 w-4" />
              Summary Notes
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <Textarea
                value={feedback.joint_sales_impact}
                onChange={(e) => setFeedback({ ...feedback, joint_sales_impact: e.target.value })}
                placeholder="Summarize key discussion points, action items, and overall impact of this joint visit..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {currentScore > 0 && (
              <span className={`font-medium ${currentScore >= 7 ? 'text-green-600' : currentScore >= 5 ? 'text-yellow-600' : 'text-orange-600'}`}>
                {currentScore >= 8 ? "Excellent visit!" : currentScore >= 6 ? "Good progress" : currentScore >= 4 ? "Room for improvement" : "Needs attention"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
