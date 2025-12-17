import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MessageSquare, Paintbrush, Users, Target, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
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

type FeedbackType = "retailer" | "branding" | "competition" | "joint-sales";

interface FeedbackListViewProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackType: FeedbackType;
  retailerId: string;
  retailerName: string;
  visitId?: string | null;
  selectedDate?: string;
  onAddNew: () => void;
  onEdit?: (id: string, data: any) => void;
}

interface FeedbackItem {
  id: string;
  created_at: string;
  summary: string;
  details: Record<string, any>;
}

const feedbackConfig = {
  retailer: {
    title: "Retailer Feedback",
    icon: MessageSquare,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  branding: {
    title: "Branding Requests",
    icon: Paintbrush,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950",
  },
  competition: {
    title: "Competition Data",
    icon: Target,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
  "joint-sales": {
    title: "Joint Sales Feedback",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950",
  },
};

export const FeedbackListView = ({
  isOpen,
  onClose,
  feedbackType,
  retailerId,
  retailerName,
  visitId,
  selectedDate,
  onAddNew,
  onEdit,
}: FeedbackListViewProps) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const config = feedbackConfig[feedbackType];
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      fetchFeedback();
    }
  }, [isOpen, feedbackType, retailerId, selectedDate]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetDate = selectedDate || new Date().toISOString().split('T')[0];
      let data: any[] = [];

      switch (feedbackType) {
        case "retailer": {
          const { data: feedbackData, error } = await supabase
            .from('retailer_feedback')
            .select('*')
            .eq('retailer_id', retailerId)
            .eq('user_id', user.id)
            .gte('created_at', targetDate + 'T00:00:00')
            .lte('created_at', targetDate + 'T23:59:59')
            .order('created_at', { ascending: false });
          
          if (!error && feedbackData) {
            data = feedbackData.map((item: any) => ({
              id: item.id,
              created_at: item.created_at,
              summary: `${item.feedback_type || 'Feedback'} - Rating: ${item.rating || item.score || 'N/A'}`,
              details: item,
            }));
          }
          break;
        }
        case "branding": {
          const { data: brandingData, error } = await supabase
            .from('branding_requests')
            .select('*')
            .eq('retailer_id', retailerId)
            .eq('user_id', user.id)
            .gte('created_at', targetDate + 'T00:00:00')
            .lte('created_at', targetDate + 'T23:59:59')
            .order('created_at', { ascending: false });
          
          if (!error && brandingData) {
            data = brandingData.map((item: any) => ({
              id: item.id,
              created_at: item.created_at,
              summary: `${item.title || item.requested_assets || 'Request'} - ${item.status}`,
              details: item,
            }));
          }
          break;
        }
        case "competition": {
          const { data: compData, error } = await supabase
            .from('competition_data')
            .select('*, competition_master(competitor_name), competition_skus(sku_name)')
            .eq('retailer_id', retailerId)
            .eq('user_id', user.id)
            .gte('created_at', targetDate + 'T00:00:00')
            .lte('created_at', targetDate + 'T23:59:59')
            .order('created_at', { ascending: false });
          
          if (!error && compData) {
            data = compData.map((item: any) => ({
              id: item.id,
              created_at: item.created_at,
              summary: `${item.competition_master?.competitor_name || 'Competitor'} - ${item.competition_skus?.sku_name || 'SKU'}`,
              details: item,
            }));
          }
          break;
        }
        case "joint-sales": {
          const { data: jointData, error } = await supabase
            .from('joint_sales_feedback')
            .select('*, profiles:manager_id(full_name)')
            .eq('retailer_id', retailerId)
            .eq('fse_user_id', user.id)
            .eq('feedback_date', targetDate)
            .order('created_at', { ascending: false });
          
          if (!error && jointData) {
            data = jointData.map((item: any) => ({
              id: item.id,
              created_at: item.created_at || '',
              summary: `Joint visit with ${item.profiles?.full_name || 'Manager'}`,
              details: item,
            }));
          }
          break;
        }
      }

      setItems(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      const itemToDelete = items.find(item => item.id === deleteId);
      if (!itemToDelete) throw new Error("Item not found");

      const tableMap: Record<FeedbackType, string> = {
        "retailer": "retailer_feedback",
        "branding": "branding_requests",
        "competition": "competition_data",
        "joint-sales": "joint_sales_feedback",
      };

      const tableName = tableMap[feedbackType];
      const moduleName = config.title;

      // Move to recycle bin first
      const movedToRecycleBin = await moveToRecycleBin({
        tableName,
        recordId: deleteId,
        recordData: itemToDelete.details,
        moduleName,
        recordName: itemToDelete.summary,
      });

      if (!movedToRecycleBin) {
        throw new Error("Failed to move to recycle bin");
      }

      // Then delete from original table
      const { error } = await supabase.from(tableName as any).delete().eq('id', deleteId);
      if (error) throw error;

      toast({ title: "Deleted", description: "Moved to recycle bin. You can restore it if needed." });
      setItems(prev => prev.filter(item => item.id !== deleteId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const renderDetails = (item: FeedbackItem) => {
    const details = item.details;
    
    switch (feedbackType) {
      case "retailer":
        return (
          <div className="space-y-1 text-xs text-muted-foreground">
            {details.product_feedback && <p><strong>Product:</strong> {details.product_feedback}</p>}
            {details.delivery_feedback && <p><strong>Delivery:</strong> {details.delivery_feedback}</p>}
            {details.service_feedback && <p><strong>Service:</strong> {details.service_feedback}</p>}
            {details.additional_notes && <p><strong>Notes:</strong> {details.additional_notes}</p>}
          </div>
        );
      case "branding":
        return (
          <div className="space-y-1 text-xs text-muted-foreground">
            {details.requested_assets && <p><strong>Assets:</strong> {details.requested_assets}</p>}
            {details.size && <p><strong>Size:</strong> {details.size}</p>}
            {details.description && <p><strong>Description:</strong> {details.description}</p>}
            <Badge variant="outline" className="mt-1">{details.status}</Badge>
          </div>
        );
      case "competition":
        return (
          <div className="space-y-1 text-xs text-muted-foreground">
            {details.selling_price && <p><strong>Price:</strong> ₹{details.selling_price}</p>}
            {details.stock_quantity && <p><strong>Stock:</strong> {details.stock_quantity}</p>}
            {details.insight && <p><strong>Insight:</strong> {details.insight}</p>}
            {details.impact_level && <Badge variant="outline" className="mt-1">{details.impact_level}</Badge>}
          </div>
        );
      case "joint-sales":
        return (
          <div className="space-y-1 text-xs text-muted-foreground">
            {details.joint_sales_impact && <p><strong>Impact:</strong> {details.joint_sales_impact}</p>}
            {details.order_increase_amount > 0 && <p><strong>Order Increase:</strong> ₹{details.order_increase_amount}</p>}
            {details.monthly_potential_6months > 0 && <p><strong>6-Month Potential:</strong> ₹{details.monthly_potential_6months}</p>}
            <div className="flex gap-1 flex-wrap mt-1">
              {details.product_packaging_feedback && (
                <Badge variant="outline" className="text-[10px]">
                  Packaging: {details.product_packaging_feedback}★
                </Badge>
              )}
              {details.service_feedback && (
                <Badge variant="outline" className="text-[10px]">
                  Service: {details.service_feedback}★
                </Badge>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              {config.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{retailerName}</p>
          </DialogHeader>

          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <Icon className={`h-12 w-12 mx-auto mb-3 ${config.color} opacity-50`} />
                <p className="text-muted-foreground text-sm">No {config.title.toLowerCase()} recorded for this visit</p>
                <Button onClick={onAddNew} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add New
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-3">
                  {items.map((item) => (
                    <Card key={item.id} className={`${config.bgColor} border-0`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.summary}</p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy, h:mm a') : 'N/A'}
                            </p>
                            <div className="mt-2">
                              {renderDetails(item)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEdit(item.id, item.details)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {items.length > 0 && (
            <div className="pt-3 border-t">
              <Button onClick={onAddNew} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add New {config.title.replace('s', '')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              This feedback will be moved to recycle bin. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
