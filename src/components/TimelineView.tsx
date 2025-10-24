import React from 'react';
import { Clock, MapPin, ShoppingCart, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Visit {
  id: string;
  retailer_name: string;
  check_in_time: string;
  check_out_time?: string;
  check_in_address?: string;
  status: string;
  order_value?: number;
  order_quantity?: number;
}

interface TimelineViewProps {
  visits: Visit[];
  dayStart?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ visits, dayStart = '08:10 AM' }) => {
  const calculateTimeDifference = (time1: string, time2?: string): string => {
    if (!time2) return '0 Min';
    
    const date1 = new Date(time1);
    const date2 = new Date(time2);
    const diffMs = Math.abs(date2.getTime() - date1.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} Min`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-500">In Progress</Badge>;
      case 'skipped':
        return <Badge className="bg-gray-500">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">TIMELINE</h2>
        <div className="h-1 w-24 bg-primary mx-auto"></div>
      </div>

      {/* Day Start */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-green-500 border-4 border-green-200"></div>
          <div className="w-0.5 h-16 bg-gradient-to-b from-green-500 to-primary"></div>
        </div>
        <div className="flex-1 -mt-1">
          <div className="font-semibold text-lg">DAY START</div>
          <div className="text-muted-foreground">{dayStart}</div>
        </div>
      </div>

      {/* Timeline Items */}
      {visits.map((visit, index) => {
        const travelTime = index > 0 
          ? calculateTimeDifference(visits[index - 1].check_out_time || visits[index - 1].check_in_time, visit.check_in_time)
          : '0 Min';
        
        return (
          <div key={visit.id} className="relative">
            {/* Travel Time Indicator */}
            {index > 0 && (
              <div className="absolute right-4 top-0 text-sm text-muted-foreground">
                {travelTime}
              </div>
            )}

            {/* Visit Card */}
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-primary border-4 border-primary/20"></div>
                {index < visits.length - 1 && (
                  <div className="w-0.5 h-32 bg-gradient-to-b from-primary to-primary/30"></div>
                )}
              </div>

              <Card className="flex-1 p-4 bg-card hover:shadow-md transition-shadow">
                {/* Visit Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10">OUTLET</Badge>
                    {visit.order_value && visit.order_value > 0 && (
                      <Badge className="bg-green-500">ORDER PLACED</Badge>
                    )}
                    {getStatusBadge(visit.status)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(new Date(visit.check_in_time), 'hh:mm a')}
                  </div>
                </div>

                {/* Retailer Name */}
                <h3 className="text-lg font-semibold mb-2">{visit.retailer_name}</h3>

                {/* Location */}
                {visit.check_in_address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{visit.check_in_address}</span>
                  </div>
                )}

                {/* Order Details */}
                {visit.order_value && visit.order_value > 0 && (
                  <Card className="p-3 bg-muted/50 border-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4 text-primary" />
                          <div>
                            <div className="text-2xl font-bold">
                              {visit.order_value.toLocaleString('en-IN', {
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">Rs.</div>
                          </div>
                        </div>
                      </div>

                      {visit.order_quantity && (
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-primary" />
                          <div>
                            <div className="text-2xl font-bold">{visit.order_quantity}</div>
                            <div className="text-xs text-muted-foreground">QTY</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </Card>
            </div>
          </div>
        );
      })}

      {/* Day End (if last visit has check out) */}
      {visits.length > 0 && visits[visits.length - 1].check_out_time && (
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 border-4 border-red-200"></div>
          </div>
          <div className="flex-1 -mt-1">
            <div className="font-semibold text-lg">DAY END</div>
            <div className="text-muted-foreground">
              {format(new Date(visits[visits.length - 1].check_out_time!), 'hh:mm a')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
