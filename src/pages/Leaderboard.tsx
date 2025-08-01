import { Trophy, Medal, Star, ArrowLeft, Crown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";

const Leaderboard = () => {
  const navigate = useNavigate();

  const leaderboardData = [
    { rank: 1, name: "Rajesh Kumar", score: 9850, change: "+15", revenue: "₹4.2L", visits: 45, badge: "🏆" },
    { rank: 2, name: "Priya Sharma", score: 9720, change: "+8", revenue: "₹3.9L", visits: 42, badge: "🥈" },
    { rank: 3, name: "James Wilson", score: 9680, change: "0", revenue: "₹3.8L", visits: 40, badge: "🥉" },
    { rank: 4, name: "Amit Patel", score: 9540, change: "-5", revenue: "₹3.6L", visits: 38, badge: "" },
    { rank: 5, name: "Sarah Johnson", score: 9480, change: "+12", revenue: "₹3.5L", visits: 36, badge: "" },
    { rank: 6, name: "Ravi Singh", score: 9420, change: "-8", revenue: "₹3.4L", visits: 35, badge: "" },
    { rank: 7, name: "Neha Gupta", score: 9380, change: "+3", revenue: "₹3.3L", visits: 34, badge: "" },
  ];

  const myRank = 3;
  const categories = [
    { title: "Top Performers", icon: Crown, count: 3 },
    { title: "Rising Stars", icon: TrendingUp, count: 4 },
    { title: "Consistent", icon: Star, count: 10 },
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getChangeColor = (change: string) => {
    if (change.startsWith('+')) return 'text-green-600';
    if (change.startsWith('-')) return 'text-red-600';
    return 'text-muted-foreground';
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
                  <Trophy size={28} />
                  Leaderboard
                </h1>
                <p className="text-primary-foreground/80 text-sm">See how you rank among your peers</p>
              </div>
            </div>

            {/* My Rank */}
            <div className="bg-primary-foreground/20 rounded-lg p-4 text-center">
              <div className="text-lg text-primary-foreground/80 mb-1">Your Rank</div>
              <div className="text-4xl font-bold">#{myRank}</div>
              <div className="text-sm text-primary-foreground/80">out of 25 executives</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          {/* Categories */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {categories.map((category, index) => (
              <Card key={index} className="shadow-lg">
                <CardContent className="p-3 text-center">
                  <category.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <div className="text-lg font-bold">{category.count}</div>
                  <div className="text-xs text-muted-foreground">{category.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top 3 Spotlight */}
          <Card className="mb-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Crown size={20} />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {leaderboardData.slice(0, 3).map((person, index) => (
                  <div key={person.rank} className="text-center">
                    <div className="text-2xl mb-1">{person.badge}</div>
                    <Avatar className="h-12 w-12 mx-auto mb-2">
                      <AvatarImage src={`/placeholder.svg`} />
                      <AvatarFallback>{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm">{person.name.split(' ')[0]}</p>
                    <p className="text-xs text-muted-foreground">{person.score}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Full Leaderboard */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy size={20} />
                Full Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboardData.map((person) => (
                  <div 
                    key={person.rank} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      person.rank === myRank ? 'bg-primary/10 border border-primary/20' : 'bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(person.rank)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`/placeholder.svg`} />
                        <AvatarFallback>{person.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{person.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{person.visits} visits</span>
                          <span>•</span>
                          <span>{person.revenue}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{person.score}</p>
                      <p className={`text-xs ${getChangeColor(person.change)}`}>
                        {person.change !== "0" ? person.change : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Leaderboard;