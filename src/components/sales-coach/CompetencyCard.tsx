import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CompetencyCardProps {
  name: string;
  description?: string;
  icon: string;
  score: number;
  previousScore?: number;
  category: string;
  onClick?: () => void;
}

export const CompetencyCard = ({
  name,
  description,
  icon,
  score,
  previousScore,
  category,
  onClick
}: CompetencyCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTrend = () => {
    if (previousScore === undefined) return null;
    const diff = score - previousScore;
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-600', label: `+${diff}` };
    if (diff < 0) return { icon: TrendingDown, color: 'text-red-600', label: `${diff}` };
    return { icon: Minus, color: 'text-muted-foreground', label: '0' };
  };

  const trend = getTrend();

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
        "bg-gradient-to-br from-background to-muted/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              <div className="flex items-center gap-1">
                <span className={cn("font-bold text-lg", getScoreColor(score))}>
                  {score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {description || category}
            </p>
            
            <div className="mt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-500", getProgressColor(score))}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {trend && (
              <div className={cn("flex items-center gap-1 mt-1.5", trend.color)}>
                <trend.icon className="h-3 w-3" />
                <span className="text-xs">{trend.label} from last week</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
