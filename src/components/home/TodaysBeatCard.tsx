import { MapPin, Users, CheckCircle, Clock, ChevronLeft, ChevronRight, TrendingUp, UserPlus, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format, addDays, subDays } from "date-fns";

interface TodaysBeatCardProps {
  beatPlan: any | null;
  beatName: string | null;
  beatProgress: {
    total: number;
    completed: number;
    remaining: number;
  };
  revenueTarget: number;
  revenueAchieved: number;
  newRetailers: number;
  potentialRevenue: number;
  points: number;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const TodaysBeatCard = ({ 
  beatPlan, 
  beatName,
  beatProgress,
  revenueTarget,
  revenueAchieved,
  newRetailers,
  potentialRevenue,
  points,
  selectedDate,
  onDateChange
}: TodaysBeatCardProps) => {
  const navigate = useNavigate();

  const handlePrevDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isFuture = selectedDate > new Date();

  // Calculate revenue progress
  const revenueProgress = revenueTarget > 0 
    ? Math.min(Math.round((revenueAchieved / revenueTarget) * 100), 100)
    : 0;
  
  const revenueGap = Math.max(revenueTarget - revenueAchieved, 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  const displayBeatName = beatName || beatPlan?.beat_name || 'Not Planned';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        {/* Date Navigation Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handlePrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              {isToday ? "Today's Beat" : format(selectedDate, 'MMM dd, yyyy')}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleNextDay}
            disabled={isFuture}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Beat Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{displayBeatName}</h3>
            {!beatPlan && !beatName && (
              <p className="text-xs text-muted-foreground">No beat planned</p>
            )}
          </div>
        </div>

        {/* Revenue Target Line with Geo Pin */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Daily Revenue Target</span>
            <span className="font-medium text-foreground">{formatCurrency(revenueTarget)}</span>
          </div>
          
          <div className="relative h-6 flex items-center">
            {/* Background line */}
            <div className="absolute inset-0 flex">
              <div 
                className="h-1 bg-success rounded-l"
                style={{ width: `${revenueProgress}%` }}
              />
              <div 
                className="h-1 bg-muted flex-1 rounded-r"
              />
            </div>

            {/* Geo Pin Marker */}
            <div 
              className="absolute -translate-x-1/2 -translate-y-1"
              style={{ left: `${revenueProgress}%` }}
            >
              <div className="relative">
                <div className="w-8 h-10 bg-primary rounded-full rounded-br-none rotate-45 flex items-center justify-center shadow-lg">
                  <span className="text-[8px] font-bold text-primary-foreground -rotate-45">
                    {formatCurrency(revenueAchieved)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gap indicator on black side */}
            {revenueGap > 0 && revenueProgress < 100 && (
              <div 
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: `${Math.min(revenueProgress + 10, 70)}%` }}
              >
                {formatCurrency(revenueGap)} left
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3 w-3 text-primary" />
            </div>
            <p className="text-lg font-bold text-foreground">{beatProgress.completed}</p>
            <p className="text-[10px] text-muted-foreground">Visits Done</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-success" />
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(revenueAchieved)}</p>
            <p className="text-[10px] text-muted-foreground">Achieved</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-warning" />
            </div>
            <p className="text-lg font-bold text-foreground">{beatProgress.remaining}</p>
            <p className="text-[10px] text-muted-foreground">Remaining</p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserPlus className="h-3 w-3 text-blue-500" />
            </div>
            <p className="text-sm font-bold text-foreground">{newRetailers}</p>
            <p className="text-[10px] text-muted-foreground">New Added</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-purple-500" />
            </div>
            <p className="text-sm font-bold text-foreground">{formatCurrency(potentialRevenue)}</p>
            <p className="text-[10px] text-muted-foreground">Potential</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-3 w-3 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-foreground">{points}</p>
            <p className="text-[10px] text-muted-foreground">Points</p>
          </div>
        </div>

        {/* CTA Button */}
        {isToday && (
          <Button 
            onClick={() => navigate('/visits/retailers')}
            className="w-full"
            size="sm"
          >
            Continue Visits →
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
