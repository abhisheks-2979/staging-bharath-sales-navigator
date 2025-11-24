import { Menu, X, LogOut, Home, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { NetworkBadge } from "@/components/NetworkBadge";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useConnectivity } from "@/hooks/useConnectivity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from 'react-i18next';
import bharathLogo from '@/assets/bharath-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
  MapPin,
} from "lucide-react";

export const Navbar = () => {
  const { signOut, userProfile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const connectivityStatus = useConnectivity();
  const { t } = useTranslation('common');
  const { open, setOpen } = useSidebar();
  
  // Hide back button on home/dashboard
  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/';

  const navigationItems = [
    { icon: UserCheck, label: "My Profile", href: "/employee-profile", color: "from-indigo-500 to-indigo-600" },
    { icon: UserCheck, label: t('nav.attendance'), href: "/attendance", color: "from-blue-500 to-blue-600" },
    { icon: Car, label: t('nav.myVisit'), href: "/visits/retailers", color: "from-green-500 to-green-600" },
    { icon: Store, label: t('nav.allRetailers'), href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
    { icon: MapPin, label: t('nav.territories'), href: "/territories-and-distributors", color: "from-amber-500 to-amber-600" },
    { icon: Route, label: t('nav.gpsTrack'), href: "/gps-track", color: "from-purple-500 to-purple-600" },
    { icon: Users, label: t('nav.myBeats'), href: "/my-beats", color: "from-orange-500 to-orange-600" },
    { icon: Briefcase, label: "Distributor Mapping", href: "/add-records", color: "from-red-500 to-red-600" },
    { icon: Trophy, label: "Competition Master", href: "/competition-master", color: "from-slate-500 to-slate-600" },
    { icon: Gift, label: "Retailer Rewards", href: "/retailer-loyalty", color: "from-pink-500 to-pink-600" },
    { icon: Gift, label: t('nav.schemes'), href: "/schemes", color: "from-rose-500 to-rose-600" },
    { icon: CreditCard, label: t('nav.expenses'), href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    { icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: BookOpen, label: "Sales Coach", href: "/sales-coach", color: "from-teal-500 to-teal-600" },
    { icon: Target, label: t('nav.analytics'), href: "/analytics", color: "from-violet-500 to-violet-600" },
  ];

  // Admin-only navigation items
  const adminNavigationItems = [
    { icon: Shield, label: t('nav.adminPanel'), href: "/admin-controls", color: "from-emerald-500 to-emerald-600" },
  ];

  // Get user display name and initials
  const displayName = userProfile?.full_name || userProfile?.username || 'User';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-gradient-primary text-white shadow-lg z-50">
        <div className="px-3 py-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showBackButton && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white"
                  title="Go to dashboard"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              
              <NavLink to="/dashboard" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-white">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-white p-0.5">
                  <img 
                    src={bharathLogo} 
                    alt="Bharath Beverages" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h1 className="text-xs font-semibold text-white">Bharath Beverages</h1>
                    <SyncStatusIndicator />
                  </div>
                  <div className="flex items-center gap-0.5 text-white">
                    {connectivityStatus === 'online' ? (
                      <Wifi className="h-2.5 w-2.5 opacity-80" />
                    ) : connectivityStatus === 'offline' ? (
                      <>
                        <WifiOff className="h-2.5 w-2.5 opacity-80" />
                        <p className="text-[10px] opacity-80">No Connection</p>
                      </>
                    ) : null}
                  </div>
                </div>
              </NavLink>
            </div>
            
            <SidebarTrigger className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white">
              <Menu size={20} />
            </SidebarTrigger>
          </div>
        </div>
      </nav>

      <div className="h-12" />

      <Sidebar 
        className="mt-12 border-r bg-gradient-to-br from-primary/5 via-background to-secondary/5"
        collapsible="offcanvas"
      >
        <SidebarContent className="bg-transparent">
          {/* User Profile Section */}
          <div className="p-4 border-b bg-gradient-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <NavLink to="/employee-profile">
                <Avatar className="h-10 w-10 border-2 border-primary-foreground/20 shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <AvatarImage src="/placeholder.svg" alt="User" />
                  <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-lg font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </NavLink>
              <div className="flex-1 min-w-0">
                <div 
                  className="text-base font-bold truncate cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate('/employee-profile')}
                >
                  {displayName}
                </div>
                {userRole === 'admin' && (
                  <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                    <Shield className="h-3 w-3" />
                    <span className="font-medium">Administrator</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <SyncStatusIndicator />
              <NetworkBadge />
            </div>
          </div>

          {/* Admin Section */}
          {userRole === 'admin' && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground text-sm font-semibold px-4 py-2">Admin Controls</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild className="hover:bg-muted/50">
                        <NavLink to={item.href} className="flex items-center gap-3 px-4 py-2.5">
                          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                            <item.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium text-sm">{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Main Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-sm font-semibold px-4 py-2">Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className="hover:bg-muted/50">
                      <NavLink to={item.href} className="flex items-center gap-3 px-4 py-2.5">
                        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                          <item.icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Logout Button */}
          <div className="p-4 mt-auto border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="w-full hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.logout')}
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>
    </>
  );
};