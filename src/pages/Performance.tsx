import { BarChart3, Target, TrendingUp, ArrowLeft, Calendar, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Performance = () => {
  const navigate = useNavigate();

  const monthlyData = [
    { month: 'Oct', target: 100, achieved: 95, revenue: 320 },
    { month: 'Nov', target: 110, achieved: 118, revenue: 380 },
    { month: 'Dec', target: 120, achieved: 125, revenue: 420 },
    { month: 'Jan', target: 130, achieved: 140, revenue: 450 },
  ];

  const categoryData = [
    { name: 'Retailers', value: 65, color: '#3b82f6' },
    { name: 'Distributors', value: 25, color: '#10b981' },
    { name: 'Super Stockists', value: 10, color: '#f59e0b' },
  ];

  const kpis = {
    monthlyTarget: 130,
    achieved: 140,
    achievementRate: 107.7,
    revenue: 450000,
    visits: 42,
    conversionRate: 85,
    avgOrderValue: 3500,
    newRetailers: 8
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <BarChart3 size={28} />
                  Performance Summary
                </h1>
                <p className="text-primary-foreground/80 text-sm">Your comprehensive performance overview</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{kpis.achievementRate}%</div>
                <div className="text-sm text-primary-foreground/80">Achievement Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">₹{kpis.revenue / 1000}K</div>
                <div className="text-sm text-primary-foreground/80">This Month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{kpis.achieved}</div>
                <div className="text-xs text-green-700">Visits Achieved</div>
                <div className="text-xs text-muted-foreground">Target: {kpis.monthlyTarget}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{kpis.conversionRate}%</div>
                <div className="text-xs text-blue-700">Conversion Rate</div>
                <div className="text-xs text-muted-foreground">vs 78% avg</div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Performance Chart */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                Monthly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Bar dataKey="target" fill="#e2e8f0" name="Target" />
                    <Bar dataKey="achieved" fill="#3b82f6" name="Achieved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                Revenue Trend (₹K)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Customer Mix */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={20} />
                Customer Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2">
                {categoryData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">₹{kpis.avgOrderValue}</div>
                <div className="text-xs text-muted-foreground">Avg Order Value</div>
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{kpis.newRetailers}</div>
                <div className="text-xs text-muted-foreground">New Retailers</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Performance;