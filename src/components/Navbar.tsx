import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  UserCheck, 
  Car, 
  Route, 
  Users,
  Briefcase,
  Gift,
  CreditCard,
  BarChart,
  Trophy,
  BookOpen,
  Target
} from "lucide-react";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, user, userProfile } = useAuth();

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

  // Get user display name and initials
  const displayName = userProfile?.full_name || userProfile?.username || 'User';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      <nav className="bg-gradient-primary text-primary-foreground shadow-lg relative z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold">BB</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Bharath Beverages</h1>
                <p className="text-xs opacity-80">Field Sales App</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Full Screen Navigation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
              <div className="relative p-6 text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-16 w-16 border-4 border-primary-foreground/20 shadow-lg">
                      <AvatarImage src="/placeholder.svg" alt="User" />
                      <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-xl font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <h1 className="text-2xl font-bold">{displayName}</h1>
                      <p className="text-sm opacity-75">Sales Executive</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={signOut}
                      className="text-primary-foreground hover:bg-primary-foreground/10 h-8"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </Button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
                
                <div className="bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm border border-primary-foreground/20">
                  <p className="text-sm font-medium">Keep pushing forward - Success awaits!</p>
                </div>
              </div>
            </div>

            {/* Current Month Performance */}
            <div className="p-4 -mt-6 relative z-10">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">15</div>
                    <div className="text-xs text-blue-700 font-medium">New Retailers (Current Month)</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">142</div>
                    <div className="text-xs text-green-700 font-medium">Check-ins (This Month)</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-1">89%</div>
                    <div className="text-xs text-purple-700 font-medium">Productive Visits (Current Month)</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">₹1.2L</div>
                    <div className="text-xs text-orange-700 font-medium">Revenue (This Month)</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-indigo-500/10 to-indigo-600/10 border-indigo-200 shadow-lg">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">#3</div>
                    <div className="text-xs text-indigo-700 font-medium">Leader Rank (Current Month)</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-200 shadow-lg">
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600 mb-1">124%</div>
                    <div className="text-xs text-emerald-700 font-medium">Achievement % (This Month)</div>
                  </CardContent>
                </Card>
              </div>

              {/* Navigation Grid */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-center text-foreground mb-4">
                  Quick Actions
                </h2>
                
                <div className="grid grid-cols-3 gap-3">
                  {navigationItems.map((item) => (
                    <NavLink 
                      key={item.href} 
                      to={item.href}
                      className="group block"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="p-3 text-center transition-all duration-300 hover:scale-105">
                        <div className={`inline-flex items-center justify-center w-12 h-12 mb-2 rounded-xl bg-gradient-to-r ${item.color} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                          <item.icon className="h-6 w-6 text-white drop-shadow-sm" />
                        </div>
                        <h3 className="font-medium text-xs text-foreground/80 group-hover:text-primary transition-colors leading-tight">
                          {item.label}
                        </h3>
                      </div>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};