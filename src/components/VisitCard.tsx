import { MapPin, Phone, Store, ShoppingCart, XCircle, BarChart3, Check, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { CompetitionInsightModal } from "./CompetitionInsightModal";
import { RetailerFeedbackModal } from "./RetailerFeedbackModal";
import { NoOrderModal } from "./NoOrderModal";
import { supabase } from "@/integrations/supabase/client";

interface Visit {
  id: string;
  retailerName: string;
  address: string;
  phone: string;
  retailerCategory: string;
  status: "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
  visitType: string;
  time?: string;
  checkInStatus?: "not-checked-in" | "checked-in-correct" | "checked-in-wrong-location";
  hasOrder?: boolean;
  orderValue?: number;
  noOrderReason?: "over-stocked" | "owner-not-available" | "store-closed" | "permanently-closed";
  distributor?: string;
}

interface VisitCardProps {
  visit: Visit;
  onViewDetails: (visitId: string) => void;
}

export const VisitCard = ({ visit, onViewDetails }: VisitCardProps) => {
  const navigate = useNavigate();
  const [showNoOrderModal, setShowNoOrderModal] = useState(false);
  const [noOrderReason, setNoOrderReason] = useState<string>(visit.noOrderReason || "");
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasViewedAnalytics, setHasViewedAnalytics] = useState(false);
  // Check if user has viewed analytics for this visit
  useEffect(() => {
    const checkAnalyticsView = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const { data, error } = await supabase
            .from('analytics_views')
            .select('id')
            .eq('user_id', user.user.id)
            .eq('visit_id', visit.id)
            .single();
          
          if (data && !error) {
            setHasViewedAnalytics(true);
          }
        }
      } catch (error) {
        console.log('Analytics view check error:', error);
      }
    };

    checkAnalyticsView();
  }, [visit.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "productive":
        return "bg-success text-success-foreground";
      case "in-progress":
        return "bg-warning text-warning-foreground";
      case "planned":
        return "bg-primary text-primary-foreground";
      case "unproductive":
        return "bg-destructive text-destructive-foreground";
      case "store-closed":
        return "bg-muted text-muted-foreground";
      case "cancelled":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "productive":
        return "Productive";
      case "in-progress":
        return "In Progress";
      case "planned":
        return "Planned";
      case "unproductive":
        return "Unproductive";
      case "store-closed":
        return "Store Closed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Not Started";
    }
  };

  const getCheckInButtonColor = (checkInStatus?: string) => {
    switch (checkInStatus) {
      case "checked-in-correct":
        return "bg-success text-success-foreground hover:bg-success/90";
      case "checked-in-wrong-location":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90";
      default:
        return "bg-muted text-muted-foreground hover:bg-muted/80";
    }
  };

  const getCheckInButtonText = (checkInStatus?: string, time?: string) => {
    const timeText = time ? ` (${time})` : "";
    switch (checkInStatus) {
      case "checked-in-correct":
        return `Checked In${timeText}`;
      case "checked-in-wrong-location":
        return `Wrong Location${timeText}`;
      default:
        return `Check-In${timeText}`;
    }
  };

  const handleNoOrderReasonSelect = (reason: string) => {
    setNoOrderReason(reason);
    toast({
      title: "No Order Recorded",
      description: `Reason: ${reason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
    });
  };

  const handleViewAnalytics = async (visitId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        // Record analytics view
        await supabase
          .from('analytics_views')
          .insert({
            user_id: user.user.id,
            visit_id: visitId
          });
        
        setHasViewedAnalytics(true);
      }
    } catch (error) {
      console.log('Analytics view recording error:', error);
    }
    
    onViewDetails(visitId);
  };

  return (
    <Card className="shadow-card hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/30 bg-gradient-to-r from-card to-card/50">
      <CardContent className="p-3 sm:p-4">
        {/* Header - Retailer info and status */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground text-sm sm:text-base truncate">{visit.retailerName}</h3>
            {visit.distributor && (
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                <Store size={12} className="sm:size-3.5 flex-shrink-0" />
                <span className="truncate">{visit.distributor}</span>
              </div>
            )}
          </div>
          <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1">
            <Badge className={`${getStatusColor(visit.status)} text-xs px-2 py-1`}>
              {getStatusText(visit.status)}
            </Badge>
            <div className="text-xs text-muted-foreground">{visit.retailerCategory}</div>
          </div>
        </div>

        {/* Contact info */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <MapPin size={12} className="sm:size-3.5 flex-shrink-0" />
              <span className="truncate">{visit.address}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Phone size={12} className="sm:size-3.5" />
              <span>{visit.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* Main action buttons */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <Button 
              size="sm" 
              className={`${getCheckInButtonColor(visit.checkInStatus)} p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm`}
              title={getCheckInButtonText(visit.checkInStatus, visit.time)}
            >
              <MapPin size={14} className="sm:size-4" />
            </Button>
            
            <Button 
              variant={visit.hasOrder ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm ${visit.hasOrder ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => navigate(`/order-entry?visitId=${visit.id}&retailer=${visit.retailerName}`)}
              title={`Order${visit.orderValue ? ` (₹${visit.orderValue.toLocaleString()})` : ""}`}
            >
              <ShoppingCart size={14} className="sm:size-4" />
            </Button>
            
            <Button 
              variant={noOrderReason ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm ${noOrderReason ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => setShowNoOrderModal(true)}
              title={`No-order${noOrderReason ? ` (${noOrderReason.replace(/-/g, ' ')})` : ""}`}
            >
              {noOrderReason ? <Check size={14} className="sm:size-4" /> : <XCircle size={14} className="sm:size-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm ${
                hasViewedAnalytics ? "bg-success text-success-foreground hover:bg-success/90" : ""
              }`}
              onClick={() => handleViewAnalytics(visit.id)}
              title="Analytics"
            >
              <BarChart3 size={14} className="sm:size-4" />
            </Button>
          </div>

          {/* Secondary action buttons */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm"
              onClick={() => setShowCompetitionModal(true)}
              title="Competition Insights"
            >
              <Users size={12} className="sm:size-3.5 mr-1" />
              <span className="hidden xs:inline">Competition</span>
              <span className="xs:hidden">Comp</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm"
              onClick={() => setShowFeedbackModal(true)}
              title="Retailer Feedback"
            >
              <MessageSquare size={12} className="sm:size-3.5 mr-1" />
              <span className="hidden xs:inline">Feedback</span>
              <span className="xs:hidden">Feed</span>
            </Button>
          </div>
        </div>

        {/* Modals */}
        <NoOrderModal
          isOpen={showNoOrderModal}
          onClose={() => setShowNoOrderModal(false)}
          onReasonSelect={handleNoOrderReasonSelect}
          currentReason={noOrderReason}
        />

        <CompetitionInsightModal
          isOpen={showCompetitionModal}
          onClose={() => setShowCompetitionModal(false)}
          visitId={visit.id}
          retailerId={visit.id} // Using visit.id as retailer ID for now
          retailerName={visit.retailerName}
        />

        <RetailerFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          visitId={visit.id}
          retailerId={visit.id} // Using visit.id as retailer ID for now
          retailerName={visit.retailerName}
        />
      </CardContent>
    </Card>
  );
};