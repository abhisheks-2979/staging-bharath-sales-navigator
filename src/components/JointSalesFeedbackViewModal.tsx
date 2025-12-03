import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserCheck, Star, Edit, Trash2, Calendar, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface JointSalesFeedbackViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  retailerId: string;
  retailerName: string;
  feedbackDate: string;
  onEdit: () => void;
  onDeleted: () => void;
}

interface FeedbackData {
  id: string;
  manager_id: string;
  manager_name?: string;
  feedback_date: string;
  retailing_feedback: string;
  placement_feedback: string;
  sales_increase_feedback: string;
  new_products_introduced: string;
  competition_knowledge: string;
  trends_feedback: string;
  product_quality_feedback: string;
  service_feedback: string;
  schemes_feedback: string;
  pricing_feedback: string;
  consumer_feedback: string;
  joint_sales_impact: string;
  order_increase_amount: number;
  created_at: string;
}

export const JointSalesFeedbackViewModal = ({
  isOpen,
  onClose,
  retailerId,
  retailerName,
  feedbackDate,
  onEdit,
  onDeleted
}: JointSalesFeedbackViewModalProps) => {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && retailerId && feedbackDate) {
      loadFeedback();
    }
  }, [isOpen, retailerId, feedbackDate]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('joint_sales_feedback')
        .select('*')
        .eq('retailer_id', retailerId)
        .eq('feedback_date', feedbackDate)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Fetch manager name
        const { data: managerProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', data.manager_id)
          .single();

        setFeedback({
          ...data,
          manager_name: managerProfile?.full_name || managerProfile?.username || 'Unknown'
        });
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('joint_sales_feedback')
        .delete()
        .eq('id', feedback.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Joint sales feedback has been deleted"
      });
      
      onDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderStars = (value: string) => {
    const rating = parseInt(value) || 0;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        ))}
      </div>
    );
  };

  const renderFeedbackItem = (label: string, value: string | number | undefined, isRating = false) => {
    if (!value && value !== 0) return null;
    
    return (
      <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        {isRating ? (
          renderStars(String(value))
        ) : (
          <span className="text-sm font-medium text-right max-w-[200px]">{value}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Joint Sales Feedback
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{retailerName}</p>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !feedback ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback found
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">{feedback.manager_name}</span>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    Joint Visit Partner
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(feedback.feedback_date), 'dd MMM yyyy')}
                  </div>
                  {feedback.order_increase_amount > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <IndianRupee className="h-3 w-3" />
                      +{feedback.order_increase_amount.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Details */}
              <div className="space-y-1">
                {renderFeedbackItem("Retailing Performance", feedback.retailing_feedback, true)}
                {renderFeedbackItem("Product Placement", feedback.placement_feedback)}
                {renderFeedbackItem("Sales Strategy", feedback.sales_increase_feedback)}
                {renderFeedbackItem("New Products", feedback.new_products_introduced)}
                {renderFeedbackItem("Competition Knowledge", feedback.competition_knowledge, true)}
                {renderFeedbackItem("Market Trends", feedback.trends_feedback)}
                {renderFeedbackItem("Product Quality", feedback.product_quality_feedback, true)}
                {renderFeedbackItem("Service Quality", feedback.service_feedback, true)}
                {renderFeedbackItem("Schemes Effectiveness", feedback.schemes_feedback)}
                {renderFeedbackItem("Pricing Feedback", feedback.pricing_feedback)}
                {renderFeedbackItem("Consumer Satisfaction", feedback.consumer_feedback, true)}
              </div>

              {/* Impact Notes */}
              {feedback.joint_sales_impact && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Overall Impact</p>
                  <p className="text-sm">{feedback.joint_sales_impact}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
              disabled={loading || !feedback}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit();
              }}
              disabled={loading || !feedback}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the joint sales feedback for {retailerName}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
