import { Store, Users, Trophy, BarChart, CreditCard, MapPin, Plus, ShoppingCart, TrendingUp } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { DashboardSkeleton } from "@/components/home/DashboardSkeleton";
import { CheckInStatusBanner } from "@/components/home/CheckInStatusBanner";
import { TodaysBeatCard } from "@/components/home/TodaysBeatCard";
import { UrgentAlertsSection } from "@/components/home/UrgentAlertsSection";
import { QuickNavGrid } from "@/components/home/QuickNavGrid";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { PerformanceCalendar } from "@/components/PerformanceCalendar";
import { WeeklySalesCharts } from "@/components/home/WeeklySalesCharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
            <div className="flex items-center gap-3">
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
              <div className="flex-1">
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
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => navigate('/retailers/add')}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">Add Retailer</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => navigate('/visits/retailers')}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span className="text-xs">Add Order</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => navigate('/competition')}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-xs">Add Competition</span>
                  </Button>
                </div>
              </Card>

              {/* Urgent Alerts */}
              <UrgentAlertsSection urgentItems={urgentItems} />

              {/* Weekly Sales Charts */}
              {userProfile?.id && <WeeklySalesCharts userId={userProfile.id} />}

              {/* Performance Calendar */}
              <PerformanceCalendar />

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
