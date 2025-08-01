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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setCurrentQuote(randomQuote);
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Home Screen Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 border-4 border-primary-foreground/20 shadow-lg">
                  <AvatarImage src="/placeholder.svg" alt="User" />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-2xl font-bold">
                    J
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold mb-1">{getGreeting()}!</h1>
                  <p className="text-xl opacity-90 font-medium">James</p>
                  <p className="text-sm opacity-75">Sales Executive</p>
                  <p className="text-xs opacity-60 mt-1">{formatDate()}</p>
                </div>
              </div>
            </div>
            
            {/* Motivational Quote */}
            <div className="bg-primary-foreground/10 rounded-xl p-5 backdrop-blur-sm border border-primary-foreground/20">
              <p className="text-lg font-medium italic leading-relaxed text-center">"{currentQuote}"</p>
            </div>
          </div>
        </div>

        {/* Performance Dashboard */}
        <div className="p-4 -mt-8 relative z-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-center text-foreground mb-4">
              Today's Performance
            </h2>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">8</div>
                  <div className="text-xs text-blue-700 font-medium">Visits Today</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">6</div>
                  <div className="text-xs text-green-700 font-medium">Orders Taken</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">₹45K</div>
                  <div className="text-xs text-purple-700 font-medium">Today's Revenue</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">75%</div>
                  <div className="text-xs text-orange-700 font-medium">Target Achieved</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-center text-foreground mb-4">
              This Month's Summary
            </h2>
            
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 border-indigo-200 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">15</div>
                  <div className="text-xs text-indigo-700 font-medium">New Retailers</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-200 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">142</div>
                  <div className="text-xs text-emerald-700 font-medium">Total Check-ins</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border-cyan-200 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-600 mb-1">₹1.2L</div>
                  <div className="text-xs text-cyan-700 font-medium">Monthly Revenue</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-r from-pink-500/10 to-pink-600/10 border-pink-200 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-pink-600 mb-1">#3</div>
                  <div className="text-xs text-pink-700 font-medium">Leaderboard Rank</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Achievement Badge */}
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200 shadow-lg">
            <CardContent className="p-6 text-center">
              <Award className="h-10 w-10 mx-auto mb-3 text-amber-600" />
              <div className="font-bold text-lg text-amber-700 mb-1">Top Performer This Week!</div>
              <div className="text-sm text-amber-600">You're exceeding targets by 18% 🎉</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
