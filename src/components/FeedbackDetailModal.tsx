import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Building2, Palette, Target, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface FeedbackDetailModalProps {
  open: boolean;
  onClose: () => void;
  type: 'retailer' | 'branding' | 'competition';
  data: any;
}

export function FeedbackDetailModal({ open, onClose, type, data }: FeedbackDetailModalProps) {
  if (!data) return null;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
        />
      ))}
    </div>
  );

  const getImpactColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-success/10 text-success border-success/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success/10 text-success';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      case 'executed': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'retailer' && <MessageSquare className="h-5 w-5 text-blue-500" />}
            {type === 'branding' && <Palette className="h-5 w-5 text-purple-500" />}
            {type === 'competition' && <Target className="h-5 w-5 text-orange-500" />}
            {type === 'retailer' && 'Retailer Feedback'}
            {type === 'branding' && 'Branding Request'}
            {type === 'competition' && 'Competition Insight'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Retailer Name */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Building2 size={16} className="text-primary flex-shrink-0" />
              <span className="font-medium">{data.retailer_name || 'Unknown Retailer'}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar size={14} />
              <span>{data.created_at ? format(new Date(data.created_at), 'PPP p') : 'Unknown date'}</span>
            </div>

            {/* Type-specific content */}
            {type === 'retailer' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    {renderStars(data.rating || 0)}
                  </div>
                  {data.feedback_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline" className="capitalize">
                        {data.feedback_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </div>
                {data.summary_notes && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Notes</span>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {data.summary_notes}
                    </p>
                  </div>
                )}
              </>
            )}

            {type === 'branding' && (
              <>
                <div className="space-y-2">
                  {data.title && (
                    <div>
                      <span className="text-sm text-muted-foreground">Title</span>
                      <p className="font-medium">{data.title}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={`capitalize ${getStatusColor(data.status)}`}>
                      {data.status}
                    </Badge>
                  </div>
                </div>
                {data.requested_assets && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Requested Assets</span>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {data.requested_assets}
                    </p>
                  </div>
                )}
                {data.description && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Description</span>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {data.description}
                    </p>
                  </div>
                )}
              </>
            )}

            {type === 'competition' && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Competitor</span>
                    <span className="font-medium">{data.competitor_name || 'Unknown'}</span>
                  </div>
                  {data.impact_level && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Impact Level</span>
                      <Badge className={`border ${getImpactColor(data.impact_level)}`}>
                        {data.impact_level}
                      </Badge>
                    </div>
                  )}
                </div>
                {data.insight && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Insight</span>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                      {data.insight}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
