import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, ShoppingCart, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TerritoryVisitDay {
  date: Date;
  visits: any[];
  totalRevenue: number;
  productiveCount: number;
  totalVisits: number;
}

interface TerritoryPerformanceCalendarProps {
  territoryId: string;
  retailerIds: string[];
}

const TerritoryPerformanceCalendar: React.FC<TerritoryPerformanceCalendarProps> = ({ territoryId, retailerIds }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Map<string, TerritoryVisitDay>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TerritoryVisitDay | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const fetchCalendarData = async () => {
    if (!retailerIds || retailerIds.length === 0) return;
    
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Fetch visits for retailers in this territory
      const { data: visitsData } = await supabase
        .from('visits')
        .select('*, retailers(name, address)')
        .in('retailer_id', retailerIds)
        .gte('planned_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('planned_date', format(monthEnd, 'yyyy-MM-dd'));

      // Fetch orders separately
      const visitIds = visitsData?.map(v => v.id) || [];
      let ordersData: any[] = [];
      if (visitIds.length > 0) {
        const { data } = await supabase
          .from('orders')
          .select('visit_id, total_amount')
          .in('visit_id', visitIds);
        ordersData = data || [];
      }

      // Create order map by visit_id
      const orderByVisitMap = new Map<string, number>();
      ordersData.forEach(order => {
        const existing = orderByVisitMap.get(order.visit_id) || 0;
        orderByVisitMap.set(order.visit_id, existing + Number(order.total_amount || 0));
      });

      const dataByDate = new Map<string, TerritoryVisitDay>();

      visitsData?.forEach(visit => {
        const dateKey = visit.planned_date;
        if (!dataByDate.has(dateKey)) {
          dataByDate.set(dateKey, {
            date: new Date(dateKey),
            visits: [],
            totalRevenue: 0,
            productiveCount: 0,
            totalVisits: 0,
          });
        }

        const dayData = dataByDate.get(dateKey)!;
        const visitRevenue = orderByVisitMap.get(visit.id) || 0;
        
        dayData.visits.push({ ...visit, orderAmount: visitRevenue });
        dayData.totalVisits++;
        
        if (visit.status === 'productive') {
          dayData.productiveCount++;
        }

        dayData.totalRevenue += visitRevenue;
      });

      setCalendarData(dataByDate);
    } catch (error) {
      console.error('Error fetching territory calendar data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, retailerIds]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleDayClick = (day: TerritoryVisitDay) => {
    setSelectedDay(day);
    setDayDetailOpen(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getColorClass = (dayData: TerritoryVisitDay | undefined) => {
    if (!dayData || dayData.totalVisits === 0) return 'bg-background';
    
    const productivity = (dayData.productiveCount / dayData.totalVisits) * 100;
    if (productivity >= 70) return 'bg-green-500/20 border-green-500/40';
    if (productivity >= 40) return 'bg-yellow-500/20 border-yellow-500/40';
    if (productivity > 0) return 'bg-orange-500/20 border-orange-500/40';
    return 'bg-muted';
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Territory Visit Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">Loading calendar...</span>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="min-w-[320px]">
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                  
                  {calendarDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayData = calendarData.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    const hasVisits = dayData && dayData.totalVisits > 0;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => hasVisits && dayData && handleDayClick(dayData)}
                        disabled={!isCurrentMonth || !hasVisits}
                        className={cn(
                          "min-h-[56px] sm:min-h-[72px] p-1 border rounded transition-all",
                          "disabled:opacity-40 disabled:cursor-not-allowed",
                          hasVisits && "hover:shadow cursor-pointer active:scale-95",
                          getColorClass(dayData),
                          isToday && "ring-1.5 ring-primary"
                        )}
                      >
                        <div className="text-left space-y-px">
                          <div className={cn(
                            "text-xs sm:text-sm font-bold leading-none",
                            isToday && "text-primary"
                          )}>
                            {format(day, 'd')}
                          </div>
                          
                          {isCurrentMonth && dayData && dayData.totalVisits > 0 && (
                            <div className="text-[9px] sm:text-[10px] space-y-0.5 leading-tight">
                              <div className="flex items-center gap-0.5 text-muted-foreground">
                                <span className="text-foreground font-medium">{dayData.totalVisits}</span> visits
                              </div>
                              <div className="text-green-600 font-semibold">
                                ✓{dayData.productiveCount}
                              </div>
                              {dayData.totalRevenue > 0 && (
                                <div className="text-primary font-bold">
                                  ₹{dayData.totalRevenue >= 1000 ? (dayData.totalRevenue / 1000).toFixed(1) + 'k' : dayData.totalRevenue}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/50"></div>
              <span className="text-muted-foreground">High (70%+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50"></div>
              <span className="text-muted-foreground">Medium (40-70%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50"></div>
              <span className="text-muted-foreground">Low (&lt;40%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dayDetailOpen} onOpenChange={setDayDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {selectedDay ? format(selectedDay.date, 'EEEE, MMMM d, yyyy') : 'Day Summary'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{selectedDay.totalVisits}</p>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-600">{selectedDay.productiveCount}</p>
                  <p className="text-xs text-muted-foreground">Productive</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-600">₹{selectedDay.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>

              {/* Visit List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Visit Details</h4>
                {selectedDay.visits.map((visit, idx) => (
                  <div 
                    key={visit.id || idx} 
                    className="p-3 border rounded-lg bg-background hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setDayDetailOpen(false);
                      navigate(`/visit/${visit.id}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-primary">{visit.retailers?.name || 'Unknown Retailer'}</p>
                        {visit.retailers?.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{visit.retailers.address}</span>
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs shrink-0",
                          visit.status === 'productive' && "bg-green-500/10 text-green-600 border-green-500/30",
                          visit.status === 'unproductive' && "bg-red-500/10 text-red-600 border-red-500/30",
                          visit.status === 'store_closed' && "bg-gray-500/10 text-gray-600 border-gray-500/30"
                        )}
                      >
                        {visit.status === 'productive' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {visit.status || 'Pending'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {visit.check_in_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(visit.check_in_time), 'hh:mm a')}
                        </span>
                      )}
                      {visit.orderAmount && visit.orderAmount > 0 && (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <DollarSign className="h-3 w-3" />
                          ₹{visit.orderAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TerritoryPerformanceCalendar;
