import { CheckCircle2, Clock, LogOut, Briefcase, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { format, differenceInMinutes } from "date-fns";

interface CheckInStatusBannerProps {
  attendance: any | null;
}

export const CheckInStatusBanner = ({ attendance }: CheckInStatusBannerProps) => {
  const navigate = useNavigate();
  const isCheckedIn = attendance?.check_in_time;
  const isCheckedOut = attendance?.check_out_time;
  const isOnLeave = attendance?.on_leave;

  // Calculate market hours if checked in
  const marketHours = isCheckedIn && attendance.check_in_time ? (() => {
    const checkInTime = new Date(attendance.check_in_time);
    const endTime = isCheckedOut ? new Date(attendance.check_out_time) : new Date();
    const minutes = differenceInMinutes(endTime, checkInTime);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  })() : null;

  if (isOnLeave) {
    return (
      <Card className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-500">On Leave</p>
            <p className="text-xs text-muted-foreground">
              Approved Leave
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (isCheckedIn) {
    return (
      <Card className="bg-gradient-to-r from-success/10 to-success/5 border-success/20">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
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
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground ml-13">
            {isCheckedOut && (
              <div className="flex items-center gap-1">
                <LogOut className="h-3 w-3" />
                <span>Out: {format(new Date(attendance.check_out_time), 'h:mm a')}</span>
              </div>
            )}
            {marketHours && (
              <div className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                <span>Market: {marketHours}</span>
              </div>
            )}
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
