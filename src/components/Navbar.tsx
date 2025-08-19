import { Menu, X, LogOut, Home } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NetworkBadge } from "@/components/NetworkBadge";

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
  Target,
  Shield,
  Settings,
  UserPlus,
  Store,
  Package,
  Paintbrush,
  Factory,
} from "lucide-react";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut, userProfile, userRole } = useAuth();

  const navigationItems = [
    { icon: UserCheck, label: "Attendance", href: "/attendance", color: "from-blue-500 to-blue-600" },
    { icon: Car, label: "My Visit", href: "https://preview--bharath-sales-navigator.lovable.app/visits/retailers", color: "from-green-500 to-green-600" },
    { icon: Store, label: "All Retailers", href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
    { icon: Paintbrush, label: "Branding", href: "/branding-requests", color: "from-fuchsia-500 to-fuchsia-600" },
    { icon: Users, label: "My Beats", href: "/my-beats", color: "from-orange-500 to-orange-600" },
    { icon: Briefcase, label: "Add Retailer", href: "/add-records", color: "from-red-500 to-red-600" },
    { icon: Gift, label: "Check Schemes", href: "/schemes", color: "from-pink-500 to-pink-600" },
    { icon: CreditCard, label: "My Expenses", href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    { icon: BarChart, label: "Performance Summary", href: "/performance", color: "from-cyan-500 to-cyan-600" },
    { icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: BookOpen, label: "Sales Coach", href: "/sales-coach", color: "from-teal-500 to-teal-600" },
    { icon: Target, label: "Analytics", href: "/beat-analytics", color: "from-violet-500 to-violet-600" },
  ];

  // Admin-only navigation items
  const adminNavigationItems = [
    { icon: Shield, label: "Admin Controls", href: "/admin-controls", color: "from-emerald-500 to-emerald-600" },
    { icon: Package, label: "Products", href: "/product-management", color: "from-rose-500 to-rose-600" },
    { icon: Factory, label: "Vendors", href: "/vendors", color: "from-sky-500 to-sky-600" },
    { icon: Settings, label: "Expense Management", href: "/expense-management", color: "from-purple-500 to-purple-600" },
  ];

  // Get user display name and initials
  const displayName = userProfile?.full_name || userProfile?.username || 'User';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      <nav className="bg-gradient-primary text-primary-foreground shadow-lg relative z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center relative">
                <Home size={14} className="absolute opacity-30" />
                <span className="text-xs font-bold relative z-10">KVP</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">KVP Business Solutions</h1>
                <p className="text-xs opacity-80">Field Sales App</p>
              </div>
            </NavLink>
            
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
              <div className="relative p-4 text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <NavLink to="/" onClick={() => setIsOpen(false)}>
                      <Avatar className="h-10 w-10 border-2 border-primary-foreground/20 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                        <AvatarImage src="/placeholder.svg" alt="User" />
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-lg font-bold">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </NavLink>
                    <div className="text-left">
                      <h1 className="text-2xl font-bold">{displayName}</h1>
                      {userRole === 'admin' && (
                        <div className="flex items-center gap-1 mt-1">
                          <Shield className="h-3 w-3" />
                          <span className="text-xs font-medium opacity-90">Administrator</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <NetworkBadge />
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
                
              </div>
            </div>

            {/* Current Month Performance */}
            <div className="p-4 pt-4 mt-0 relative z-10">

              {/* Navigation Grid */}
              <div className="space-y-4">
                {/* Admin Section - Only show for admin users */}
                {userRole === 'admin' && (
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Admin Controls</h2>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {adminNavigationItems.map((item) => (
                        <NavLink 
                          key={item.href} 
                          to={item.href}
                          className="group block"
                          onClick={() => setIsOpen(false)}
                        >
                          <div className="p-2 text-center transition-all duration-300 hover:scale-105">
                            <div className={`inline-flex items-center justify-center w-10 h-10 mb-1 rounded-xl bg-gradient-to-r ${item.color} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                              <item.icon className="h-5 w-5 text-white drop-shadow-sm" />
                            </div>
                            <h3 className="font-medium text-xs text-foreground/80 group-hover:text-primary transition-colors leading-tight">
                              {item.label}
                            </h3>
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Regular Navigation */}
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Navigation</h2>
                  <div className="grid grid-cols-3 gap-3">
                    {navigationItems.map((item) => (
                      <NavLink 
                        key={item.href} 
                        to={item.href}
                        className="group block"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="p-2 text-center transition-all duration-300 hover:scale-105">
                          <div className={`inline-flex items-center justify-center w-10 h-10 mb-1 rounded-xl bg-gradient-to-r ${item.color} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                            <item.icon className="h-5 w-5 text-white drop-shadow-sm" />
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
        </div>
      )}
    </>
  );
};