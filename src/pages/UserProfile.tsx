import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Trophy, Award, TrendingUp, Users, Bell } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { CompactProfilePhoto } from '@/components/profile/CompactProfilePhoto';
import { BadgesDisplay } from '@/components/BadgesDisplay';
import { PointsDetailsModal } from '@/components/PointsDetailsModal';
import { PerformanceDashboard } from '@/components/profile/PerformanceDashboard';
import { InstagramSocialFeed } from '@/components/profile/InstagramSocialFeed';
import { PushContentConfigurator } from '@/components/profile/PushContentConfigurator';
import { ProfileAttachments } from '@/components/profile/ProfileAttachments';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Layout } from '@/components/Layout';

interface Manager {
  id: string;
  full_name: string;
}

const UserProfile = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone_number: '',
    recovery_email: '',
    email: '',
    monthly_salary: '',
    daily_da_allowance: '',
    manager_id: '',
    hq: '',
    date_of_joining: '',
    date_of_exit: '',
    alternate_email: '',
    address: '',
    education: '',
    emergency_contact_number: '',
    band: ''
  });

  useEffect(() => {
    if (userProfile && user) {
      fetchManagers();
      fetchEmployeeData();
      fetchTotalPoints();
    }
  }, [userProfile, user]);

  const fetchManagers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');

    if (data) {
      setManagers(data);
    }
  };

  const fetchEmployeeData = async () => {
    if (!user) return;

    const { data: employeeData } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (employeeData) {
      setFormData({
        username: userProfile?.username || '',
        full_name: userProfile?.full_name || '',
        phone_number: userProfile?.phone_number || '',
        recovery_email: userProfile?.recovery_email || '',
        email: user.email || '',
        monthly_salary: employeeData.monthly_salary?.toString() || '',
        daily_da_allowance: employeeData.daily_da_allowance?.toString() || '',
        manager_id: employeeData.manager_id || '',
        hq: employeeData.hq || '',
        date_of_joining: employeeData.date_of_joining || '',
        date_of_exit: employeeData.date_of_exit || '',
        alternate_email: employeeData.alternate_email || '',
        address: employeeData.address || '',
        education: employeeData.education || '',
        emergency_contact_number: employeeData.emergency_contact_number || '',
        band: employeeData.band?.toString() || ''
      });
    }
  };

  const fetchTotalPoints = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('gamification_points')
      .select('points')
      .eq('user_id', user.id);

    if (data) {
      const total = data.reduce((sum, record) => sum + (record.points || 0), 0);
      setTotalPoints(total);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          recovery_email: formData.recovery_email
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update employees table
      const { error: employeeError } = await supabase
        .from('employees')
        .upsert({
          user_id: user.id,
          monthly_salary: parseFloat(formData.monthly_salary) || 0,
          daily_da_allowance: parseFloat(formData.daily_da_allowance) || 0,
          manager_id: formData.manager_id || null,
          hq: formData.hq,
          date_of_joining: formData.date_of_joining || null,
          date_of_exit: formData.date_of_exit || null,
          alternate_email: formData.alternate_email,
          address: formData.address,
          education: formData.education,
          emergency_contact_number: formData.emergency_contact_number
        });

      if (employeeError) throw employeeError;

      toast({
        title: "Success",
        description: "Profile updated successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Layout>
      <div className="p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <User className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground">Manage your information and track performance</p>
            </div>
          </div>

        <Tabs defaultValue="about" className="space-y-4">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="about" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <TrendingUp className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <Trophy className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Points</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="push-content" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <Bell className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Push</span>
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <CompactProfilePhoto userId={user.id} userProfile={userProfile} />
                  <div className="flex-1">
                    <CardTitle className="text-xl">{userProfile?.full_name || 'User'}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formData.email}</p>
                    {formData.hq && (
                      <p className="text-sm text-muted-foreground">HQ: {formData.hq}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <h3 className="text-lg font-medium border-t pt-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Read Only)</Label>
                    <Input id="email" value={formData.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recovery_email">Recovery Email</Label>
                    <Input
                      id="recovery_email"
                      type="email"
                      value={formData.recovery_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, recovery_email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_number">Emergency Contact</Label>
                    <Input
                      id="emergency_contact_number"
                      value={formData.emergency_contact_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact_number: e.target.value }))}
                    />
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language Preference</Label>
                    <LanguageSelector />
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_salary">Monthly Salary (₹)</Label>
                    <Input
                      id="monthly_salary"
                      type="number"
                      value={formData.monthly_salary}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthly_salary: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="daily_da_allowance">Daily DA Allowance (₹)</Label>
                    <Input
                      id="daily_da_allowance"
                      type="number"
                      value={formData.daily_da_allowance}
                      onChange={(e) => setFormData(prev => ({ ...prev, daily_da_allowance: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manager_id">Manager (Reports To)</Label>
                    <Select 
                      value={formData.manager_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, manager_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hq">Headquarters (HQ)</Label>
                    <Input
                      id="hq"
                      value={formData.hq}
                      onChange={(e) => setFormData(prev => ({ ...prev, hq: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_joining">Date of Joining</Label>
                    <Input
                      id="date_of_joining"
                      type="date"
                      value={formData.date_of_joining}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_of_joining: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_exit">Date of Exit</Label>
                    <Input
                      id="date_of_exit"
                      type="date"
                      value={formData.date_of_exit}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_of_exit: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="band">Band</Label>
                    <Select 
                      value={formData.band} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, band: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select band" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-6">Additional Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alternate_email">Alternate Email</Label>
                    <Input
                      id="alternate_email"
                      type="email"
                      value={formData.alternate_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, alternate_email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="education">Education Background</Label>
                    <Textarea
                      id="education"
                      value={formData.education}
                      onChange={(e) => setFormData(prev => ({ ...prev, education: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>

                <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Profile
                </Button>
              </CardContent>
            </Card>

            <ProfileAttachments />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <PerformanceDashboard userId={user.id} />
          </TabsContent>

          {/* Gamification Tab */}
          <TabsContent value="gamification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Gamification Points
                  </span>
                  <Button onClick={() => setPointsModalOpen(true)} variant="outline" size="sm">
                    View Details
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{totalPoints}</div>
                  <p className="text-muted-foreground mt-2">Total Points Earned</p>
                </div>
              </CardContent>
            </Card>

            <BadgesDisplay />
          </TabsContent>

          {/* Social/Collaboration Tab */}
          <TabsContent value="social">
            <InstagramSocialFeed />
          </TabsContent>

          {/* Push Content Tab */}
          <TabsContent value="push-content">
            <PushContentConfigurator />
          </TabsContent>
        </Tabs>
        
        <PointsDetailsModal
          open={pointsModalOpen}
          onOpenChange={setPointsModalOpen}
          userId={user.id}
          timeFilter="month"
        />
      </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
