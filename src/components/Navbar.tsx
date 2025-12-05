import { Menu, X, LogOut, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  UserCheck, 
  Car, 
  Route, 
  Users,
  Briefcase,
  Gift,
  CreditCard,
  Trophy,
  BookOpen,
  Target,
  Shield,
  Store,
  Package,
  Paintbrush,
  Factory,
  MapPin,
  Navigation2,
  Building2,
  Trash2,
} from "lucide-react";

export const Navbar = () => {
  const { signOut, userProfile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const connectivityStatus = useConnectivity();
  const { t } = useTranslation('common');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Hide back button on home/dashboard
  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/';

  const navigationItems = [
    { icon: UserCheck, label: t('nav.attendance'), href: "/attendance", color: "from-blue-500 to-blue-600" },
    { icon: Car, label: t('nav.myVisit'), href: "/visits/retailers", color: "from-green-500 to-green-600" },
    { icon: Store, label: t('nav.allRetailers'), href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
    { icon: Building2, label: "Institutional Sales", href: "/institutional-sales", color: "from-indigo-500 to-indigo-600" },
    { icon: MapPin, label: t('nav.territories'), href: "/territories-and-distributors", color: "from-amber-500 to-amber-600" },
    { icon: Navigation2, label: t('nav.gpsTrack'), href: "/gps-track", color: "from-purple-500 to-purple-600" },
    { icon: Users, label: t('nav.myBeats'), href: "/my-beats", color: "from-orange-500 to-orange-600" },
    { icon: Briefcase, label: "Distributor Mapping", href: "/add-records", color: "from-red-500 to-red-600" },
    { icon: Trophy, label: "Competition Master", href: "/competition-master", color: "from-slate-500 to-slate-600" },
    { icon: Gift, label: t('nav.schemes'), href: "/schemes", color: "from-pink-500 to-pink-600" },
    { icon: CreditCard, label: t('nav.expenses'), href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    { icon: Target, label: "Performance", href: "/my-targets", color: "from-cyan-500 to-cyan-600" },
    { icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: BookOpen, label: "Sales Coach", href: "/sales-coach", color: "from-teal-500 to-teal-600" },
    { icon: Target, label: t('nav.analytics'), href: "/analytics", color: "from-violet-500 to-violet-600" },
    { icon: Trash2, label: "Recycle Bin", href: "/recycle-bin", color: "from-rose-500 to-rose-600" },
  ];

  // Admin-only navigation items
  const adminNavigationItems = [
    { icon: Shield, label: t('nav.adminPanel'), href: "/admin-controls", color: "from-emerald-500 to-emerald-600" },
  ];

  // Get user display name and initials
  const displayName = userProfile?.full_name || userProfile?.username || 'User';
  const userInitials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  const handleMenuItemClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-gradient-primary text-white shadow-lg z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {showBackButton && (
                <button
                  onClick={() => navigate(-1)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white"
                  title="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              
              <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity text-white">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-white p-0.5">
                  <img 
                    src={bharathLogo} 
                    alt="Bharath Beverages" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h1 className="text-base font-semibold text-white">Bharath Beverages</h1>
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
            
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      <div className="h-12" />

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {/* User Profile Section */}
          <SheetHeader className="pb-3 border-b bg-gradient-primary text-primary-foreground rounded-lg -mx-6 -mt-6 px-6 pt-4 mb-6 pr-12">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col items-start flex-1 min-w-0">
                <SheetTitle 
                  className="text-lg font-bold text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity truncate w-full text-left" 
                  onClick={() => {
                    navigate('/employee-profile');
                    handleMenuItemClick();
                  }}
                >
                  {displayName}
                </SheetTitle>
                {userRole === 'admin' && (
                  <div className="flex items-center gap-1.5 text-xs opacity-90 text-primary-foreground mt-1">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="font-medium">Admin</span>
                  </div>
                )}
              </div>
              <div className="flex items-center flex-shrink-0">
                <button
                  onClick={() => {
                    signOut();
                    handleMenuItemClick();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <LogOut className="h-4 w-4 text-primary-foreground" />
                  <span className="text-sm text-primary-foreground font-medium">Logout</span>
                </button>
              </div>
            </div>
          </SheetHeader>

          {/* Admin Controls Section */}
          {userRole === 'admin' && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Admin Controls</h3>
              <div className="grid grid-cols-3 gap-3">
                {adminNavigationItems.map((item) => (
                  <NavLink 
                    key={item.href}
                    to={item.href}
                    onClick={handleMenuItemClick}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Navigation</h3>
            <div className="grid grid-cols-3 gap-3">
              {navigationItems.map((item) => (
                <NavLink 
                  key={item.href}
                  to={item.href}
                  onClick={handleMenuItemClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} shadow-md`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};