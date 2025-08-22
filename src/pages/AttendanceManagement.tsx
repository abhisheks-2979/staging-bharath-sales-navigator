
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Clock, User, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import LiveAttendanceMonitoring from '@/components/LiveAttendanceMonitoring';

interface LeaveApplication {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  applied_date: string;
  profiles?: {
    full_name: string;
    username: string;
  };
  leave_types?: {
    name: string;
  };
}

interface RegularizationRequest {
  id: string;
  user_id: string;
  attendance_date: string;
  current_check_in_time: string | null;
  current_check_out_time: string | null;
  requested_check_in_time: string | null;
  requested_check_out_time: string | null;
  reason: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
}

const AttendanceManagement = () => {
  const [activeTab, setActiveTab] = useState('live');
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'leave') {
      fetchLeaveApplications();
    } else if (activeTab === 'regularization') {
      fetchRegularizationRequests();
    }
  }, [activeTab]);

  const fetchLeaveApplications = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .order('applied_date', { ascending: false });

      if (error) throw error;

      // Fetch profiles and leave types separately
      const userIds = [...new Set(data?.map(app => app.user_id) || [])];
      const leaveTypeIds = [...new Set(data?.map(app => app.leave_type_id) || [])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      const { data: leaveTypes } = await supabase
        .from('leave_types')
        .select('id, name')
        .in('id', leaveTypeIds);

      // Join the data manually
      const enrichedData = data?.map(app => ({
        ...app,
        profiles: profiles?.find(p => p.id === app.user_id),
        leave_types: leaveTypes?.find(lt => lt.id === app.leave_type_id)
      })) || [];

      setLeaveApplications(enrichedData);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
      toast.error('Failed to fetch leave applications');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegularizationRequests = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('regularization_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map(req => req.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', userIds);

      // Join the data manually
      const enrichedData = data?.map(req => ({
        ...req,
        profiles: profiles?.find(p => p.id === req.user_id)
      })) || [];

      setRegularizationRequests(enrichedData);
    } catch (error) {
      console.error('Error fetching regularization requests:', error);
      toast.error('Failed to fetch regularization requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        approved_date: newStatus === 'approved' ? new Date().toISOString() : null
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateData.approved_by = user.id;
      }

      const { error } = await supabase
        .from('leave_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Leave application ${newStatus} successfully`);
      fetchLeaveApplications();
    } catch (error) {
      console.error('Error updating leave application:', error);
      toast.error('Failed to update leave application');
    }
  };

  const handleRegularizationStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        approved_at: newStatus === 'approved' ? new Date().toISOString() : null
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateData.approved_by = user.id;
      }

      const { error } = await supabase
        .from('regularization_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast.success(`Regularization request ${newStatus} successfully`);
      fetchRegularizationRequests();
    } catch (error) {
      console.error('Error updating regularization request:', error);
      toast.error('Failed to update regularization request');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const statusConfig = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('live')}
          className={`py-2 px-4 border-b-2 transition-colors ${
            activeTab === 'live'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Live Monitoring
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`py-2 px-4 border-b-2 transition-colors ${
            activeTab === 'leave'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Leave Management
        </button>
        <button
          onClick={() => setActiveTab('regularization')}
          className={`py-2 px-4 border-b-2 transition-colors ${
            activeTab === 'regularization'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Regularization Requests
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && <LiveAttendanceMonitoring />}

      {activeTab === 'leave' && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Applications Management</CardTitle>
            <CardDescription>
              Review and manage employee leave requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Applied Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">
                        {application.profiles?.full_name || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        {application.leave_types?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(application.start_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(application.end_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {application.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(application.applied_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(application.status)}
                      </TableCell>
                      <TableCell>
                        {application.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleLeaveStatusUpdate(application.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleLeaveStatusUpdate(application.id, 'rejected')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && leaveApplications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No leave applications found.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'regularization' && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Regularization Requests</CardTitle>
            <CardDescription>
              Review and approve attendance regularization requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Current In/Out</TableHead>
                    <TableHead>Requested In/Out</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regularizationRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.profiles?.full_name || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.attendance_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>In: {request.current_check_in_time ? format(new Date(request.current_check_in_time), 'HH:mm') : '--'}</div>
                          <div>Out: {request.current_check_out_time ? format(new Date(request.current_check_out_time), 'HH:mm') : '--'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>In: {request.requested_check_in_time ? format(new Date(request.requested_check_in_time), 'HH:mm') : '--'}</div>
                          <div>Out: {request.requested_check_out_time ? format(new Date(request.requested_check_out_time), 'HH:mm') : '--'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate">
                          {request.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRegularizationStatusUpdate(request.id, 'approved')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRegularizationStatusUpdate(request.id, 'rejected')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!isLoading && regularizationRequests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pending regularization requests found.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceManagement;
