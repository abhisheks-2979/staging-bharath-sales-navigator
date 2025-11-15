import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CompetitionAISummaryProps {
  competitorId: string;
  competitorName: string;
  competitionData: any[];
}

export function CompetitionAISummary({ competitorId, competitorName, competitionData }: CompetitionAISummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (competitionData.length > 0) {
      generateSummary();
    }
  }, [competitionData, competitorId]);

  const generateSummary = async () => {
    setLoading(true);
    try {
      // Prepare data for AI analysis
      const dataForAnalysis = competitionData.map(d => ({
        sku: d.sku_name,
        retailer: d.retailers?.name,
        date: d.visits?.planned_date || d.created_at,
        stockQty: d.stock_quantity,
        unit: d.unit,
        insight: d.insight,
        impactLevel: d.impact_level,
        needsAttention: d.needs_attention
      }));

      // Group by month
      const monthlyData = groupByMonth(dataForAnalysis);

      const prompt = `Analyze the following competition data for ${competitorName}:

Total data points: ${competitionData.length}
High impact observations: ${competitionData.filter(d => d.impact_level === 'high').length}
Items needing attention: ${competitionData.filter(d => d.needs_attention).length}

Monthly breakdown:
${Object.entries(monthlyData).map(([month, data]: [string, any]) => 
  `${month}: ${data.length} observations, ${data.filter((d: any) => d.needsAttention).length} needing attention`
).join('\n')}

Provide a comprehensive competition intelligence summary covering:
1. Overall competitive threat assessment
2. Key trends and patterns observed
3. Most concerning findings (high impact items)
4. Product-wise insights
5. Geographic patterns if multiple retailers
6. Actionable recommendations

Keep it concise and business-focused.`;

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          messages: [{ role: 'user', content: prompt }]
        }
      });

      if (error) throw error;

      setSummary(data.response || "Summary generation failed");
      setMonthlySummaries(Object.entries(monthlyData).map(([month, items]: [string, any]) => ({
        month,
        count: items.length,
        highImpact: items.filter((d: any) => d.impactLevel === 'high').length,
        needsAttention: items.filter((d: any) => d.needsAttention).length,
        topSKUs: getTopSKUs(items)
      })));

    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI summary",
        variant: "destructive"
      });
      
      // Fallback to basic summary
      generateBasicSummary();
    } finally {
      setLoading(false);
    }
  };

  const groupByMonth = (data: any[]) => {
    return data.reduce((acc, item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const getTopSKUs = (data: any[]) => {
    const skuCounts = data.reduce((acc, item) => {
      acc[item.sku] = (acc[item.sku] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(skuCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([sku]) => sku);
  };

  const generateBasicSummary = () => {
    const total = competitionData.length;
    const highImpact = competitionData.filter(d => d.impact_level === 'high').length;
    const needsAttention = competitionData.filter(d => d.needs_attention).length;

    setSummary(`Competition Intelligence Summary for ${competitorName}:

📊 Data Overview:
• Total observations: ${total}
• High impact items: ${highImpact} (${((highImpact/total)*100).toFixed(1)}%)
• Items needing attention: ${needsAttention}

⚠️ Key Findings:
${highImpact > 0 ? `• ${highImpact} high-impact competitive activities detected that require immediate attention.` : '• No high-impact activities detected.'}
${needsAttention > 0 ? `• ${needsAttention} situations flagged for management review.` : ''}
• High impact rate: ${total > 0 ? ((Number(highImpact)/Number(total))*100).toFixed(1) : '0'}%

📈 Recommendations:
• Monitor high-impact items closely for market share implications
• Review attention-flagged items for potential strategic response
• Continue systematic data collection for trend analysis`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Competition Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {summary || "No data available for analysis"}
          </div>
          <Button 
            onClick={generateSummary} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate Summary
          </Button>
        </CardContent>
      </Card>

      {/* Monthly Summaries */}
      {monthlySummaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlySummaries.map((monthly) => (
                <div key={monthly.month} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">
                      {new Date(monthly.month + '-01').toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </h4>
                    <div className="flex gap-2">
                      <Badge variant="outline">{monthly.count} observations</Badge>
                      {monthly.highImpact > 0 && (
                        <Badge variant="destructive">{monthly.highImpact} high impact</Badge>
                      )}
                      {monthly.needsAttention > 0 && (
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {monthly.needsAttention}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {monthly.topSKUs.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Top SKUs: {monthly.topSKUs.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Observations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitionData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {competitionData.filter(d => d.impact_level === 'high').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {competitionData.filter(d => d.needs_attention).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
