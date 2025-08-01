import { 
  Calendar, 
  MapPin, 
  Target, 
  TrendingUp, 
  Users,
  UserCheck,
  Route,
  Gift,
  CreditCard,
  Trophy,
  BookOpen,
  Briefcase,
  Car,
  BarChart,
  Award
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Layout } from "@/components/Layout";
import { useState, useEffect } from "react";

const motivationalQuotes = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The way to get started is to quit talking and begin doing.",
  "Don't be afraid to give up the good to go for the great.",
  "Innovation distinguishes between a leader and a follower.",
  "The future depends on what you do today.",
  "Excellence is never an accident. It is always the result of high intention.",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't come from what you do occasionally, it comes from what you do consistently.",
  "Be yourself; everyone else is already taken.",
  "The only way to do great work is to love what you do."
];

const Index = () => {
  const [currentQuote, setCurrentQuote] = useState("");

  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setCurrentQuote(randomQuote);
  }, []);

  const navigationItems = [
    { icon: UserCheck, label: "Attendance", href: "/attendance", color: "from-blue-500 to-blue-600" },
    { icon: Car, label: "Today's Visit", href: "https://preview--bharath-sales-navigator.lovable.app/visits/retailers", color: "from-green-500 to-green-600" },
    { icon: Route, label: "Journey Plan", href: "/visits", color: "from-purple-500 to-purple-600" },
    { icon: Users, label: "Create New Beat", href: "/create-beat", color: "from-orange-500 to-orange-600" },
    { icon: Briefcase, label: "Add Retailer", href: "/add-records", color: "from-red-500 to-red-600" },
    { icon: Gift, label: "Check Schemes", href: "/schemes", color: "from-pink-500 to-pink-600" },
    { icon: CreditCard, label: "My Expenses", href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    { icon: BarChart, label: "Performance Summary", href: "/performance", color: "from-cyan-500 to-cyan-600" },
    { icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: BookOpen, label: "Sales Coach", href: "/sales-coach", color: "from-teal-500 to-teal-600" },
    { icon: Target, label: "Analytics", href: "/beat-analytics", color: "from-violet-500 to-violet-600" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header Section with Welcome */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6 text-center">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <Avatar className="h-20 w-20 border-4 border-primary-foreground/20 shadow-lg">
                <AvatarImage src="/placeholder.svg" alt="User" />
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-2xl font-bold">
                  J
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <h1 className="text-3xl font-bold mb-1">Good Morning!</h1>
                <p className="text-xl opacity-90">James</p>
                <p className="text-sm opacity-75">Sales Executive</p>
              </div>
            </div>
            
            {/* Motivational Quote */}
            <div className="bg-primary-foreground/10 rounded-xl p-5 mt-6 backdrop-blur-sm border border-primary-foreground/20">
              <p className="text-lg font-medium italic leading-relaxed">"{currentQuote}"</p>
            </div>
          </div>
        </div>

        {/* This Month's Progress */}
        <div className="p-4 -mt-8 relative z-10">
          <div className="grid grid-cols-2 gap-3 mb-8">
            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">15</div>
                <div className="text-xs text-blue-700 font-medium">New Retailers</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">142</div>
                <div className="text-xs text-green-700 font-medium">Total Check-ins</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">89%</div>
                <div className="text-xs text-purple-700 font-medium">Productive Visits</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">₹1.2L</div>
                <div className="text-xs text-orange-700 font-medium">Revenue This Month</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 border-indigo-200 shadow-lg">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-indigo-600 mb-1">#3</div>
                <div className="text-xs text-indigo-700 font-medium">Leader Rank</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-200 shadow-lg">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-emerald-600 mb-1">124%</div>
                <div className="text-xs text-emerald-700 font-medium">Achievement %</div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Grid */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8">
              Start Your Day Right
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              {navigationItems.map((item, index) => (
                <NavLink 
                  key={item.href} 
                  to={item.href}
                  className="group block"
                >
                  <div className="p-4 text-center transition-all duration-300 hover:scale-105">
                    <div className={`inline-flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-gradient-to-r ${item.color} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                      <item.icon className="h-7 w-7 text-white drop-shadow-sm" />
                    </div>
                    <h3 className="font-medium text-xs text-foreground/80 group-hover:text-primary transition-colors leading-tight">
                      {item.label}
                    </h3>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>

          {/* Achievement Badge */}
          <Card className="mt-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200 shadow-lg">
            <CardContent className="p-6 text-center">
              <Award className="h-10 w-10 mx-auto mb-3 text-amber-600" />
              <div className="font-bold text-lg text-amber-700 mb-1">Top Performer This Week!</div>
              <div className="text-sm text-amber-600">You're exceeding targets by 18%</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
