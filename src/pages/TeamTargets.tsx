import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTeamTargets } from "@/hooks/useTeamTargets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamMemberCard } from "@/components/targets/TeamMemberCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

type PeriodType = 'month' | 'quarter' | 'year';

export default function TeamTargets() {
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate] = useState(new Date());
  const navigate = useNavigate();
  
  const { teamMembers, isLoading } = useTeamTargets(periodType, selectedDate) as { teamMembers: any[], isLoading: boolean };

  const getRatingColor = (rating: string) => {
    const colors = {
      excellent: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      good: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      average: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      needs_improvement: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colors[rating as keyof typeof colors] || colors.needs_improvement;
  };

  const teamAverage = teamMembers?.length 
    ? teamMembers.reduce((sum, m) => sum + (m.weighted_average_score || 0), 0) / teamMembers.length
    : 0;

  const topPerformer = teamMembers?.reduce((top: any, current: any) => 
    (current.weighted_average_score || 0) > (top?.weighted_average_score || 0) ? current : top
  , teamMembers[0]);

  const needsAttention = teamMembers?.filter(m => (m.weighted_average_score || 0) < 60).length || 0;

  const getPeriodLabel = () => {
    if (periodType === 'month') return format(selectedDate, 'MMMM yyyy');
    if (periodType === 'quarter') return `Q${Math.floor(selectedDate.getMonth() / 3) + 1} ${selectedDate.getFullYear()}`;
    return selectedDate.getFullYear().toString();
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
              <Users className="h-8 w-8" />
              Team Performance
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor your team's progress against targets
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

        {/* Team Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold">{teamMembers?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Team Average</p>
                <p className="text-3xl font-bold text-chart-2">{teamAverage.toFixed(0)}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Top Performer
                </p>
                <p className="text-lg font-bold truncate">
                  {topPerformer?.user?.full_name || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Needs Attention
                </p>
                <p className="text-3xl font-bold text-destructive">{needsAttention}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Members ({getPeriodLabel()})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers?.map((member: any) => (
              <TeamMemberCard
                key={member.user_id}
                name={member.user?.full_name || 'Unknown User'}
                photoUrl={member.user?.profile_picture_url}
                overallScore={member.weighted_average_score || 0}
                rating={member.performance_rating || 'needs_improvement'}
                onViewDetails={() => {
                  console.log('View details for', member.user_id);
                }}
              />
            ))}
            {(!teamMembers || teamMembers.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No team members found or no performance data available for this period.
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Detailed Team Table */}
        {teamMembers && teamMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Team Performance</CardTitle>
              <CardDescription>Complete overview of all team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Overall Score</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>KPIs Achieved</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member: any) => (
                      <TableRow key={member.user_id}>
                        <TableCell className="font-medium">
                          {member.user?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg">
                            {(member.weighted_average_score || 0).toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={getRatingColor(member.performance_rating || 'needs_improvement')}
                          >
                            {(member.performance_rating || 'needs_improvement').replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {Object.keys(member.kpi_scores || {}).filter(k => 
                            (member.kpi_scores[k] || 0) >= 100
                          ).length} / {Object.keys(member.kpi_scores || {}).length}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(member.calculated_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
