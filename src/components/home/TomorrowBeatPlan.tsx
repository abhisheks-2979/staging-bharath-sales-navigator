import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { MapPin, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

interface TomorrowBeatPlanProps {
  userId: string;
}

export const TomorrowBeatPlan = ({ userId }: TomorrowBeatPlanProps) => {
  const [beatPlan, setBeatPlan] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const tomorrow = addDays(new Date(), 1);
  const tomorrowDate = format(tomorrow, 'yyyy-MM-dd');

  useEffect(() => {
    fetchTomorrowBeatPlan();
  }, [userId]);

  const fetchTomorrowBeatPlan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_date', tomorrowDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setBeatPlan(data);
    } catch (error) {
      console.error('Error fetching tomorrow beat plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    if (!beatPlan) return;

    try {
      setGeneratingAI(true);
      
      // Fetch retailers in the beat
      const { data: retailers, error } = await supabase
        .from('retailers')
        .select('name, category, last_order_date')
        .eq('beat_id', beatPlan.beat_id)
        .limit(10);

      if (error) throw error;

      const summary = `Tomorrow you'll be visiting ${beatPlan.beat_name} with ${retailers?.length || 0} retailers planned. 
Focus on: ${retailers?.slice(0, 3).map(r => r.name).join(', ')}. 
Get ready for a productive day!`;

      setAiSummary(summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast.error('Failed to generate AI summary');
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tomorrow's Beat Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!beatPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Tomorrow's Beat Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No beat planned for tomorrow</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Tomorrow's Beat Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">{format(tomorrow, 'EEEE, MMM dd, yyyy')}</p>
          <p className="font-semibold text-lg">{beatPlan.beat_name}</p>
        </div>

        {aiSummary ? (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-foreground">{aiSummary}</p>
          </div>
        ) : (
          <Button 
            onClick={generateAISummary}
            disabled={generatingAI}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generatingAI ? 'Generating...' : 'Generate AI Summary'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
