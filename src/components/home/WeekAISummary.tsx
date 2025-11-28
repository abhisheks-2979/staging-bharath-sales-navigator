import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface WeekAISummaryProps {
  userId: string;
  weekType: 'current' | 'next';
}

export const WeekAISummary = ({ userId, weekType }: WeekAISummaryProps) => {
  const [aiSummary, setAiSummary] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const getWeekRange = () => {
    const baseDate = weekType === 'current' ? new Date() : addWeeks(new Date(), 1);
    return {
      start: startOfWeek(baseDate, { weekStartsOn: 1 }),
      end: endOfWeek(baseDate, { weekStartsOn: 1 })
    };
  };

  const generateAISummary = async () => {
    try {
      setGenerating(true);
      const { start, end } = getWeekRange();
      
      // Fetch beat plans for the week
      const { data: beatPlans, error: beatError } = await supabase
        .from('beat_plans')
        .select('beat_name, plan_date')
        .eq('user_id', userId)
        .gte('plan_date', format(start, 'yyyy-MM-dd'))
        .lte('plan_date', format(end, 'yyyy-MM-dd'));

      if (beatError) {
        console.error('Beat plans fetch error:', beatError);
        throw beatError;
      }

      if (weekType === 'current') {
        // Fetch performance data for current week
        const { data: visits, error: visitsError } = await supabase
          .from('visits')
          .select('status')
          .eq('user_id', userId)
          .gte('created_at', format(start, 'yyyy-MM-dd'))
          .lte('created_at', format(end, 'yyyy-MM-dd'));

        if (visitsError) {
          console.error('Visits fetch error:', visitsError);
          throw visitsError;
        }

        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('user_id', userId)
          .gte('created_at', format(start, 'yyyy-MM-dd'))
          .lte('created_at', format(end, 'yyyy-MM-dd'));

        if (ordersError) {
          console.error('Orders fetch error:', ordersError);
          throw ordersError;
        }

        const totalRevenue = orders?.reduce((sum, o: any) => {
          return sum + (o.total_amount || 0);
        }, 0) || 0;

        const productiveVisits = visits?.filter(v => v.status === 'productive').length || 0;

        const summary = `This week you've planned ${beatPlans?.length || 0} beats. 
Performance: ${productiveVisits} productive visits generating ₹${totalRevenue.toLocaleString('en-IN')} in revenue.
${beatPlans?.length ? `Key beats: ${beatPlans.slice(0, 3).map(b => b.beat_name).join(', ')}` : ''}`;

        setAiSummary(summary);
      } else {
        // Next week prediction
        const beatNames = beatPlans?.map(b => b.beat_name) || [];
        const uniqueBeats = [...new Set(beatNames)];

        // Fetch historical performance for these beats
        const { data: historicalOrders, error: histError } = await supabase
          .from('orders')
          .select('total_amount, visit_id')
          .eq('user_id', userId)
          .gte('created_at', format(addWeeks(start, -4), 'yyyy-MM-dd'))
          .limit(100);

        if (histError) {
          console.error('Historical orders fetch error:', histError);
          throw histError;
        }

        const avgRevenue = historicalOrders?.reduce((sum: number, o: any) => {
          return sum + (o.total_amount || 0);
        }, 0) / (historicalOrders?.length || 1);

        const summary = `Next week: ${beatPlans?.length || 0} beats planned across ${uniqueBeats.length} territories.
Based on past performance, estimated potential: ₹${(avgRevenue * (beatPlans?.length || 0)).toLocaleString('en-IN')}.
Focus beats: ${uniqueBeats.slice(0, 3).join(', ')}`;

        setAiSummary(summary);
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error('Failed to generate AI summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const { start, end } = getWeekRange();
  const title = weekType === 'current' ? 'Current Week Summary' : 'Next Week Outlook';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {format(start, 'MMM dd')} - {format(end, 'MMM dd, yyyy')}
        </p>

        {aiSummary ? (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-foreground whitespace-pre-line">{aiSummary}</p>
          </div>
        ) : (
          <Button 
            onClick={generateAISummary}
            disabled={generating}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate AI Summary'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
