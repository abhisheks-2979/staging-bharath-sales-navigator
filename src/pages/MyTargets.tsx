import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useMyTargets } from "@/hooks/useMyTargets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PerformanceGauge } from "@/components/targets/PerformanceGauge";
import { KPICard } from "@/components/targets/KPICard";
import { PerformanceSummaryTable } from "@/components/targets/PerformanceSummaryTable";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Target as TargetIcon } from "lucide-react";
import { format, subMonths, subQuarters, subYears } from "date-fns";

type PeriodType = 'month' | 'quarter' | 'year';

export default function MyTargets() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { targets, performanceScore, isLoading } = useMyTargets(periodType, selectedDate);

  const getRatingColor = (rating: string) => {
    const colors = {
      excellent: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      good: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      average: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      needs_improvement: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colors[rating as keyof typeof colors] || colors.needs_improvement;
  };

  const getRatingLabel = (rating: string) => {
    return rating?.replace('_', ' ').toUpperCase() || 'N/A';
  };

  const getPeriodLabel = () => {
    if (periodType === 'month') return format(selectedDate, 'MMMM yyyy');
    if (periodType === 'quarter') return `Q${Math.floor(selectedDate.getMonth() / 3) + 1} ${selectedDate.getFullYear()}`;
    return selectedDate.getFullYear().toString();
  };

  const getHistoricalData = () => {
    // Generate mock historical data (in production, fetch from API)
    const periods = [];
    for (let i = 0; i < 6; i++) {
      let date: Date;
      if (periodType === 'month') date = subMonths(selectedDate, i);
      else if (periodType === 'quarter') date = subQuarters(selectedDate, i);
      else date = subYears(selectedDate, i);

      periods.push({
        period: periodType === 'month' 
          ? format(date, 'MMM yyyy')
          : periodType === 'quarter'
          ? `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
          : date.getFullYear().toString(),
        avgScore: 75 + Math.random() * 25,
        rating: Math.random() > 0.5 ? 'good' : 'average',
        kpiScores: {},
      });
    }
    return periods;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TargetIcon className="h-8 w-8" />
              My Performance Targets
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your progress against set targets
            </p>
          </div>

          <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="quarter">Quarterly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Overall Achievement</CardTitle>
              <CardDescription>{getPeriodLabel()}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <PerformanceGauge value={performanceScore?.weighted_average_score || 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Rating</CardTitle>
              <CardDescription>Current period evaluation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge 
                variant="outline" 
                className={`text-lg py-2 px-4 ${getRatingColor(performanceScore?.performance_rating || 'needs_improvement')}`}
              >
                {getRatingLabel(performanceScore?.performance_rating || 'needs_improvement')}
              </Badge>
              
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-chart-1" />
                  <span className="text-muted-foreground">
                    {targets?.filter(t => t.achievement_percent >= 100).length || 0} KPIs achieved
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Out of {targets?.length || 0} total KPIs
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">KPI Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targets?.map((target: any) => (
              <KPICard
                key={target.id}
                kpiName={target.kpi?.kpi_name || 'Unknown KPI'}
                target={target.target_value}
                actual={target.actual_value}
                unit={target.kpi?.unit || 'number'}
                achievement={target.achievement_percent}
              />
            ))}
            {(!targets || targets.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No targets set for this period. Please contact your admin.
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Historical Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance History</CardTitle>
            <CardDescription>Your performance over the last 6 periods</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceSummaryTable data={getHistoricalData()} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
