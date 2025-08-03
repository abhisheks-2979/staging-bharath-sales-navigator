import { MapPin, Phone, Store, ShoppingCart, XCircle, BarChart3, Check, Users, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { CompetitionInsightModal } from "./CompetitionInsightModal";
import { RetailerFeedbackModal } from "./RetailerFeedbackModal";

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
  const [showNoOrderDropdown, setShowNoOrderDropdown] = useState(false);
  const [noOrderReason, setNoOrderReason] = useState<string>(visit.noOrderReason || "");
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
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
    setShowNoOrderDropdown(false);
    toast({
      title: "No Order Recorded",
      description: `Reason: ${reason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
    });
  };

  return (
    <Card className="shadow-card hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/30 bg-gradient-to-r from-card to-card/50">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground">{visit.retailerName}</h3>
            {visit.distributor && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Store size={14} />
                <span>{visit.distributor}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(visit.status)}>
              {getStatusText(visit.status)}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">{visit.retailerCategory}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1 flex-1">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="truncate">{visit.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone size={14} />
              <span>{visit.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* Main action buttons */}
          <div className="grid grid-cols-4 gap-2">
            <Button 
              size="sm" 
              className={`${getCheckInButtonColor(visit.checkInStatus)} p-2 h-10`}
              title={getCheckInButtonText(visit.checkInStatus, visit.time)}
            >
              <MapPin size={16} />
            </Button>
            
            <Button 
              variant={visit.hasOrder ? "default" : "outline"}
              size="sm"
              className={`p-2 h-10 ${visit.hasOrder ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => navigate(`/order-entry?visitId=${visit.id}&retailer=${visit.retailerName}`)}
              title={`Order${visit.orderValue ? ` (₹${visit.orderValue.toLocaleString()})` : ""}`}
            >
              <ShoppingCart size={16} />
            </Button>
            
            <Button 
              variant={noOrderReason ? "default" : "outline"}
              size="sm"
              className={`p-2 h-10 ${noOrderReason ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => setShowNoOrderDropdown(!showNoOrderDropdown)}
              title={`No-order${noOrderReason ? ` (${noOrderReason.replace(/-/g, ' ')})` : ""}`}
            >
              {noOrderReason ? <Check size={16} /> : <XCircle size={16} />}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-2 h-10"
              onClick={() => onViewDetails(visit.id)}
              title="Analytics"
            >
              <BarChart3 size={16} />
            </Button>
          </div>

          {/* Secondary action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="p-2 h-10"
              onClick={() => setShowCompetitionModal(true)}
              title="Competition Insights"
            >
              <Users size={16} className="mr-1" />
              <span className="text-xs">Competition</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-2 h-10"
              onClick={() => setShowFeedbackModal(true)}
              title="Retailer Feedback"
            >
              <MessageSquare size={16} className="mr-1" />
              <span className="text-xs">Feedback</span>
            </Button>
          </div>

          {showNoOrderDropdown && (
            <div className="mt-2">
              <Select value={noOrderReason} onValueChange={handleNoOrderReasonSelect}>
                <SelectTrigger className="h-8 bg-background">
                  <SelectValue placeholder="Select reason for no order" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="over-stocked">Over stocked</SelectItem>
                  <SelectItem value="owner-not-available">The owner not available</SelectItem>
                  <SelectItem value="store-closed">Store closed</SelectItem>
                  <SelectItem value="permanently-closed">Permanently closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Modals */}
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