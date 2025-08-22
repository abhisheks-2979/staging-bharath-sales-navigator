import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Download, Users, Clock, MapPin, UserCheck, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface User {
  id: string;
  full_name: string;
  username: string;
}

interface AttendanceData {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
  status: string;
  check_in_location: any;
  check_out_location: any;
  check_in_address: string | null;
  check_out_address: string | null;
  profiles?: {
    full_name: string;
    username: string;
  } | null;
}

interface SummaryStats {
  totalPresent: number;
  totalAbsent: number;
  totalHalfDay: number;
  averageHours: number;
}

const LiveAttendanceMonitoring = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalPresent: 0,
    totalAbsent: 0,
    totalHalfDay: 0,
    averageHours: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchAttendanceData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('attendance-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance'
        },
        () => {
          fetchAttendanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [attendanceData, selectedUsers, searchQuery, dateFilter, startDateFilter, endDateFilter]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const fetchAttendanceData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:user_id (full_name, username)
        `)
        .gte('date', format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceData((data as any) || []);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...attendanceData];

    // Filter by selected users
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(record => selectedUsers.includes(record.user_id));
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(record =>
        record.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.profiles?.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by single date
    if (dateFilter) {
      filtered = filtered.filter(record => record.date === dateFilter);
    }

    // Filter by date range
    if (startDateFilter && endDateFilter) {
      filtered = filtered.filter(record => 
        record.date >= startDateFilter && record.date <= endDateFilter
      );
    }

    setFilteredData(filtered);
    calculateSummaryStats(filtered);
  };

  const calculateSummaryStats = (data: AttendanceData[]) => {
    const todaysData = data.filter(record => record.date === format(new Date(), 'yyyy-MM-dd'));
    
    const totalPresent = todaysData.filter(record => record.status === 'present').length;
    const totalAbsent = todaysData.filter(record => record.status === 'absent').length;
    const totalHalfDay = todaysData.filter(record => record.status === 'half-day').length;
    
    const totalHours = data.reduce((sum, record) => sum + (record.total_hours || 0), 0);
    const averageHours = data.length > 0 ? totalHours / data.length : 0;

    setSummaryStats({
      totalPresent,
      totalAbsent,
      totalHalfDay,
      averageHours
    });
  };

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    const filteredUsers = users.filter(user =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSelectedUsers(filteredUsers.map(user => user.id));
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  const getStatusIcon = (record: AttendanceData) => {
    const isToday = record.date === format(new Date(), 'yyyy-MM-dd');
    if (isToday) {
      if (record.check_in_time && !record.check_out_time) {
        return <span className="text-green-500">🟢</span>; // Online
      } else if (record.check_out_time) {
        return <span className="text-red-500">🔴</span>; // Offline
      }
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      present: { color: 'bg-green-100 text-green-800', label: 'Present' },
      absent: { color: 'bg-red-100 text-red-800', label: 'Absent' },
      'half-day': { color: 'bg-yellow-100 text-yellow-800', label: 'Half Day' }
    };

    const statusConfig = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <Badge className={statusConfig.color}>
        {statusConfig.label}
      </Badge>
    );
  };

  const formatLocation = (location: any, address: string | null) => {
    if (!location) return '--';
    
    const placeName = address || 'Unknown Location';
    const lat = location.latitude?.toFixed(4) || '0.0000';
    const lng = location.longitude?.toFixed(4) || '0.0000';
    
    return `${placeName} (${lat}, ${lng})`;
  };

  const exportData = () => {
    // Create CSV content
    const headers = ['Employee', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Location'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(record => [
        record.profiles?.full_name || 'Unknown',
        record.date,
        record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '--',
        record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '--',
        record.total_hours ? `${record.total_hours.toFixed(1)}h` : '--',
        record.status,
        formatLocation(record.check_in_location, record.check_in_address)
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Attendance data exported successfully!');
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summaryStats.totalPresent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summaryStats.totalAbsent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Half Day</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.totalHalfDay}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.averageHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Date Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Single Date</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value) {
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }
                }}
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  if (e.target.value) setDateFilter('');
                }}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  if (e.target.value) setDateFilter('');
                }}
              />
            </div>
          </div>

          {/* User Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Users ({selectedUsers.length} selected)</Label>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearSelection}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={user.id}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleUserSelection(user.id, checked as boolean)}
                  />
                  <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                    {user.full_name} ({user.username})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button onClick={exportData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Live Attendance Data</CardTitle>
          <CardDescription>
            Real-time attendance monitoring with status indicators
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
                  <TableHead>Status</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Attendance Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {getStatusIcon(record)}
                    </TableCell>
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
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm max-w-xs truncate">
                          {formatLocation(record.check_in_location, record.check_in_address)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {!isLoading && filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No attendance data found for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveAttendanceMonitoring;