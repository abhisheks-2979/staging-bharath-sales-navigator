import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Recommendation } from '@/hooks/useRecommendations';
import { RecommendationCard } from './RecommendationCard';

interface AIRecommendationBannerProps {
  recommendations: Recommendation[];
  onGenerate: () => void;
  onFeedback: (recId: string, feedbackType: 'like' | 'dislike' | 'implemented' | 'ignored') => void;
  loading?: boolean;
  type: 'retailer_priority' | 'discussion_points' | 'optimal_day';
  beatId?: string;
  retailerId?: string;
}

export function AIRecommendationBanner({
  recommendations,
  onGenerate,
  onFeedback,
  loading,
  type,
}: AIRecommendationBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTitle = () => {
    switch (type) {
      case 'retailer_priority':
        return 'Priority Retailers';
      case 'discussion_points':
        return 'Discussion Points';
      case 'optimal_day':
        return 'Best Visit Day';
      default:
        return 'AI Recommendations';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'retailer_priority':
        return 'AI-recommended retailers to visit based on potential and last visit';
      case 'discussion_points':
        return 'Personalized talking points for better retailer engagement';
      case 'optimal_day':
        return 'Best day of the week to visit this beat';
      default:
        return 'AI-powered insights';
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">{getTitle()}</h3>
                <p className="text-xs text-muted-foreground">{getDescription()}</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating...' : 'Get Insights'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">{getTitle()}</h3>
                <p className="text-xs text-muted-foreground">{getDescription()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="pt-2 space-y-3">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onFeedback={(feedbackType) => onFeedback(rec.id, feedbackType)}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
