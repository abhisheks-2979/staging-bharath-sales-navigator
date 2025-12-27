import { Menu, LogOut, ArrowLeft, Database } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useCallback, memo } from "react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useTranslation } from 'react-i18next';
import { useActivePerformanceModule } from "@/hooks/useActivePerformanceModule";
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
  ShoppingCart,
} from "lucide-react";

// Memoized Navbar component for better performance
export const Navbar = memo(() => {
  const { signOut, userProfile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const connectivityStatus = useConnectivity();
  const { t } = useTranslation('common');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { activeModule, isGamificationActive, isTargetActualActive } = useActivePerformanceModule();
  
  // Hide back button on home/dashboard
  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/';

  // Build navigation items dynamically based on active module
  const navigationItems = useMemo(() => {
    const baseItems = [
      { icon: UserCheck, label: t('nav.attendance'), href: "/attendance", color: "from-blue-500 to-blue-600" },
      { icon: Car, label: t('nav.myVisit'), href: "/visits/retailers", color: "from-green-500 to-green-600" },
      { icon: Store, label: t('nav.allRetailers'), href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
      { icon: Building2, label: "Institutional Sales", href: "/institutional-sales", color: "from-indigo-500 to-indigo-600" },
      { icon: Factory, label: "Distributor Master", href: "/distributor-master", color: "from-cyan-500 to-cyan-600" },
      { icon: ShoppingCart, label: "Primary Orders", href: "/primary-orders", color: "from-rose-500 to-rose-600" },
      { icon: MapPin, label: t('nav.territories'), href: "/territories-and-distributors", color: "from-amber-500 to-amber-600" },
      { icon: Navigation2, label: t('nav.gpsTrack'), href: "/gps-track", color: "from-purple-500 to-purple-600" },
      { icon: Users, label: t('nav.myBeats'), href: "/my-beats", color: "from-orange-500 to-orange-600" },
      { icon: Trophy, label: "Competition Master", href: "/competition-master", color: "from-slate-500 to-slate-600" },
      { icon: Gift, label: t('nav.schemes'), href: "/schemes", color: "from-pink-500 to-pink-600" },
      { icon: CreditCard, label: t('nav.expenses'), href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    ];

    // Only add Performance if module is not 'none'
    if (activeModule !== 'none') {
      baseItems.push({ icon: Target, label: "Performance", href: "/performance", color: "from-cyan-500 to-cyan-600" });
    }

    // Add Leaderboard only if gamification is active
    if (isGamificationActive) {
      baseItems.push({ icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" });
    }

    // Add remaining items
    baseItems.push(
      { icon: BookOpen, label: "Sales Coach", href: "/sales-coach", color: "from-teal-500 to-teal-600" },
      { icon: Target, label: t('nav.analytics'), href: "/analytics", color: "from-violet-500 to-violet-600" },
      { icon: Trash2, label: "Recycle Bin", href: "/recycle-bin", color: "from-rose-500 to-rose-600" },
    );

    return baseItems;
  }, [t, activeModule, isGamificationActive]);

  // Admin-only navigation items
  const adminNavigationItems = [
    { icon: Shield, label: t('nav.adminPanel'), href: "/admin-controls", color: "from-emerald-500 to-emerald-600" },
  ];

  // Get user display name and initials
  const displayName = userProfile?.full_name || userProfile?.username || 'User';

  const handleMenuItemClick = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const isOnline = connectivityStatus === 'online';

  return (
    <>
      {/* Premium Header - positioned below safe area top */}
      <nav className="navbar-safe-area z-50">
        {/* Gradient background with rounded bottom corners and shadow */}
        <div 
          className="relative px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 50%, hsl(var(--primary)) 100%)',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.25), 0 2px 8px -2px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div className="flex items-center justify-between">
            {/* Left: Back Button in Circular Card */}
            <div className="w-10 h-10 flex items-center justify-center">
              {showBackButton ? (
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 backdrop-blur-sm shadow-lg active:scale-95 transition-all duration-150 hover:bg-white/25"
                  style={{
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
                  }}
                  title="Go back"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} className="text-white" />
                </button>
              ) : (
                <div className="w-10 h-10" /> // Placeholder for alignment
              )}
            </div>
            
            {/* Center: Logo + Company Name */}
            <NavLink 
              to="/dashboard" 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              {/* Logo Container */}
              <div 
                className="relative w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden bg-white"
                style={{ padding: '3px' }}
              >
                <img 
                  src={bharathLogo} 
                  alt="Bharath Beverages" 
                  className="w-full h-full object-contain"
                />
                {/* Online/Offline Status Dot */}
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ boxShadow: `0 0 6px ${isOnline ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}` }}
                />
              </div>
              
              {/* Company Name + Sync Status */}
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-semibold text-white tracking-tight">
                    Bharath Beverages
                  </h1>
                  <Database size={14} className="text-white/70" />
                  <SyncStatusIndicator />
                </div>
              </div>
            </NavLink>
            
            {/* Right: Menu Button in Circular Card */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 backdrop-blur-sm shadow-lg active:scale-95 transition-all duration-150 hover:bg-white/25"
              style={{
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
              }}
            >
              <Menu size={20} strokeWidth={2} className="text-white" />
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer for navbar height */}
      <div className="navbar-spacer" />

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {/* User Profile Section */}
          <SheetHeader className="pb-3 border-b bg-gradient-primary text-primary-foreground rounded-lg -mx-6 -mt-6 px-6 pt-4 mb-6 pr-12">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col items-start flex-1 min-w-0">
                <SheetTitle 
                  className="text-lg font-bold text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity truncate w-full text-left" 
                  onClick={() => {
                    navigate('/profile');
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
});

Navbar.displayName = 'Navbar';