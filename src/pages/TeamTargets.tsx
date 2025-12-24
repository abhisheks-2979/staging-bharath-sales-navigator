import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useTeamTargets } from "@/hooks/useTeamTargets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamMemberCard } from "@/components/targets/TeamMemberCard";
import { PerformanceComments } from "@/components/targets/PerformanceComments";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, TrendingUp, AlertCircle } from "lucide-react";
import { format, startOfQuarter, endOfQuarter } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type PeriodType = 'day' | 'month' | 'quarter' | 'year';

export default function TeamTargets() {
  const { userProfile, userRole } = useAuth();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("Q1");
  
  const { teamMembers, isLoading } = useTeamTargets(periodType, selectedDate) as { teamMembers: any[], isLoading: boolean };

  // Fetch all team members from employee hierarchy using recursive function
  const { data: allTeamMembers } = useQuery({
    queryKey: ['all-team-members-recursive'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Use recursive RPC to get ALL subordinates (not just direct reports)
      const { data: subordinates, error } = await supabase.rpc('get_all_subordinates', {
        manager_user_id: user.id,
      });

      if (error) {
        console.error('Error fetching subordinates:', error);
        return [];
      }

      // Filter out self (level 0) and get actual subordinates
      const actualSubordinates = (subordinates || []).filter((s: any) => s.level > 0);
      const subordinateIds = actualSubordinates.map((s: any) => s.subordinate_user_id);

      if (subordinateIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', subordinateIds);
      
      return profiles || [];
    },
  });

  const getRatingColor = (rating: string) => {
    const colors = {
      excellent: "bg-chart-1/10 text-chart-1 border-chart-1/20",
      good: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      average: "bg-chart-3/10 text-chart-3 border-chart-3/20",
      needs_improvement: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return colors[rating as keyof typeof colors] || colors.needs_improvement;
  };

  // Filter team members based on selection
  const filteredMembers = selectedMember === "all" 
    ? teamMembers 
    : teamMembers?.filter(m => m.user_id === selectedMember);

  const teamAverage = filteredMembers?.length 
    ? filteredMembers.reduce((sum, m) => sum + (m.weighted_average_score || 0), 0) / filteredMembers.length
    : 0;

  const topPerformer = filteredMembers?.reduce((top: any, current: any) => 
    (current.weighted_average_score || 0) > (top?.weighted_average_score || 0) ? current : top
  , filteredMembers[0]);

  const needsAttention = filteredMembers?.filter(m => (m.weighted_average_score || 0) < 60).length || 0;

  const getPeriodLabel = () => {
    if (periodType === 'day') return format(selectedDate, 'MMMM d, yyyy');
    if (periodType === 'month') return format(selectedDate, 'MMMM yyyy');
    if (periodType === 'quarter') return `${selectedQuarter} ${selectedDate.getFullYear()}`;
    return selectedDate.getFullYear().toString();
  };

  const getPeriodDates = () => {
    let start: Date, end: Date;
    
    if (periodType === 'day') {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
    } else if (periodType === 'quarter') {
      const quarterNum = parseInt(selectedQuarter.replace('Q', ''));
      const quarterStart = new Date(selectedDate.getFullYear(), (quarterNum - 1) * 3, 1);
      start = startOfQuarter(quarterStart);
      end = endOfQuarter(quarterStart);
    } else {
      start = new Date(selectedDate);
      end = new Date(selectedDate);
    }
    
    return { start, end };
  };

  // Sample data for demonstration when no real data exists
  const sampleKPIScores = {
    revenue_contribution: 92,
    new_retailer_addition: 85,
    productive_visits: 88,
    beat_adherence: 95,
    visit_completion_rate: 90,
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

          <div className="flex gap-2">
            <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>

            {periodType === 'quarter' && (
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Quarter 1</SelectItem>
                  <SelectItem value="Q2">Quarter 2</SelectItem>
                  <SelectItem value="Q3">Quarter 3</SelectItem>
                  <SelectItem value="Q4">Quarter 4</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {allTeamMembers?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Team Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold">{filteredMembers?.length || 0}</p>
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
            {filteredMembers?.map((member: any) => (
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
            {(!filteredMembers || filteredMembers.length === 0) && (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  No team members found or no performance data available for this period.
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Detailed Team Table with Key Parameters */}
        {filteredMembers && filteredMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Parameters</CardTitle>
              <CardDescription>Detailed breakdown of target achievement by KPI</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Employee</TableHead>
                      <TableHead className="text-center">Overall Score</TableHead>
                      <TableHead className="text-center">Rating</TableHead>
                      <TableHead className="text-center">Revenue</TableHead>
                      <TableHead className="text-center">New Retailers</TableHead>
                      <TableHead className="text-center">Productive Visits</TableHead>
                      <TableHead className="text-center">Beat Adherence</TableHead>
                      <TableHead className="text-center">Visit Completion</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member: any) => {
                      const kpiScores = member.kpi_scores || sampleKPIScores;
                      return (
                        <TableRow key={member.user_id}>
                          <TableCell className="font-medium">
                            {member.user?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-lg">
                              {(member.weighted_average_score || 0).toFixed(0)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={getRatingColor(member.performance_rating || 'needs_improvement')}
                            >
                              {(member.performance_rating || 'needs_improvement').replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{kpiScores.revenue_contribution || 0}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{kpiScores.new_retailer_addition || 0}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{kpiScores.productive_visits || 0}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{kpiScores.beat_adherence || 0}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{kpiScores.visit_completion_rate || 0}%</span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {format(new Date(member.calculated_at || new Date()), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments Section for selected team member */}
        {selectedMember && selectedMember !== "all" && userProfile && (
          <PerformanceComments
            userId={selectedMember}
            periodType={periodType}
            periodStart={getPeriodDates().start.toISOString().split('T')[0]}
            periodEnd={getPeriodDates().end.toISOString().split('T')[0]}
            isManager={true}
            isHR={userRole === 'admin'}
          />
        )}
      </div>
    </Layout>
  );
}