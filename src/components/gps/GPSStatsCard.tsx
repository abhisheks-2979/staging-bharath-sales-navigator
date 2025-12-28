import React from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, CheckCircle, XCircle, Route, Calendar } from 'lucide-react';

interface GPSStatsCardProps {
  beatName: string | null;
  plannedVisits: number;
  productiveVisits: number;
  unproductiveVisits: number;
  totalKmTraveled: number;
  pendingVisits: number;
}

export const GPSStatsCard: React.FC<GPSStatsCardProps> = ({
  beatName,
  plannedVisits,
  productiveVisits,
  unproductiveVisits,
  totalKmTraveled,
  pendingVisits,
}) => {
  return (
    <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        {/* Beat Name Header */}
        {beatName && (
          <div className="flex items-center gap-2 pb-3 border-b border-border/50">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Today's Beat</p>
              <p className="font-semibold text-lg text-foreground">{beatName}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Planned */}
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{plannedVisits}</p>
            <p className="text-xs text-muted-foreground">Planned</p>
          </div>

          {/* Productive */}
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{productiveVisits}</p>
            <p className="text-xs text-muted-foreground">Productive</p>
          </div>

          {/* Unproductive */}
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{unproductiveVisits}</p>
            <p className="text-xs text-muted-foreground">Unproductive</p>
          </div>

          {/* Pending */}
          <div className="bg-background/80 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin className="h-4 w-4 text-gray-500" />
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{pendingVisits}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>

          {/* KM Traveled */}
          <div className="bg-background/80 rounded-lg p-3 text-center col-span-2 md:col-span-1">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Route className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{totalKmTraveled.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">KM Traveled</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
