import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { ArrowLeft, Calendar as CalendarIcon, Users, MessageSquare, TrendingUp, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useJointSales } from "@/hooks/useJointSales";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const JointSalesAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getJointSalesSessions } = useJointSales();
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [feedbackData, setFeedbackData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  
  // Stats
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalRetailersVisited, setTotalRetailersVisited] = useState(0);
  const [totalFeedbackCaptured, setTotalFeedbackCaptured] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    let from: Date, to: Date;

    switch (period) {
      case 'week':
        from = subDays(now, 7);
        to = now;
        break;
      case 'month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case '3months':
        from = subDays(now, 90);
        to = now;
        break;
      default:
        from = startOfMonth(now);
        to = endOfMonth(now);
    }

    setDateRange({ from, to });
  };

  const fetchJointSalesData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');

      // Fetch sessions
      const sessionsData = await getJointSalesSessions(startDate, endDate);
      setSessions(sessionsData);

      // Calculate stats
      setTotalSessions(sessionsData.length);
      const retailers = sessionsData.reduce((sum, s) => sum + s.retailers_visited, 0);
      setTotalRetailersVisited(retailers);
      const feedbacks = sessionsData.reduce((sum, s) => sum + s.feedback_count, 0);
      setTotalFeedbackCaptured(feedbacks);

      // Get unique team members
      const uniqueTeamMembers = [...new Set(sessionsData.map(s => s.manager_name))];
      setTeamMembers(uniqueTeamMembers);

      // Fetch detailed feedback data
      const { data: feedbacksData } = await supabase
        .from('joint_sales_feedback')
        .select(`
          *,
          retailers (name)
        `)
        .eq('manager_id', user.id)
        .gte('feedback_date', startDate)
        .lte('feedback_date', endDate);

      setFeedbackData(feedbacksData || []);

      // Calculate average rating
      if (feedbacksData && feedbacksData.length > 0) {
        const ratings = feedbacksData.flatMap(f => [
          f.branding_rating,
          f.retailing_rating,
          f.pricing_feedback_rating,
          f.schemes_rating,
          f.competition_rating,
          f.product_feedback_rating,
          f.sampling_rating,
          f.distributor_feedback_rating,
          f.sales_trends_rating,
          f.future_growth_rating
        ]).filter(r => r > 0);

        const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
        setAvgRating(avg);
      }
    } catch (error) {
      console.error('Error fetching joint sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJointSalesData();
  }, [user, dateRange]);

  // Prepare chart data
  const sessionsByDate = sessions.reduce((acc: any, session) => {
    const date = format(new Date(session.session_date), 'MMM dd');
    if (!acc[date]) {
      acc[date] = { date, sessions: 0, feedback: 0 };
    }
    acc[date].sessions += 1;
    acc[date].feedback += session.feedback_count;
    return acc;
  }, {});

  const timelineData = Object.values(sessionsByDate);

  // Category ratings distribution
  const categoryRatings = feedbackData.length > 0 ? [
    { name: 'Branding', rating: feedbackData.reduce((sum, f) => sum + (f.branding_rating || 0), 0) / feedbackData.filter(f => f.branding_rating).length || 0 },
    { name: 'Retailing', rating: feedbackData.reduce((sum, f) => sum + (f.retailing_rating || 0), 0) / feedbackData.filter(f => f.retailing_rating).length || 0 },
    { name: 'Pricing', rating: feedbackData.reduce((sum, f) => sum + (f.pricing_feedback_rating || 0), 0) / feedbackData.filter(f => f.pricing_feedback_rating).length || 0 },
    { name: 'Schemes', rating: feedbackData.reduce((sum, f) => sum + (f.schemes_rating || 0), 0) / feedbackData.filter(f => f.schemes_rating).length || 0 },
    { name: 'Competition', rating: feedbackData.reduce((sum, f) => sum + (f.competition_rating || 0), 0) / feedbackData.filter(f => f.competition_rating).length || 0 },
    { name: 'Product', rating: feedbackData.reduce((sum, f) => sum + (f.product_feedback_rating || 0), 0) / feedbackData.filter(f => f.product_feedback_rating).length || 0 },
    { name: 'Sampling', rating: feedbackData.reduce((sum, f) => sum + (f.sampling_rating || 0), 0) / feedbackData.filter(f => f.sampling_rating).length || 0 },
    { name: 'Distributor', rating: feedbackData.reduce((sum, f) => sum + (f.distributor_feedback_rating || 0), 0) / feedbackData.filter(f => f.distributor_feedback_rating).length || 0 },
  ].filter(item => item.rating > 0) : [];

  return (
    <Layout>
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/analytics')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Joint Sales Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Manager Collaboration Insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{totalSessions}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retailers Visited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{totalRetailersVisited}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Feedback Captured
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{totalFeedbackCaptured}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">/5.0</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Joint Sales Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sessions" stroke="#8884d8" name="Sessions" />
                  <Line type="monotone" dataKey="feedback" stroke="#82ca9d" name="Feedback" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryRatings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Joint Sales Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>FSE Name</TableHead>
                  <TableHead>Beat</TableHead>
                  <TableHead>Retailers Visited</TableHead>
                  <TableHead>Feedback Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No joint sales sessions found for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{format(new Date(session.session_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{session.manager_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{session.beat_name}</Badge>
                      </TableCell>
                      <TableCell>{session.retailers_visited}</TableCell>
                      <TableCell>{session.feedback_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};
