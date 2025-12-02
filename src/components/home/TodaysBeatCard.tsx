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
    planned: number;
    productive: number;
    unproductive: number;
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
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)}K`;
    return formatCurrency(amount);
  };

  const formatCurrencyNoDecimal = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const displayBeatName = beatName || beatPlan?.beat_name || 'Not Planned';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 shadow-lg overflow-hidden">
      <CardContent className="p-5 space-y-5">
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

        {/* Revenue Target Progress */}
        <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Revenue Today</p>
              <p className="text-sm font-bold text-foreground">{formatCurrency(revenueAchieved)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Progress</p>
              <p className="text-sm font-bold text-success">{revenueProgress}%</p>
            </div>
          </div>
          
          <div className="relative h-12 flex items-center">
            {/* Track */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-success to-success/80 rounded-full transition-all duration-500"
                  style={{ width: `${revenueProgress}%` }}
                />
              </div>
            </div>

            {/* Pin Marker - positioned above the line */}
            <div 
              className="absolute -translate-x-1/2 z-10 transition-all duration-500"
              style={{ left: `${Math.max(revenueProgress, 5)}%`, top: '-18px' }}
            >
              <div className="flex flex-col items-center">
                <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-lg shadow-lg text-[10px] font-bold whitespace-nowrap border-2 border-background">
                  {formatCurrency(revenueAchieved)}
                </div>
                <MapPin className="h-5 w-5 text-primary drop-shadow-lg fill-primary -mt-0.5" />
              </div>
            </div>
          </div>

          {/* Gap indicator - highlighted below the line, outside the relative container */}
          {revenueGap > 0 && (
            <div className="flex justify-end mt-2">
              <div className="text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-md border border-primary/20">
                {formatCurrencyNoDecimal(revenueGap)} to go
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-center gap-1 mb-1.5">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xl font-bold text-foreground">{beatProgress.planned}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Planned</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-success/5 border border-success/10">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
            <p className="text-xl font-bold text-foreground">{beatProgress.productive}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Productive</p>
          </div>

          <div className="text-center p-3 rounded-lg bg-warning/5 border border-warning/10">
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <Clock className="h-4 w-4 text-warning" />
            </div>
            <p className="text-xl font-bold text-foreground">{beatProgress.remaining}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Remaining</p>
          </div>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserPlus className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-base font-bold text-foreground">{newRetailers}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">New Added</p>
          </div>

          <div className="text-center p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <p className="text-base font-bold text-foreground">{formatCurrencyShort(potentialRevenue)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Potential</p>
          </div>

          <div className="text-center p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-base font-bold text-foreground">{points}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Points</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button 
            onClick={() => navigate(`/visits/retailers?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            My Visits
          </Button>
          <Button 
            onClick={() => navigate(`/today-summary?date=${format(selectedDate, 'yyyy-MM-dd')}`)}
            variant="default"
            size="sm"
            className="w-full"
          >
            Today's Summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
