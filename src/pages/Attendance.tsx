import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout } from '@/components/Layout';
import { CheckCircle, XCircle, Camera, MapPin, Clock, Plus, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import HolidayList from '@/components/HolidayList';
import LeaveApplicationModal from '@/components/LeaveApplicationModal';
import MyLeaveApplications from '@/components/MyLeaveApplications';

const Attendance = () => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [stats, setStats] = useState({
    totalDays: 20,
    presentDays: 0,
    absentDays: 0,
    attendance: 0
  });
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null);
  const [dateFilter, setDateFilter] = useState('current-month');
  const [leaveRefreshTrigger, setLeaveRefreshTrigger] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchAttendanceData();
    getCurrentLocation();
  }, [dateFilter]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enable GPS.",
            variant: "destructive"
          });
        }
      );
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter) {
      case 'current-week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'current-month':
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
    }

    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  };

  const fetchAttendanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { start, end } = getDateRange();

      // Fetch attendance records for selected period
      const { data: attendanceRecords, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (error) throw error;

      const presentDays = attendanceRecords?.filter(record => record.status === 'present').length || 0;
      // Calculate working days based on filter
      let totalWorkingDays = 20; // Default for month
      if (dateFilter === 'current-week') {
        totalWorkingDays = 5; // 5 working days in a week
      }
      const absentDays = Math.max(0, totalWorkingDays - presentDays);
      const attendancePercentage = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

      setStats({
        totalDays: totalWorkingDays,
        presentDays,
        absentDays,
        attendance: attendancePercentage
      });

      setAttendanceData(attendanceRecords || []);

      // Check today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = attendanceRecords?.find(record => record.date === today);
      setTodaysAttendance(todayRecord);

    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch attendance data",
        variant: "destructive"
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = (): Promise<Blob | null> => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
      });
    }
    return Promise.resolve(null);
  };

  const markAttendance = async (type: 'check-in' | 'check-out') => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable location services to mark attendance.",
        variant: "destructive"
      });
      return;
    }

    setIsMarkingAttendance(true);
    
    try {
      await startCamera();
      
      // Give user time to position for photo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const photoBlob = await capturePhoto();
      
      if (!photoBlob) {
        throw new Error('Failed to capture photo');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      // Upload photo
      const photoPath = `attendance/${user.id}/${today}_${type}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(photoPath, photoBlob as Blob);

      if (uploadError) throw uploadError;

      if (type === 'check-in') {
        // Mark attendance
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert({
            user_id: user.id,
            date: today,
            check_in_time: timestamp,
            check_in_location: location,
            check_in_address: `${location.latitude}, ${location.longitude}`,
            check_in_photo_url: photoPath,
            status: 'present'
          });

        if (attendanceError) throw attendanceError;

        // Also check in to all planned visits for today
        const { data: plannedVisits } = await supabase
          .from('visits')
          .select('id')
          .eq('user_id', user.id)
          .eq('planned_date', today)
          .is('check_in_time', null);

        if (plannedVisits && plannedVisits.length > 0) {
          for (const visit of plannedVisits) {
            await supabase
              .from('visits')
              .update({
                check_in_time: timestamp,
                check_in_location: location,
                check_in_address: `${location.latitude}, ${location.longitude}`,
                check_in_photo_url: photoPath,
                location_match_in: true,
                status: 'in-progress'
              })
              .eq('id', visit.id);
          }
        }
      } else {
        // Update existing record with check-out
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: timestamp,
            check_out_location: location,
            check_out_address: `${location.latitude}, ${location.longitude}`,
            check_out_photo_url: photoPath
          })
          .eq('user_id', user.id)
          .eq('date', today);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: `${type === 'check-in' ? 'Check-in' : 'Check-out'} recorded successfully!${type === 'check-in' ? ' All planned visits marked as checked in.' : ''}`,
      });

      // Stop camera
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      setShowCamera(false);
      
      // Refresh data
      await fetchAttendanceData();

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: `Failed to mark ${type}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Stats */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground">Track your daily attendance and working hours</p>
            
            {/* Main Stats */}
            <div className="flex justify-center items-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{stats.attendance}%</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{stats.presentDays}/20</div>
                <div className="text-sm text-muted-foreground">Present Days</div>
              </div>
            </div>

            {/* Present/Absent Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.presentDays}</div>
                  <div className="text-sm text-green-600 dark:text-green-400">Present Days</div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
                <CardContent className="p-4 text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.absentDays}</div>
                  <div className="text-sm text-red-600 dark:text-red-400">Absent Days</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mark Attendance Module */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Mark Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCamera && (
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-64 h-48 rounded-lg border"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {!todaysAttendance ? (
                  <Button
                    onClick={() => markAttendance('check-in')}
                    disabled={isMarkingAttendance}
                    className="bg-green-600 hover:bg-green-700 text-white p-6 h-auto"
                  >
                    <div className="text-center">
                      <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Day Started ✓</div>
                      {todaysAttendance?.check_in_time && (
                        <div className="text-sm mt-1">
                          ✅ Checked in at {formatTime(todaysAttendance.check_in_time)}
                        </div>
                      )}
                    </div>
                  </Button>
                ) : (
                  <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-center">
                      <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="font-semibold text-green-800 dark:text-green-200">Day Started ✓</div>
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ✅ Checked in at {formatTime(todaysAttendance.check_in_time)}
                      </div>
                      {location && (
                        <div className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {todaysAttendance && !todaysAttendance.check_out_time ? (
                  <Button
                    onClick={() => markAttendance('check-out')}
                    disabled={isMarkingAttendance}
                    className="bg-orange-600 hover:bg-orange-700 text-white p-6 h-auto"
                  >
                    <div className="text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Day Ended ✓</div>
                    </div>
                  </Button>
                ) : todaysAttendance?.check_out_time ? (
                  <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-center">
                      <Clock className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="font-semibold text-green-800 dark:text-green-200">Day Ended ✓</div>
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ✅ Checked out at {formatTime(todaysAttendance.check_out_time)}
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        Total Hours: {todaysAttendance.total_hours ? `${todaysAttendance.total_hours.toFixed(1)} hrs` : '0.1 hrs'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg border">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      <div className="font-semibold">Check In First</div>
                      <div className="text-sm">Mark your check-in to enable check-out</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different sections */}
          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendance">My Attendance</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="holiday">Holiday</TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Attendance</CardTitle>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-week">This Week</SelectItem>
                        <SelectItem value="current-month">This Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attendanceData.length > 0 ? (
                      attendanceData.slice(0, 15).map((record) => (
                        <div 
                          key={record.id} 
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const recordDate = format(new Date(record.date), 'yyyy-MM-dd');
                            navigate(`/today-summary?date=${recordDate}`);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {record.status === 'present' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            <div>
                              <div className="font-medium">
                                {format(new Date(record.date), 'EEE, MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                In: {formatTime(record.check_in_time)} | Out: {formatTime(record.check_out_time)}
                              </div>
                              {record.total_hours && (
                                <div className="text-xs text-blue-600">
                                  Total: {record.total_hours.toFixed(1)} hours
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status === 'present' ? 'Productivity Report' : record.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>No attendance records found for the selected period</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leave">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Leave Management</CardTitle>
                    <LeaveApplicationModal 
                      onApplicationSubmitted={() => setLeaveRefreshTrigger(prev => prev + 1)}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Apply for leave and track your applications below.
                    </div>
                  </CardContent>
                </Card>
                
                <MyLeaveApplications refreshTrigger={leaveRefreshTrigger} />
              </div>
            </TabsContent>

            <TabsContent value="holiday">
              <HolidayList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;