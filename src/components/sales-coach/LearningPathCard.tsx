import { Play, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface LearningPathCardProps {
  id: string;
  title: string;
  description?: string;
  contentType: 'video' | 'article' | 'case_study' | 'interactive';
  durationMinutes: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  pointsOnCompletion: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  competencyName?: string;
  onStart: () => void;
  onContinue: () => void;
}

export const LearningPathCard = ({
  title,
  description,
  contentType,
  durationMinutes,
  difficultyLevel,
  pointsOnCompletion,
  progress,
  status,
  competencyName,
  onStart,
  onContinue
}: LearningPathCardProps) => {
  const getContentTypeIcon = () => {
    switch (contentType) {
      case 'video': return '🎬';
      case 'article': return '📖';
      case 'case_study': return '📋';
      case 'interactive': return '🎮';
      default: return '📚';
    }
  };

  const getDifficultyColor = () => {
    switch (difficultyLevel) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      isCompleted && "bg-green-50/50 border-green-200"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl flex-shrink-0">{getContentTypeIcon()}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={cn(
                  "font-semibold text-sm",
                  isCompleted && "text-green-800"
                )}>
                  {isCompleted && <CheckCircle2 className="inline-block h-4 w-4 mr-1 text-green-600" />}
                  {title}
                </h3>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
              
              <Badge className={cn("flex-shrink-0 text-xs", getDifficultyColor())}>
                {difficultyLevel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {durationMinutes}m
              </span>
              {competencyName && (
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {competencyName}
                </span>
              )}
              <span className="text-amber-600 font-medium">
                +{pointsOnCompletion} pts
              </span>
            </div>

            {isInProgress && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            <div className="mt-3">
              {isCompleted ? (
                <Button variant="outline" size="sm" className="w-full" disabled>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Completed
                </Button>
              ) : isInProgress ? (
                <Button size="sm" className="w-full" onClick={onContinue}>
                  <Play className="h-4 w-4 mr-1" />
                  Continue
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={onStart}>
                  <Play className="h-4 w-4 mr-1" />
                  Start Learning
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
