import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, RefreshCw, Sparkles, Target, MapPin, Store, Gift, Calendar, Loader2, Quote, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePerformanceSummary, type PerformancePeriod } from '@/hooks/usePerformanceSummary';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PriorityAction {
  title: string;
  description: string;
  type: 'visit' | 'scheme' | 'focus' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  retailer?: string;
  beat?: string;
  expectedImpact?: string;
}

interface RetailerFocus {
  name: string;
  reason: string;
  suggestedAction: string;
}

interface BeatStrategy {
  beatName: string;
  recommendation: string;
}

interface SchemeOpportunity {
  schemeName: string;
  howToLeverage: string;
}

interface Recommendations {
  summary: string;
  priorityActions: PriorityAction[];
  retailerFocus: RetailerFocus[];
  beatStrategy: BeatStrategy[];
  schemeOpportunities: SchemeOpportunity[];
  weeklyPlan: {
    day1?: string;
    day2?: string;
    day3?: string;
  };
}

const priorityColors = {
  high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  low: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
};

const typeIcons = {
  visit: MapPin,
  scheme: Gift,
  focus: Target,
  strategy: TrendingUp,
};

const TargetAchievementAdvisor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const period = (searchParams.get('period') || 'this_month') as PerformancePeriod;
  
  const { overall, territories, beats, retailers, isLoading: dataLoading } = usePerformanceSummary(
    user?.id,
    period
  );

  const [quote, setQuote] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAdvice = async () => {
    if (!user?.id || dataLoading) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-target-advice', {
        body: {
          period,
          overall,
          territories,
          beats,
          retailers,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setQuote(data.quote);
      setRecommendations(data.recommendations);
    } catch (err) {
      console.error('Error generating advice:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate recommendations';
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!dataLoading && user?.id && !recommendations) {
      generateAdvice();
    }
  }, [dataLoading, user?.id]);

  const formatPeriodLabel = (p: string) => {
    const labels: Record<string, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      this_week: 'This Week',
      this_month: 'This Month',
      this_quarter: 'This Quarter',
      this_year: 'This FY',
    };
    return labels[p] || p;
  };

  return (
    <Layout>
      <div className="p-4 pb-24">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Target Achievement Advisor</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered recommendations for {formatPeriodLabel(period)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateAdvice}
              disabled={isGenerating || dataLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Motivational Quote */}
          {quote && (
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Quote className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm italic text-foreground">{quote}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {(isGenerating || dataLoading) && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">
                    {dataLoading ? 'Loading performance data...' : 'Analyzing your performance and generating recommendations...'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && !isGenerating && (
            <Card className="border-destructive/50">
              <CardContent className="py-8">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                  <p className="text-muted-foreground">{error}</p>
                  <Button onClick={generateAdvice} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {recommendations && !isGenerating && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Situation Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{recommendations.summary}</p>
                </CardContent>
              </Card>

              {/* Priority Actions */}
              {recommendations.priorityActions?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Priority Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.priorityActions.map((action, idx) => {
                      const Icon = typeIcons[action.type] || Target;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-3 rounded-lg border",
                            priorityColors[action.priority]
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{action.title}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-background/50 capitalize">
                                  {action.priority}
                                </span>
                              </div>
                              <p className="text-xs mt-1 opacity-90">{action.description}</p>
                              {action.expectedImpact && (
                                <p className="text-xs mt-1 font-medium">
                                  Impact: {action.expectedImpact}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Retailer Focus */}
              {recommendations.retailerFocus?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      Retailers to Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.retailerFocus.map((retailer, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                        <p className="font-medium text-sm">{retailer.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{retailer.reason}</p>
                        <p className="text-xs text-primary mt-1 font-medium">
                          → {retailer.suggestedAction}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Beat Strategy */}
              {recommendations.beatStrategy?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Beat Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.beatStrategy.map((beat, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                        <p className="font-medium text-sm">{beat.beatName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{beat.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Scheme Opportunities */}
              {recommendations.schemeOpportunities?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      Scheme Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendations.schemeOpportunities.map((scheme, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                        <p className="font-medium text-sm">{scheme.schemeName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{scheme.howToLeverage}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Weekly Plan */}
              {recommendations.weeklyPlan && Object.keys(recommendations.weeklyPlan).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Action Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recommendations.weeklyPlan.day1 && (
                        <div className="flex gap-3 items-start">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Day 1</span>
                          <p className="text-sm text-muted-foreground flex-1">{recommendations.weeklyPlan.day1}</p>
                        </div>
                      )}
                      {recommendations.weeklyPlan.day2 && (
                        <div className="flex gap-3 items-start">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Day 2</span>
                          <p className="text-sm text-muted-foreground flex-1">{recommendations.weeklyPlan.day2}</p>
                        </div>
                      )}
                      {recommendations.weeklyPlan.day3 && (
                        <div className="flex gap-3 items-start">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Day 3</span>
                          <p className="text-sm text-muted-foreground flex-1">{recommendations.weeklyPlan.day3}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TargetAchievementAdvisor;
