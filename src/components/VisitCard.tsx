import { Clock, MapPin, Phone, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Visit {
  id: string;
  retailerName: string;
  address: string;
  phone: string;
  accountType: string;
  status: "planned" | "in-progress" | "completed" | "not-started";
  visitType: string;
  time?: string;
}

interface VisitCardProps {
  visit: Visit;
  onViewDetails: (visitId: string) => void;
}

export const VisitCard = ({ visit, onViewDetails }: VisitCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in-progress":
        return "bg-warning text-warning-foreground";
      case "planned":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in-progress":
        return "In Progress";
      case "planned":
        return "Planned";
      default:
        return "Not Started";
    }
  };

  return (
    <Card className="shadow-card hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-card-foreground">{visit.retailerName}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Store size={14} />
              <span>{visit.accountType}</span>
            </div>
          </div>
          <Badge className={getStatusColor(visit.status)}>
            {getStatusText(visit.status)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin size={14} className="mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{visit.address}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone size={14} />
            <span>{visit.phone}</span>
          </div>

          {visit.time && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={14} />
              <span>{visit.time}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails(visit.id)}
          >
            View Details
          </Button>
          {visit.status === "planned" && (
            <Button size="sm" className="flex-1">
              Check-In
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};