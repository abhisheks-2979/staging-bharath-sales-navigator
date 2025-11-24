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
  Award,
  Download,
  Store,
  Navigation2
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useState, useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";

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
  const [monthlyStats, setMonthlyStats] = useState({
    newRetailers: 0,
    checkIns: 0,
    productiveVisits: "0%",
    revenue: "₹0"
  });
  const { isInstallable, installApp } = usePWAInstall();
  const { userProfile, user, userRole } = useAuth();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const refreshProfilePicture = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching profile picture:', error);
        return;
      }
      
      if (data?.profile_picture_url) {
        setProfilePictureUrl(data.profile_picture_url);
      }
    } catch (error) {
      console.error('Error in refreshProfilePicture:', error);
    }
  };

  useEffect(() => {
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    setCurrentQuote(randomQuote);
  }, []);

  // Fetch profile picture whenever user or userProfile changes
  useEffect(() => {
    if (user?.id) {
      refreshProfilePicture();
    }
  }, [user?.id, userProfile]);

  // Fetch monthly statistics when user profile is available
  useEffect(() => {
    if (userProfile?.id) {
      fetchMonthlyStats();
    }
  }, [userProfile?.id]);

  const fetchMonthlyStats = async () => {
    if (!userProfile?.id) return;

    try {
      // Get current month date range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Fetch new retailers count
      const { count: retailersCount } = await supabase
        .from('retailers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .gte('created_at', firstDay)
        .lte('created_at', `${lastDay}T23:59:59.999Z`);

      // Fetch check-ins count
      const { count: checkInsCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .not('check_in_time', 'is', null);

      // Fetch total visits and completed visits
      const { data: allVisits } = await supabase
        .from('visits')
        .select('status')
        .eq('user_id', userProfile.id)
        .gte('created_at', firstDay)
        .lte('created_at', `${lastDay}T23:59:59.999Z`);

      const totalVisits = allVisits?.length || 0;
      const completedVisits = allVisits?.filter(visit => visit.status === 'completed').length || 0;
      const productiveVisitsPercentage = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

      // Fetch revenue from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('user_id', userProfile.id)
        .gte('created_at', firstDay)
        .lte('created_at', `${lastDay}T23:59:59.999Z`);

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const formattedRevenue = totalRevenue >= 100000 
        ? `₹${(totalRevenue / 100000).toFixed(1)}L`
        : totalRevenue >= 1000 
        ? `₹${(totalRevenue / 1000).toFixed(1)}K`
        : `₹${totalRevenue}`;

      setMonthlyStats({
        newRetailers: retailersCount || 0,
        checkIns: checkInsCount || 0,
        productiveVisits: `${productiveVisitsPercentage}%`,
        revenue: formattedRevenue
      });

    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  type NavigationItem = {
    icon: any;
    label: string;
    href: string;
    color: string;
    isInstall?: boolean;
  };

  const navigationItems: NavigationItem[] = [
    { icon: UserCheck, label: "Attendance", href: "/attendance", color: "from-blue-500 to-blue-600" },
    { icon: Car, label: "My Visit", href: "/visits/retailers", color: "from-green-500 to-green-600" },
    { icon: Navigation2, label: "GPS Track", href: "/gps-track", color: "from-purple-500 to-purple-600" },
    { icon: Store, label: "All Retailers", href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
    { icon: MapPin, label: "Territories", href: "/territories-and-distributors", color: "from-amber-500 to-amber-600" },
    { icon: Users, label: "My Beats", href: "/my-beats", color: "from-orange-500 to-orange-600" },
    { icon: Briefcase, label: "Distributor Mapping", href: "/add-records", color: "from-red-500 to-red-600" },
    { icon: Gift, label: "Check Schemes", href: "/schemes", color: "from-pink-500 to-pink-600" },
    { icon: CreditCard, label: "My Expenses", href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    { icon: Trophy, label: "Leader board", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: BookOpen, label: "Sales Coach", href: "/sales-coach", color: "from-teal-500 to-teal-600" },
    { icon: Target, label: "Analytics", href: "/analytics", color: "from-violet-500 to-violet-600" },
  ];

  // Add install option if app is installable
  const allNavigationItems: NavigationItem[] = isInstallable 
    ? [...navigationItems, { 
        icon: Download, 
        label: "Install App", 
        href: "#", 
        color: "from-emerald-500 to-emerald-600",
        isInstall: true 
      }]
    : navigationItems;

  // Get user display name and initials with robust fallbacks
  const getEmailName = (email?: string | null) => {
    if (!email) return null;
    const base = email.split('@')[0] || '';
    if (!base) return null;
    return base.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const meta = (user?.user_metadata as any) || {};
  const metaName: string | null = meta.full_name || meta.name || meta.username || null;
  const displayName =
    (userProfile?.full_name && userProfile.full_name.trim()) ||
    (userProfile?.username && userProfile.username.trim()) ||
    (metaName && metaName.trim()) ||
    getEmailName(user?.email) ||
    'User';
  const userInitials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U';
  const roleDisplay = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Field Executive';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header Section with Welcome */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6 text-center">
            <p className="text-sm sm:text-base opacity-90 mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">{displayName}</h1>
            <p className="text-sm opacity-80 mb-4">{roleDisplay}</p>
            
            {user && (
              <div className="flex justify-center mb-4">
                <ProfilePictureUpload
                  userId={user.id}
                  currentPhotoUrl={profilePictureUrl || undefined}
                  fullName={displayName}
                  onPhotoUpdate={(newUrl) => {
                    setProfilePictureUrl(newUrl);
                    refreshProfilePicture();
                  }}
                  size="md"
                />
              </div>
            )}
            
            {/* Motivational Quote */}
            <div className="bg-primary-foreground/10 rounded-xl p-4 sm:p-5 backdrop-blur-sm border border-primary-foreground/20">
              <p className="text-sm sm:text-base font-medium italic leading-relaxed">"{currentQuote}"</p>
            </div>
          </div>
        </div>

        {/* This Month's Progress */}
        <div className="p-4 -mt-6 relative z-10">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
              <CardContent className="p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 mb-1">{monthlyStats.newRetailers}</div>
                <div className="text-[10px] sm:text-xs text-blue-700 font-medium leading-tight">New Retailers (Current Month)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
              <CardContent className="p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 mb-1">{monthlyStats.checkIns}</div>
                <div className="text-[10px] sm:text-xs text-green-700 font-medium leading-tight">Check-ins (This Month)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
              <CardContent className="p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 mb-1">{monthlyStats.productiveVisits}</div>
                <div className="text-[10px] sm:text-xs text-purple-700 font-medium leading-tight">Productive Visits (Current Month)</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
              <CardContent className="p-2 sm:p-3 text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600 mb-1">{monthlyStats.revenue}</div>
                <div className="text-[10px] sm:text-xs text-orange-700 font-medium leading-tight">Revenue (This Month)</div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Grid */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-center text-foreground mb-4">
              Start Your Day Right
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {allNavigationItems.map((item, index) => {
                if (item.isInstall) {
                  return (
                    <div 
                      key="install"
                      onClick={installApp}
                      className="group block cursor-pointer"
                    >
                      <div className="p-3 sm:p-4 text-center transition-all duration-300 hover:scale-105">
                        <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 mb-2 sm:mb-3 rounded-xl sm:rounded-2xl bg-gradient-to-r ${item.color} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                          <item.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white drop-shadow-sm" />
                        </div>
                        <h3 className="font-medium text-[10px] sm:text-xs text-foreground/80 group-hover:text-primary transition-colors leading-tight">
                          {item.label}
                        </h3>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <NavLink 
                    key={item.href} 
                    to={item.href}
                    className="group block"
                  >
                    <div className="p-3 sm:p-4 text-center transition-all duration-300 hover:scale-105">
                      <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 mb-2 sm:mb-3 rounded-xl sm:rounded-2xl bg-gradient-to-r ${item.color} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300 border border-white/20`}>
                        <item.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white drop-shadow-sm" />
                      </div>
                      <h3 className="font-medium text-[10px] sm:text-xs text-foreground/80 group-hover:text-primary transition-colors leading-tight">
                        {item.label}
                      </h3>
                    </div>
                  </NavLink>
                );
              })}
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

      {/* Profile Setup Modal for First Login */}
      {userProfile && (
        <ProfileSetupModal
          userId={userProfile.id}
          fullName={userProfile.full_name || ''}
          onComplete={refreshProfilePicture}
        />
      )}
    </Layout>
  );
};

export default Index;
