import { Calendar, MapPin, Target, TrendingUp, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Layout } from "@/components/Layout";

const Index = () => {
  const todayStats = {
    plannedVisits: 4,
    completedVisits: 1,
    totalRevenue: "₹18,650",
    newOrders: 3
  };

  const upcomingVisits = [
    {
      retailer: "Sham Kirana and General Stores",
      time: "2:00 PM",
      status: "Negotiation",
      priority: "high"
    },
    {
      retailer: "Balaji Kiranad", 
      time: "4:00 PM",
      status: "Follow-up",
      priority: "medium"
    }
  ];

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Welcome Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-muted-foreground text-sm">Hello,</div>
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg" alt="James" />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-semibold">J</AvatarFallback>
            </Avatar>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Hi James</h1>
        </div>

        {/* Beat Information Card */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">M.G. Road Beat</h3>
                <div className="space-y-1 text-primary-foreground/90 text-sm">
                  <p>You have planned to visit M.G. Road Beat and there are 40 retailers.</p>
                  <p>Last visited date was July 15, 2025 and the average productive visit is 22 retailers and revenue per visit from this beat is Rs. 5,585.</p>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-right">
                  <MapPin className="text-primary-foreground/70" size={24} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Target className="text-primary" size={24} />
              </div>
              <div className="text-2xl font-bold text-primary">{todayStats.completedVisits}/{todayStats.plannedVisits}</div>
              <div className="text-sm text-muted-foreground">Visits Today</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="text-success" size={24} />
              </div>
              <div className="text-2xl font-bold text-success">{todayStats.totalRevenue}</div>
              <div className="text-sm text-muted-foreground">Revenue Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <NavLink to="/visits">
              <Button variant="outline" className="w-full h-12 justify-start">
                <MapPin size={18} className="mr-2" />
                Beat Plan
              </Button>
            </NavLink>
            
            <NavLink to="/visits/retailers">
              <Button variant="outline" className="w-full h-12 justify-start">
                <Calendar size={18} className="mr-2" />
                Today's Visit
              </Button>
            </NavLink>
            
            <NavLink to="/retailers">
              <Button variant="outline" className="w-full h-12 justify-start">
                <Users size={18} className="mr-2" />
                Retailers
              </Button>
            </NavLink>
            
            <Button variant="outline" className="w-full h-12 justify-start">
              <TrendingUp size={18} className="mr-2" />
              Analytics
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Visits */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Upcoming Visits Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingVisits.map((visit, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{visit.retailer}</h4>
                  <p className="text-xs text-muted-foreground">{visit.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={visit.priority === "high" 
                      ? "bg-destructive text-destructive-foreground" 
                      : "bg-warning text-warning-foreground"
                    }
                  >
                    {visit.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            <NavLink to="/visits">
              <Button variant="outline" className="w-full mt-3">
                View All Visits
              </Button>
            </NavLink>
          </CardContent>
        </Card>

        {/* Performance Insight */}
        <Card className="shadow-card border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-success" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Great Progress!</h4>
                <p className="text-sm text-muted-foreground">
                  You're ahead of your monthly target by 12%. Keep up the excellent work!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
