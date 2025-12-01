import { Store, Users, Trophy, BarChart, CreditCard, MapPin, Plus, ShoppingCart, TrendingUp, MoreHorizontal } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { DashboardSkeleton } from "@/components/home/DashboardSkeleton";
import { CheckInStatusBanner } from "@/components/home/CheckInStatusBanner";
import { TodaysBeatCard } from "@/components/home/TodaysBeatCard";
import { QuickNavGrid } from "@/components/home/QuickNavGrid";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { PerformanceCalendar } from "@/components/PerformanceCalendar";
import { TomorrowBeatPlan } from "@/components/home/TomorrowBeatPlan";
import { WeekAISummary } from "@/components/home/WeekAISummary";
import { PendingPayments } from "@/components/home/PendingPayments";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Index = () => {
  const { userProfile, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { todayData, performance, urgentItems, isLoading, refresh } = useHomeDashboard(userProfile?.id, selectedDate);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const refreshProfilePicture = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', user.id)
        .single();
      
      if (data?.profile_picture_url) {
        setProfilePictureUrl(data.profile_picture_url);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      refreshProfilePicture();
    }
  }, [user?.id, userProfile]);

  // Pull-to-refresh simulation
  useEffect(() => {
    const handleRefresh = () => {
      if (window.scrollY === 0) {
        refresh();
      }
    };
    
    window.addEventListener('scroll', handleRefresh);
    return () => window.removeEventListener('scroll', handleRefresh);
  }, [refresh]);

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
  const roleDisplay = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Field Executive';

  const quickNavItems = [
    { icon: Store, label: "All Retailers", href: "/my-retailers", color: "from-emerald-500 to-emerald-600" },
    { icon: Users, label: "My Beats", href: "/my-beats", color: "from-orange-500 to-orange-600" },
    { icon: Trophy, label: "Leaderboard", href: "/leaderboard", color: "from-yellow-500 to-yellow-600" },
    { icon: BarChart, label: "Analytics", href: "/analytics", color: "from-violet-500 to-violet-600" },
    { icon: CreditCard, label: "Expenses", href: "/expenses", color: "from-indigo-500 to-indigo-600" },
    { icon: MapPin, label: "Territories", href: "/territories-and-distributors", color: "from-amber-500 to-amber-600" },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-hero text-primary-foreground" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-4">
            <div className="flex flex-col items-center gap-2 text-center">
              {user && (
                <ProfilePictureUpload
                  userId={user.id}
                  currentPhotoUrl={profilePictureUrl || undefined}
                  fullName={displayName}
                  onPhotoUpdate={(newUrl) => {
                    setProfilePictureUrl(newUrl);
                    refreshProfilePicture();
                  }}
                  size="sm"
                />
              )}
              <div>
                <p className="text-xs opacity-90">
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
                </p>
                <h1 className="text-xl font-bold">{displayName}</h1>
                <p className="text-xs opacity-80">{roleDisplay}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4 -mt-3 relative z-10 space-y-4">
          {isLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {/* Check-in Status */}
              <CheckInStatusBanner 
                attendance={todayData.attendance}
                onStartDay={() => navigate('/attendance')}
                onEndDay={() => navigate('/attendance')}
              />

              {/* Today's Beat */}
              <TodaysBeatCard 
                beatPlan={todayData.beatPlan}
                beatName={todayData.beatName}
                beatProgress={todayData.beatProgress}
                revenueTarget={todayData.revenueTarget}
                revenueAchieved={todayData.revenueAchieved}
                newRetailers={todayData.newRetailers}
                potentialRevenue={todayData.potentialRevenue}
                points={todayData.points}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />

              {/* Quick Actions */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <MoreHorizontal className="h-4 w-4 mr-2" />
                      Add New
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-[200px]">
                    <DropdownMenuItem onClick={() => navigate('/retailers/add')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Retailer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/visits/retailers')}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add Order
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/competition')}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Add Competition
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>

              {/* Pending Payments - Real-time */}
              {userProfile?.id && <PendingPayments userId={userProfile.id} />}

              {/* Tomorrow's Beat Plan */}
              {userProfile?.id && <TomorrowBeatPlan userId={userProfile.id} />}

              {/* Week AI Summaries - Enhanced prominence */}
              {userProfile?.id && (
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-xl p-5 border-2 border-primary/20 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h2 className="text-xl font-bold">AI Weekly Insights</h2>
                    <Badge variant="secondary" className="ml-auto">Your USP</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <WeekAISummary userId={userProfile.id} weekType="current" />
                    <WeekAISummary userId={userProfile.id} weekType="next" />
                  </div>
                </div>
              )}

              {/* Performance Calendar */}
              {userProfile?.id && <PerformanceCalendar />}

              {/* Quick Navigation */}
              <QuickNavGrid items={quickNavItems} />
            </>
          )}
        </div>
      </div>

      {/* Profile Setup Modal */}
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
