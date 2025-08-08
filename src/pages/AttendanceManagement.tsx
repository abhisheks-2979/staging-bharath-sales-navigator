import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, CheckCircle, XCircle, Edit, User, Calendar, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import HolidayManagement from '@/components/HolidayManagement';

interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
  status: string;
  check_in_location: any;
  check_out_location: any;
  profiles?: {
    full_name: string;
    username: string;
  } | null;
}

interface LeaveApplication {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  applied_date: string;
  leave_types?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
    username: string;
  } | null;
}

interface UserLeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  opening_balance: number;
  used_balance: number;
  year: number;
  leave_types?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
    username: string;
  } | null;
}

const AttendanceManagement = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<UserLeaveBalance[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserData, setSelectedUserData] = useState<any>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState<any>(null);
  const [newBalance, setNewBalance] = useState('');

  useEffect(() => {
    if (userRole === 'admin') {
      fetchAttendanceRecords();
      fetchLeaveApplications();
      fetchLeaveBalances();
      
      // Set up real-time subscriptions
      const attendanceChannel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance'
          },
          () => fetchAttendanceRecords()
        )
        .subscribe();

      const leaveChannel = supabase
        .channel('leave-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leave_applications'
          },
          () => fetchLeaveApplications()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(attendanceChannel);
        supabase.removeChannel(leaveChannel);
      };
    }
  }, [userRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchAttendanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:user_id (full_name, username)
        `)
        .gte('date', format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceRecords((data as any) || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to fetch attendance records');
    }
  };

  const fetchLeaveApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types:leave_type_id (name),
          profiles:user_id (full_name, username)
        `)
        .gte('start_date', `${new Date().getFullYear()}-01-01`)
        .order('applied_date', { ascending: false });

      if (error) throw error;
      setLeaveApplications((data as any) || []);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      toast.error('Failed to fetch leave applications');
    }
  };

  const fetchLeaveBalances = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_balance')
        .select(`
          *,
          leave_types:leave_type_id (name),
          profiles:user_id (full_name, username)
        `)
        .eq('year', new Date().getFullYear())
        .order('user_id');

      if (error) throw error;
      setLeaveBalances((data as any) || []);
    } catch (error) {
      console.error('Error fetching leave balances:', error);
      toast.error('Failed to fetch leave balances');
    }
  };

  const handleLeaveAction = async (applicationId: string, action: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      const updateData: any = { status: action };
      if (action === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      if (action === 'approved') {
        updateData.approved_date = new Date().toISOString();
        updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { error } = await supabase
        .from('leave_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Leave application ${action} successfully`);
      fetchLeaveApplications();
      fetchLeaveBalances(); // Refresh balances as they might be updated by trigger
    } catch (error) {
      console.error('Error updating leave application:', error);
      toast.error('Failed to update leave application');
    }
  };

  const openUserDialog = (userId: string) => {
    const userAttendance = attendanceRecords.filter(record => record.user_id === userId);
    const userLeaves = leaveApplications.filter(app => app.user_id === userId);
    const userBalances = leaveBalances.filter(balance => balance.user_id === userId);
    
    setSelectedUser(userId);
    setSelectedUserData({
      attendance: userAttendance,
      leaves: userLeaves,
      balances: userBalances,
      profile: userAttendance[0]?.profiles || userLeaves[0]?.profiles || userBalances[0]?.profiles
    });
    setIsUserDialogOpen(true);
  };

  const updateLeaveBalance = async () => {
    if (!editingBalance || !newBalance) return;

    try {
      const { error } = await supabase
        .from('leave_balance')
        .update({ opening_balance: parseInt(newBalance) })
        .eq('id', editingBalance.id);

      if (error) throw error;

      toast.success('Leave balance updated successfully');
      setEditingBalance(null);
      setNewBalance('');
      fetchLeaveBalances();
      
      // Update the dialog data if it's open
      if (selectedUser === editingBalance.user_id) {
        const userBalances = leaveBalances.filter(balance => balance.user_id === selectedUser);
        setSelectedUserData(prev => ({ ...prev, balances: userBalances }));
      }
    } catch (error) {
      console.error('Error updating leave balance:', error);
      toast.error('Failed to update leave balance');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { color: 'bg-green-100 text-green-800', label: 'Present' },
      absent: { color: 'bg-red-100 text-red-800', label: 'Absent' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/admin-controls')} 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance Management</h1>
            <p className="text-muted-foreground">Monitor attendance, manage leaves, and configure holidays</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Live Attendance
            </TabsTrigger>
            <TabsTrigger value="leaves" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Leave Management
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Leave Balances
            </TabsTrigger>
            <TabsTrigger value="holidays" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Holidays
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Live Attendance Monitoring</CardTitle>
                <CardDescription>
                  Real-time view of all user attendance with check-in/check-out times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.profiles?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(record.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {record.check_in_time 
                              ? format(new Date(record.check_in_time), 'HH:mm')
                              : '--'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {record.check_out_time 
                              ? format(new Date(record.check_out_time), 'HH:mm')
                              : '--'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '--'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell>
                          {record.check_in_location && 
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {record.check_in_location.latitude?.toFixed(4)}, 
                                {record.check_in_location.longitude?.toFixed(4)}
                              </span>
                            </div>
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUserDialog(record.user_id)}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaves">
            <Card>
              <CardHeader>
                <CardTitle>Leave Applications</CardTitle>
                <CardDescription>
                  Review and approve/reject leave applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveApplications.map((application) => {
                      const startDate = new Date(application.start_date);
                      const endDate = new Date(application.end_date);
                      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      
                      return (
                        <TableRow key={application.id}>
                          <TableCell className="font-medium">
                            {application.profiles?.full_name || 'Unknown User'}
                          </TableCell>
                          <TableCell>{application.leave_types?.name}</TableCell>
                          <TableCell>{format(startDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{format(endDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{days} day{days !== 1 ? 's' : ''}</TableCell>
                          <TableCell className="max-w-xs truncate">{application.reason}</TableCell>
                          <TableCell>{getStatusBadge(application.status)}</TableCell>
                          <TableCell>
                            {application.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleLeaveAction(application.id, 'approved')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleLeaveAction(application.id, 'rejected', 'Rejected by admin')}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Leave Balances</CardTitle>
                <CardDescription>
                  Manage leave balances for all employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Opening Balance</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveBalances.map((balance) => (
                      <TableRow key={balance.id}>
                        <TableCell className="font-medium">
                          {balance.profiles?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>{balance.leave_types?.name}</TableCell>
                        <TableCell>
                          {editingBalance?.id === balance.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                className="w-20"
                              />
                              <Button size="sm" onClick={updateLeaveBalance}>
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setEditingBalance(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            balance.opening_balance
                          )}
                        </TableCell>
                        <TableCell>{balance.used_balance}</TableCell>
                        <TableCell>{balance.opening_balance - balance.used_balance}</TableCell>
                        <TableCell>
                          {editingBalance?.id !== balance.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingBalance(balance);
                                setNewBalance(balance.opening_balance.toString());
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holidays">
            <HolidayManagement />
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details - {selectedUserData?.profile?.full_name}</DialogTitle>
              <DialogDescription>
                Complete attendance and leave information
              </DialogDescription>
            </DialogHeader>
            
            {selectedUserData && (
              <div className="space-y-6">
                <Tabs defaultValue="attendance-details">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="attendance-details">Attendance</TabsTrigger>
                    <TabsTrigger value="leave-applications">Leave Applications</TabsTrigger>
                    <TabsTrigger value="leave-balances">Leave Balances</TabsTrigger>
                  </TabsList>

                  <TabsContent value="attendance-details">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserData.attendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              {record.check_in_time 
                                ? format(new Date(record.check_in_time), 'HH:mm')
                                : '--'
                              }
                            </TableCell>
                            <TableCell>
                              {record.check_out_time 
                                ? format(new Date(record.check_out_time), 'HH:mm')
                                : '--'
                              }
                            </TableCell>
                            <TableCell>
                              {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '--'}
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="leave-applications">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserData.leaves.map((leave) => (
                          <TableRow key={leave.id}>
                            <TableCell>{leave.leave_types?.name}</TableCell>
                            <TableCell>{format(new Date(leave.start_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{format(new Date(leave.end_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                            <TableCell>{getStatusBadge(leave.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="leave-balances">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Opening Balance</TableHead>
                          <TableHead>Used</TableHead>
                          <TableHead>Available</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedUserData.balances.map((balance) => (
                          <TableRow key={balance.id}>
                            <TableCell>{balance.leave_types?.name}</TableCell>
                            <TableCell>{balance.opening_balance}</TableCell>
                            <TableCell>{balance.used_balance}</TableCell>
                            <TableCell>{balance.opening_balance - balance.used_balance}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AttendanceManagement;