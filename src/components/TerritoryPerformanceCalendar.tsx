import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, ShoppingCart, DollarSign, Clock, CheckCircle, Store } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TerritoryOrderDay {
  date: Date;
  orders: any[];
  totalRevenue: number;
  orderCount: number;
}

interface TerritoryPerformanceCalendarProps {
  territoryId: string;
  retailerIds: string[];
}

const TerritoryPerformanceCalendar: React.FC<TerritoryPerformanceCalendarProps> = ({ territoryId, retailerIds }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Map<string, TerritoryOrderDay>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<TerritoryOrderDay | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const fetchCalendarData = async () => {
    if (!retailerIds || retailerIds.length === 0) return;
    
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      // Fetch orders for retailers in this territory based on created_at (order date)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, total_amount, retailer_id, created_at, status, retailers(name, address)')
        .in('retailer_id', retailerIds)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: false });

      const dataByDate = new Map<string, TerritoryOrderDay>();

      ordersData?.forEach(order => {
        const orderDate = new Date(order.created_at);
        const dateKey = format(orderDate, 'yyyy-MM-dd');
        
        if (!dataByDate.has(dateKey)) {
          dataByDate.set(dateKey, {
            date: orderDate,
            orders: [],
            totalRevenue: 0,
            orderCount: 0,
          });
        }

        const dayData = dataByDate.get(dateKey)!;
        dayData.orders.push(order);
        dayData.orderCount++;
        dayData.totalRevenue += Number(order.total_amount || 0);
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

  const handleDayClick = (day: TerritoryOrderDay) => {
    setSelectedDay(day);
    setDayDetailOpen(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getColorClass = (dayData: TerritoryOrderDay | undefined) => {
    if (!dayData || dayData.orderCount === 0) return 'bg-background';
    
    // Color based on revenue
    if (dayData.totalRevenue >= 5000) return 'bg-green-500/20 border-green-500/40';
    if (dayData.totalRevenue >= 1000) return 'bg-green-500/10 border-green-500/30';
    return 'bg-muted';
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Territory Orders Calendar
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
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                    <div key={i} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground py-1">
                      {day}
                    </div>
                  ))}
                  
                  {calendarDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayData = calendarData.get(dateKey);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    const hasOrders = dayData && dayData.orderCount > 0;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => hasOrders && dayData && handleDayClick(dayData)}
                        disabled={!isCurrentMonth || !hasOrders}
                        className={cn(
                          "min-h-[56px] sm:min-h-[72px] p-1 border rounded transition-all",
                          "disabled:opacity-40 disabled:cursor-not-allowed",
                          hasOrders && "hover:shadow cursor-pointer active:scale-95",
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
                          
                          {isCurrentMonth && dayData && dayData.orderCount > 0 && (
                            <div className="text-[9px] sm:text-[10px] space-y-0.5 leading-tight">
                              {dayData.totalRevenue > 0 && (
                                <div className="text-green-600 font-semibold">
                                  P ₹{dayData.totalRevenue >= 1000 ? (dayData.totalRevenue / 1000).toFixed(1) + 'k' : dayData.totalRevenue.toFixed(0)}
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
              <span className="text-muted-foreground">₹5k+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500/15 border border-green-500/30"></div>
              <span className="text-muted-foreground">₹1k-5k</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted border"></div>
              <span className="text-muted-foreground">&lt;₹1k</span>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{selectedDay.orderCount}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-green-600">₹{selectedDay.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>

              {/* Order List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Order Details</h4>
                {selectedDay.orders.map((order, idx) => (
                  <div 
                    key={order.id || idx} 
                    className="p-3 border rounded-lg bg-background hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setDayDetailOpen(false);
                      navigate(`/retailer/${order.retailer_id}`);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-primary flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {order.retailers?.name || 'Unknown Retailer'}
                        </p>
                        {order.retailers?.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{order.retailers.address}</span>
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs shrink-0",
                          order.status === 'confirmed' && "bg-green-500/10 text-green-600 border-green-500/30",
                          order.status === 'pending' && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                        )}
                      >
                        {order.status || 'confirmed'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(order.created_at), 'hh:mm a')}
                      </span>
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="h-3 w-3" />
                        ₹{Number(order.total_amount || 0).toLocaleString()}
                      </span>
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