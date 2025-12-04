import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface RetailerFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  visitId: string;
  retailerId: string;
  retailerName: string;
}

// Calculate score for retailer feedback (4 star fields × 5 max = 20 max points, displayed out of 10)
const calculateRetailerFeedbackScore = (feedback: {
  product_packaging: number;
  product_sku_range: number;
  product_quality: number;
  product_placement: number;
}): number => {
  const { product_packaging, product_sku_range, product_quality, product_placement } = feedback;
  const totalPoints = product_packaging + product_sku_range + product_quality + product_placement;
  const MAX_SCORE = 20; // 4 fields × 5 points each
  
  if (totalPoints === 0) return 0;
  return Math.round((totalPoints / MAX_SCORE) * 100) / 10;
};

export const RetailerFeedbackModal = ({ 
  isOpen, 
  onClose, 
  onBack,
  visitId, 
  retailerId, 
  retailerName 
}: RetailerFeedbackModalProps) => {
  const [feedback, setFeedback] = useState({
    product_packaging: 0,
    product_sku_range: 0,
    product_quality: 0,
    product_placement: 0,
    summary_notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate live score
  const currentScore = calculateRetailerFeedbackScore({
    product_packaging: feedback.product_packaging,
    product_sku_range: feedback.product_sku_range,
    product_quality: feedback.product_quality,
    product_placement: feedback.product_placement
  });

  // Load existing feedback
  useEffect(() => {
    const loadExistingFeedback = async () => {
      if (!isOpen || !retailerId) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('retailer_feedback')
          .select('*')
          .eq('retailer_id', retailerId)
          .eq('feedback_date', today)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          setFeedback({
            product_packaging: data.product_packaging || 0,
            product_sku_range: data.product_sku_range || 0,
            product_quality: data.product_quality || 0,
            product_placement: data.product_placement || 0,
            summary_notes: data.summary_notes || ""
          });
        }
      } catch (error) {
        console.error('Error loading existing feedback:', error);
      }
    };

    loadExistingFeedback();
  }, [isOpen, retailerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if at least one rating is provided
    const hasRating = feedback.product_packaging > 0 || 
                      feedback.product_sku_range > 0 || 
                      feedback.product_quality > 0 || 
                      feedback.product_placement > 0;

    if (!hasRating) {
      toast({
        title: "Missing Information",
        description: "Please provide at least one rating",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const feedbackData = {
        user_id: user.id,
        retailer_id: retailerId,
        visit_id: visitId || null,
        feedback_type: 'retailer_feedback',
        feedback_date: new Date().toISOString().split('T')[0],
        product_packaging: feedback.product_packaging,
        product_sku_range: feedback.product_sku_range,
        product_quality: feedback.product_quality,
        product_placement: feedback.product_placement,
        summary_notes: feedback.summary_notes || null,
        score: currentScore,
        updated_at: new Date().toISOString()
      };

      // Check if record exists for today
      const { data: existing } = await supabase
        .from('retailer_feedback')
        .select('id')
        .eq('retailer_id', retailerId)
        .eq('feedback_date', feedbackData.feedback_date)
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existing) {
        const result = await supabase
          .from('retailer_feedback')
          .update(feedbackData)
          .eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('retailer_feedback')
          .insert(feedbackData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Feedback Recorded",
        description: `Retailer feedback for ${retailerName} saved with score: ${currentScore}/10`,
      });

      // Reset form
      setFeedback({
        product_packaging: 0,
        product_sku_range: 0,
        product_quality: 0,
        product_placement: 0,
        summary_notes: ""
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record feedback",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (value: number, onChange: (value: number) => void, label: string, description: string) => {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label className="font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-1 hover:scale-110 transition-transform focus:outline-none"
            >
              <Star
                size={24}
                className={`${
                  star <= value
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300 hover:text-yellow-200"
                } transition-colors`}
              />
            </button>
          ))}
        </div>
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
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
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-orange-600" />
                Retailer Feedback
              </DialogTitle>
            </div>
            {currentScore > 0 && (
              <Badge className={`text-sm px-2 py-1 ${getScoreColor(currentScore)}`}>
                Score: {currentScore}/10
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{retailerName}</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Performance Ratings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
              <Star className="h-4 w-4" />
              Performance Ratings
            </div>
            <div className="grid gap-4 p-4 bg-muted/30 rounded-lg">
              {renderStarRating(
                feedback.product_packaging,
                (value) => setFeedback({ ...feedback, product_packaging: value }),
                "Product Packaging",
                "Packaging quality & appeal"
              )}
              
              {renderStarRating(
                feedback.product_sku_range,
                (value) => setFeedback({ ...feedback, product_sku_range: value }),
                "Product SKU Range",
                "Variety of products stocked"
              )}
              
              {renderStarRating(
                feedback.product_quality,
                (value) => setFeedback({ ...feedback, product_quality: value }),
                "Product Quality",
                "Customer satisfaction with quality"
              )}
              
              {renderStarRating(
                feedback.product_placement,
                (value) => setFeedback({ ...feedback, product_placement: value }),
                "Product Placement",
                "Visibility and shelf positioning"
              )}
            </div>
          </div>

          {/* Summary Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="summary_notes" className="font-medium">Summary Notes</Label>
            <Textarea
              id="summary_notes"
              value={feedback.summary_notes}
              onChange={(e) => setFeedback({ ...feedback, summary_notes: e.target.value })}
              placeholder="Additional observations and feedback notes..."
              rows={3}
              className="resize-none"
            />
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
              {isSubmitting ? "Saving..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
