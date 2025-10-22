import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, FileText, Bell, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { BaselinePhotoManagement } from '@/components/BaselinePhotoManagement';

interface EmployeeData {
  monthly_salary: number;
  daily_da_allowance: number;
  manager_id: string;
  hq: string;
  date_of_joining: string;
  date_of_exit: string;
  alternate_email: string;
  address: string;
  education: string;
  emergency_contact_number: string;
}

interface ApprovalStatus {
  approval_level: number;
  status: string;
  approver_name: string;
  comments: string;
  approved_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const UserProfile = () => {
  const { user, userProfile, userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [approvals, setApprovals] = useState<ApprovalStatus[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    phone_number: '',
    recovery_email: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        username: userProfile.username || '',
        full_name: userProfile.full_name || '',
        phone_number: userProfile.phone_number || '',
        recovery_email: userProfile.recovery_email || ''
      });
      fetchEmployeeData();
      fetchApprovalStatus();
      fetchNotifications();
    }
  }, [userProfile]);

  const fetchEmployeeData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setEmployeeData(data);
    }
  };

  const fetchApprovalStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_approvals')
      .select(`
        approval_level,
        status,
        comments,
        approved_at,
        profiles!user_approvals_approver_id_fkey(full_name)
      `)
      .eq('user_id', user.id)
      .order('approval_level');

    if (!error && data) {
      setApprovals(data.map((item: any) => ({
        ...item,
        approver_name: item.profiles?.full_name || 'Unknown'
      })));
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setNotifications(data);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // For sensitive fields (phone, recovery email), use secure function
      if (profileData.phone_number !== user?.user_metadata?.phone_number || 
          profileData.recovery_email !== user?.user_metadata?.recovery_email) {
        const { data: success, error } = await supabase.rpc('update_security_info_secure', {
          new_hint_question: '',
          new_hint_answer: '',
          new_recovery_email: profileData.recovery_email,
          new_phone_number: profileData.phone_number
        });

        if (error || !success) {
          throw new Error('Failed to update sensitive information');
        }
      }

      // Update non-sensitive fields
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profileData.username,
          full_name: profileData.full_name
        })
        .eq('id', user.id);

      if (error) throw error;

      // Notify manager about profile changes
      if (employeeData?.manager_id) {
        await supabase.rpc('send_notification', {
          user_id_param: employeeData.manager_id,
          title_param: 'Profile Updated',
          message_param: `${profileData.full_name} has updated their profile information.`,
          type_param: 'profile_update'
        });
      }

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

  const markNotificationAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <User className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your personal information</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Approval Status
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="flex justify-center mb-6">
              <BaselinePhotoManagement userId={user.id} userProfile={userProfile} />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profileData.username}
                      onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      value={profileData.phone_number}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone_number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recovery_email">Recovery Email</Label>
                    <Input
                      id="recovery_email"
                      type="email"
                      value={profileData.recovery_email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, recovery_email: e.target.value }))}
                    />
                  </div>
                </div>

                {employeeData && (
                  <>
                    <h3 className="text-lg font-medium mt-6">Employment Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monthly Salary</Label>
                        <Input value={`₹${employeeData.monthly_salary}`} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Daily DA Allowance</Label>
                        <Input value={`₹${employeeData.daily_da_allowance}`} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Headquarters</Label>
                        <Input value={employeeData.hq || 'Not specified'} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Joining</Label>
                        <Input value={employeeData.date_of_joining || 'Not specified'} disabled />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Textarea value={employeeData.address || 'Not specified'} disabled rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Education Background</Label>
                        <Textarea value={employeeData.education || 'Not specified'} disabled rows={3} />
                      </div>
                    </div>
                  </>
                )}

                <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Approval Workflow Status</CardTitle>
              </CardHeader>
              <CardContent>
                {approvals.length > 0 ? (
                  <div className="space-y-4">
                    {approvals.map((approval) => (
                      <div key={approval.approval_level} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          {getApprovalStatusIcon(approval.status)}
                          <div>
                            <p className="font-medium">Level {approval.approval_level} Approval</p>
                            <p className="text-sm text-muted-foreground">Approver: {approval.approver_name}</p>
                            {approval.comments && (
                              <p className="text-sm text-muted-foreground mt-1">Comments: {approval.comments}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            approval.status === 'approved' ? 'default' :
                            approval.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {approval.status}
                          </Badge>
                          {approval.approved_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(approval.approved_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No approval workflow found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Notifications</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          notification.is_read ? 'bg-background' : 'bg-muted/50'
                        }`}
                        onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-2"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No notifications</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;