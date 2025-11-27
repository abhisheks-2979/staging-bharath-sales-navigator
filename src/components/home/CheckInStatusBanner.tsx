import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface CheckInStatusBannerProps {
  attendance: any | null;
}

export const CheckInStatusBanner = ({ attendance }: CheckInStatusBannerProps) => {
  const navigate = useNavigate();
  const isCheckedIn = attendance?.check_in_time;

  if (isCheckedIn) {
    return (
      <Card className="bg-gradient-to-r from-success/10 to-success/5 border-success/20">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-success">Checked In</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(attendance.check_in_time), 'h:mm a')}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-warning/20 to-warning/10 border-warning/30">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-warning/30 flex items-center justify-center">
            <Clock className="h-5 w-5 text-warning-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-warning-foreground">Not Checked In</p>
            <p className="text-xs text-muted-foreground">Start your day by marking attendance</p>
          </div>
        </div>
        <Button 
          onClick={() => navigate('/attendance')}
          className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
        >
          Check In Now
        </Button>
      </div>
    </Card>
  );
};
