import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Edit2, BarChart, Trash2, MapPin, Package, TrendingUp, TrendingDown, Sparkles, CalendarDays, UserPlus } from 'lucide-react';
import { useBeatMetrics } from '@/hooks/useBeatMetrics';

interface BeatCardProps {
  beat: {
    id: string;
    beat_number: number;
    name: string;
    retailer_count: number;
    category?: string;
    created_at: string;
    territory_name?: string;
  };
  userId: string;
  onEdit: () => void;
  onDelete: () => void;
  onDetails: () => void;
  onAIInsights: () => void;
}

export function BeatCard({ beat, userId, onEdit, onDelete, onDetails, onAIInsights }: BeatCardProps) {
  const { metrics, loading } = useBeatMetrics(beat.id, userId);

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default" className="text-xs font-semibold">
                Beat #{beat.beat_number}
              </Badge>
              <Badge 
                className={`text-xs ${
                  beat.retailer_count >= 30 ? 'bg-yellow-100 text-yellow-800' : 
                  beat.retailer_count >= 20 ? 'bg-gray-100 text-gray-800' : 
                  beat.retailer_count >= 15 ? 'bg-orange-100 text-orange-800' : 
                  'bg-amber-100 text-amber-800'
                }`}
              >
                {beat.retailer_count >= 30 ? 'Platinum' : 
                 beat.retailer_count >= 20 ? 'Silver' : 
                 beat.retailer_count >= 15 ? 'Gold' : 'Bronze'}
              </Badge>
              {beat.category && (
                <Badge variant="outline" className="text-xs">
                  {beat.category}
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{beat.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Beat Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users size={14} className="text-primary mr-1" />
            </div>
            <div className="text-lg font-bold text-primary">{beat.retailer_count}</div>
            <div className="text-[10px] text-muted-foreground">Retailers</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Package size={14} className="text-green-600 mr-1" />
            </div>
            <div className="text-lg font-bold text-green-600">
              {loading ? '...' : metrics.ordersThisMonth}
            </div>
            <div className="text-[10px] text-muted-foreground">Orders (Month)</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {loading ? '...' : `₹${(metrics.avgBusiness / 1000).toFixed(1)}K`}
            </div>
            <div className="text-[10px] text-muted-foreground">Avg Business</div>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <div className={`text-lg font-bold flex items-center justify-center gap-1 ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {loading ? '...' : (
                <>
                  {metrics.revenueGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(metrics.revenueGrowth).toFixed(1)}%
                </>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">Growth</div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">Visits/Month:</span>
            </div>
            <span className="font-semibold">{loading ? '...' : metrics.visitsPerMonth}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserPlus className="h-3 w-3" />
              <span className="text-xs">New (3M):</span>
            </div>
            <span className="font-semibold">{loading ? '...' : metrics.retailersAdded3Months}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="text-xs">Last Visited:</span>
            </div>
            <span className="font-semibold text-xs">
              {loading ? '...' : metrics.lastVisited ? new Date(metrics.lastVisited).toLocaleDateString() : 'Never'}
            </span>
          </div>
          {metrics.isRecurring && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary/20">
              <CalendarDays className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">Recurring: {metrics.recurringDetails}</span>
            </div>
          )}
        </div>

        {/* Territory Info */}
        {beat.territory_name && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Territory:</span>
            <span className="text-sm font-medium">{beat.territory_name}</span>
          </div>
        )}

        {/* AI Insights Button */}
        <Button
          size="sm"
          variant="outline"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 hover:from-primary/10 hover:to-primary/20"
          onClick={onAIInsights}
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI Insights</span>
        </Button>

        {/* Beat Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 flex items-center justify-center gap-2"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 flex items-center justify-center gap-2"
            onClick={onDetails}
          >
            <BarChart className="h-4 w-4" />
            Details
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            className="flex items-center justify-center gap-2"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Creation Date */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Created: {new Date(beat.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
