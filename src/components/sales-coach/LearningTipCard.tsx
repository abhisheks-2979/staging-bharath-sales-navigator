import { Lightbulb, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface LearningTipCardProps {
  tip: {
    title: string;
    content: string;
    competency?: string;
  };
}

export const LearningTipCard = ({ tip }: LearningTipCardProps) => {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="bg-amber-100 p-1.5 rounded-full">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{tip.title}</h4>
          {tip.competency && (
            <Badge variant="secondary" className="text-xs mt-1">
              <BookOpen className="h-3 w-3 mr-1" />
              {tip.competency}
            </Badge>
          )}
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground leading-relaxed">
        {tip.content}
      </p>

      {/* Feedback Section */}
      {!feedback ? (
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Was this helpful?</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setFeedback('helpful')}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setFeedback('not_helpful')}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Thanks for your feedback! 👍
        </div>
      )}
    </div>
  );
};
