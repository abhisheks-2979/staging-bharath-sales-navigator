import { MapPin, Users, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TodaysBeatCardProps {
  beatPlan: any | null;
  beatProgress: {
    total: number;
    completed: number;
    remaining: number;
  };
}

export const TodaysBeatCard = ({ beatPlan, beatProgress }: TodaysBeatCardProps) => {
  const navigate = useNavigate();

  if (!beatPlan) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">No beat planned for today</p>
          <Button 
            onClick={() => navigate('/my-beats')}
            variant="outline"
            size="sm"
          >
            Plan Your Beat
          </Button>
        </CardContent>
      </Card>
    );
  }

  const progressPercent = beatProgress.total > 0 
    ? Math.round((beatProgress.completed / beatProgress.total) * 100) 
    : 0;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Today's Beat</p>
            <h3 className="font-semibold text-foreground truncate">{beatPlan.beat_name}</h3>
          </div>
        </div>

        <div className="space-y-2">
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">{beatProgress.total} Total</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-success" />
                <span className="text-success font-medium">{beatProgress.completed} Done</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-warning" />
                <span className="text-warning font-medium">{beatProgress.remaining} Left</span>
              </span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => navigate('/visits/retailers')}
          className="w-full"
          size="sm"
        >
          Continue Visits →
        </Button>
      </CardContent>
    </Card>
  );
};
