import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Layout } from '@/components/Layout';
import { CheckCircle, XCircle, Camera, MapPin, Clock, Plus, Filter, Navigation2, Route, CalendarDays, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import HolidayList from '@/components/HolidayList';
import LeaveApplicationModal from '@/components/LeaveApplicationModal';
import MyLeaveApplications from '@/components/MyLeaveApplications';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { JourneyMap } from '@/components/JourneyMap';
import { TimelineView } from '@/components/TimelineView';
import { cn } from '@/lib/utils';
import { useFaceMatching } from '@/hooks/useFaceMatching';
import { CameraCapture } from '@/components/CameraCapture';

const Attendance = () => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [todaysVisits, setTodaysVisits] = useState([]);
  const [activeMarketHours, setActiveMarketHours] = useState(null);
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
  const [selectedDateForMap, setSelectedDateForMap] = useState<Date | null>(null);
  const [selectedDateVisits, setSelectedDateVisits] = useState([]);
  const [gpsPositionsByDate, setGpsPositionsByDate] = useState<Map<string, any[]>>(new Map());
  const [showStopReasonDialog, setShowStopReasonDialog] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [attendanceType, setAttendanceType] = useState<'check-in' | 'check-out' | null>(null);
  const { compareImages, getMatchStatusIcon, getMatchStatusText } = useFaceMatching();

  // GPS Tracking for today
  const today = new Date();
  const { isTracking, positions, startTracking, stopTracking, isWithinWorkingHours } = useGPSTracking(userProfile?.id, today);

  // Load GPS positions for a specific date
  const loadGPSPositionsForDate = async (date: string) => {
    if (gpsPositionsByDate.has(date)) return gpsPositionsByDate.get(date);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('gps_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      const positions = data?.map((d) => ({
        latitude: parseFloat(d.latitude as unknown as string),
        longitude: parseFloat(d.longitude as unknown as string),
        accuracy: d.accuracy ? parseFloat(d.accuracy as unknown as string) : 0,
        timestamp: new Date(d.timestamp),
        speed: d.speed ? parseFloat(d.speed as unknown as string) : undefined,
        heading: d.heading ? parseFloat(d.heading as unknown as string) : undefined,
      })) || [];

      setGpsPositionsByDate(new Map(gpsPositionsByDate.set(date, positions)));
      return positions;
    } catch (error) {
      console.error('Error loading GPS positions:', error);
      return [];
    }
  };

  const handleStopTracking = async () => {
    // Check if stopping during working hours
    if (isWithinWorkingHours()) {
      setShowStopReasonDialog(true);
    } else {
      stopTracking();
    }
  };

  const confirmStopTracking = async () => {
    if (!stopReason) {
      toast({ title: 'Please select a reason', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('gps_tracking_stops').insert({
          user_id: user.id,
          reason: stopReason,
          date: format(new Date(), 'yyyy-MM-dd'),
        });
      }
      stopTracking();
      setShowStopReasonDialog(false);
      setStopReason('');
    } catch (error) {
      console.error('Error saving stop reason:', error);
      toast({ title: 'Failed to save stop reason', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchTodaysVisits();
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
        },
        { 
          enableHighAccuracy: true, // Use GPS for precise location
          timeout: 30000, // Wait up to 30 seconds
          maximumAge: 0 // Don't use cached location
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

  const fetchTodaysVisits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      // Fetch all visits for today with check-in times
      const { data: visits, error } = await supabase
        .from('visits')
        .select('id, check_in_time, check_in_location, retailer_id')
        .eq('user_id', user.id)
        .eq('planned_date', today)
        .not('check_in_time', 'is', null)
        .order('check_in_time', { ascending: true });

      if (error) throw error;

      setTodaysVisits(visits || []);

      // Calculate active market hours if we have visits
      if (visits && visits.length > 0) {
        const firstCheckIn = new Date(visits[0].check_in_time);
        const lastCheckIn = new Date(visits[visits.length - 1].check_in_time);
        const hoursWorked = (lastCheckIn.getTime() - firstCheckIn.getTime()) / (1000 * 60 * 60);
        setActiveMarketHours(hoursWorked);
      } else {
        setActiveMarketHours(null);
      }
    } catch (error) {
      console.error('Error fetching today\'s visits:', error);
    }
  };

  const handleCameraCapture = async (photoBlob: Blob) => {
    if (!attendanceType) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get user's profile picture for face verification
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', user.id)
        .single();

      if (!profile?.profile_picture_url) {
        toast({
          title: "Profile Picture Required",
          description: "Please upload your profile picture first in your profile settings.",
          variant: "destructive"
        });
        return;
      }

      // Get fresh high-accuracy location
      const freshLocation = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            reject(error);
          },
          { 
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
          }
        );
      });

      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();

      // Upload photo
      const photoPath = `attendance/${user.id}/${today}_${attendanceType}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(photoPath, photoBlob);

      if (uploadError) throw uploadError;

      // Get public URL for face matching
      const { data: urlData } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(photoPath);

      // Perform SERVER-SIDE face matching for security
      const { data: faceMatchResult, error: faceMatchError } = await supabase.functions.invoke(
        'verify-face-match',
        {
          body: {
            baselinePhotoUrl: profile.profile_picture_url,
            attendancePhotoUrl: urlData.publicUrl
          }
        }
      );

      if (faceMatchError) {
        console.error('Face verification error:', faceMatchError);
        toast({
          title: "Face Verification Failed",
          description: "Unable to verify your identity. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const confidence = faceMatchResult?.confidence || 0;
      const matchStatus = confidence >= 70 ? 'match' : confidence >= 40 ? 'partial' : 'nomatch';
      
      const statusMessage = confidence >= 70 
        ? 'Face Match Verified ✅' 
        : confidence >= 40 
        ? 'Partial Face Match ⚠️' 
        : 'Face Match Failed ❌';
      
      const statusVariant = confidence >= 70 ? 'default' : 'destructive';
      
      toast({
        title: statusMessage,
        description: `Match Confidence: ${Math.round(confidence)}%`,
        variant: statusVariant,
      });

      if (attendanceType === 'check-in') {
        // Mark attendance with face verification result
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert({
            user_id: user.id,
            date: today,
            check_in_time: timestamp,
            check_in_location: freshLocation,
            check_in_address: `${freshLocation.latitude}, ${freshLocation.longitude}`,
            check_in_photo_url: photoPath,
            status: 'present',
            face_verification_status: matchStatus,
            face_match_confidence: confidence
          });

        if (attendanceError) throw attendanceError;

        // Check in to all planned visits for today
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
                check_in_location: freshLocation,
                check_in_address: `${freshLocation.latitude}, ${freshLocation.longitude}`,
                check_in_photo_url: photoPath,
                location_match_in: true,
                status: 'in-progress'
              })
              .eq('id', visit.id);
          }
        }

        // Start GPS tracking immediately after check-in
        toast({
          title: "Success",
          description: "Day started successfully! GPS tracking is now active.",
        });
        
        setTimeout(() => {
          startTracking();
        }, 500);

      } else {
        // Update existing record with check-out
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: timestamp,
            check_out_location: freshLocation,
            check_out_address: `${freshLocation.latitude}, ${freshLocation.longitude}`,
            check_out_photo_url: photoPath,
            face_verification_status_out: matchStatus,
            face_match_confidence_out: confidence
          })
          .eq('user_id', user.id)
          .eq('date', today);

        if (updateError) throw updateError;

        // Stop GPS tracking after successful check-out
        stopTracking();

        toast({
          title: "Success",
          description: "Day ended successfully! Have a great evening! 🌙",
        });
      }
      
      // Refresh data
      await fetchAttendanceData();

    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: `Failed to mark ${attendanceType}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsMarkingAttendance(false);
      setAttendanceType(null);
    }
  };

  const markAttendance = async (type: 'check-in' | 'check-out') => {
    setIsMarkingAttendance(true);
    setAttendanceType(type);
    setShowCamera(true);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    return new Date(timeString).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const fetchVisitsForDate = async (date: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get visits with basic info
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('*')
        .eq('user_id', user.id)
        .eq('planned_date', date)
        .not('check_in_time', 'is', null)
        .order('check_in_time', { ascending: true });

      if (visitsError) throw visitsError;

      if (!visits || visits.length === 0) {
        setSelectedDateVisits([]);
        return;
      }

      // Get retailer names
      const retailerIds = visits.map(v => v.retailer_id).filter(Boolean);
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name')
        .in('id', retailerIds);

      const retailerMap = new Map(retailers?.map(r => [r.id, r.name]) || []);

      // Get orders
      const visitIds = visits.map(v => v.id);
      const { data: orders } = await supabase
        .from('orders')
        .select('visit_id, total_amount, id')
        .in('visit_id', visitIds);

      const orderMap = new Map(orders?.map(o => [o.visit_id, o]) || []);

      // Get order items
      const orderIds = orders?.map(o => o.id) || [];
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('order_id, quantity')
        .in('order_id', orderIds);

      const orderItemsMap = new Map<string, number>();
      orderItems?.forEach(item => {
        const current = orderItemsMap.get(item.order_id) || 0;
        orderItemsMap.set(item.order_id, current + item.quantity);
      });

      const formattedVisits = visits.map(visit => {
        const order = orderMap.get(visit.id);
        return {
          id: visit.id,
          retailer_name: retailerMap.get(visit.retailer_id) || 'Unknown',
          check_in_time: visit.check_in_time,
          check_out_time: visit.check_out_time,
          check_in_address: visit.check_in_address,
          status: visit.status,
          order_value: order?.total_amount || 0,
          order_quantity: order ? (orderItemsMap.get(order.id) || 0) : 0
        };
      });

      setSelectedDateVisits(formattedVisits);
    } catch (error) {
      console.error('Error fetching visits:', error);
    }
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

          {/* Start/End Day Buttons */}
            <div className="flex justify-center gap-4">
              {/* Show Start My Day only if not checked in yet */}
              {!todaysAttendance?.check_in_time && (
                <Button
                  onClick={() => markAttendance('check-in')}
                  disabled={isMarkingAttendance}
                  className="gap-2"
                  variant="default"
                >
                  <Camera className="h-4 w-4" />
                  {isMarkingAttendance ? 'Starting Day...' : 'Start My Day'}
                </Button>
              )}
              
              {/* Show End My Day only after day has started */}
              {todaysAttendance?.check_in_time && (
                <Button
                  onClick={() => markAttendance('check-out')}
                  disabled={isMarkingAttendance || todaysAttendance?.check_out_time}
                  variant={todaysAttendance?.check_out_time ? "outline" : "destructive"}
                  className="gap-2"
                >
                  {todaysAttendance?.check_out_time ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      Day Ended
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      {isMarkingAttendance ? 'Ending Day...' : 'End My Day'}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* GPS Tracking Info */}
            {todaysAttendance && !todaysAttendance.check_out_time && (
              <div className="flex justify-center items-center gap-2 text-sm text-muted-foreground">
                <Navigation2 className={cn("h-4 w-4", isTracking && "animate-pulse text-primary")} />
                <span>
                  {isTracking ? '🟢 GPS tracking active' : 'GPS tracking will start at 9 AM'}
                </span>
              </div>
            )}

            {/* Stop Reason Dialog */}
            <Dialog open={showStopReasonDialog} onOpenChange={setShowStopReasonDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Why are you stopping tracking?</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    {['Leave', 'Battery draining out', "Don't want to be tracked", 'Others'].map((reason) => (
                      <Button
                        key={reason}
                        variant={stopReason === reason ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setStopReason(reason)}
                      >
                        {reason}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowStopReasonDialog(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={confirmStopTracking}>
                      Confirm Stop
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

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

          {/* Market Hours Module */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Market Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* First Check In */}
                {todaysVisits.length > 0 ? (
                  <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-center">
                      <CheckCircle className="h-5 w-5 mx-auto mb-2 text-green-600" />
                      <div className="font-semibold text-green-800 dark:text-green-200 text-sm">First Check In</div>
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {formatTime(todaysVisits[0].check_in_time)}
                      </div>
                      {todaysVisits[0].check_in_location && (
                        <div className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {todaysVisits[0].check_in_location.latitude?.toFixed(4)}, {todaysVisits[0].check_in_location.longitude?.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <CheckCircle className="h-5 w-5 mx-auto mb-2" />
                      <div className="font-semibold text-sm">First Check In</div>
                      <div className="text-xs mt-1">No visits today</div>
                    </div>
                  </div>
                )}

                {/* Active Market Hours */}
                <div className={`p-4 rounded-lg border ${
                  activeMarketHours !== null 
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800' 
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="text-center">
                    <Clock className={`h-5 w-5 mx-auto mb-2 ${activeMarketHours !== null ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div className={`font-semibold text-sm ${activeMarketHours !== null ? 'text-blue-800 dark:text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                      Active Market Hours
                    </div>
                    <div className={`text-sm mt-1 ${activeMarketHours !== null ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {activeMarketHours !== null ? `${activeMarketHours.toFixed(1)} hrs` : '--:--'}
                    </div>
                  </div>
                </div>

                {/* Last Check In */}
                {todaysVisits.length > 0 ? (
                  <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-center">
                      <Clock className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                      <div className="font-semibold text-orange-800 dark:text-orange-200 text-sm">Last Check In</div>
                      <div className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        {formatTime(todaysVisits[todaysVisits.length - 1].check_in_time)}
                      </div>
                      {todaysVisits[todaysVisits.length - 1].check_in_location && (
                        <div className="text-xs text-orange-500 mt-1 flex items-center justify-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {todaysVisits[todaysVisits.length - 1].check_in_location.latitude?.toFixed(4)}, {todaysVisits[todaysVisits.length - 1].check_in_location.longitude?.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <Clock className="h-5 w-5 mx-auto mb-2" />
                      <div className="font-semibold text-sm">Last Check In</div>
                      <div className="text-xs mt-1">No visits today</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground text-center mt-4">
                Market hours are automatically tracked from your visit check-ins
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
                      attendanceData.slice(0, 15).map((record) => {
                        const recordDate = format(new Date(record.date), 'yyyy-MM-dd');
                        return (
                          <div 
                            key={record.id} 
                            className="flex flex-col gap-3 p-4 border rounded-lg hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {record.status === 'present' ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <div className="flex-1">
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
                                {record.face_match_confidence !== null && (
                                  <Badge 
                                    variant={
                                      record.face_match_confidence >= 70 ? 'default' : 
                                      record.face_match_confidence >= 40 ? 'secondary' : 
                                      'destructive'
                                    }
                                    className={cn(
                                      "ml-2",
                                      record.face_match_confidence >= 70 && "bg-green-500 hover:bg-green-600",
                                      record.face_match_confidence >= 40 && record.face_match_confidence < 70 && "bg-amber-500 hover:bg-amber-600"
                                    )}
                                  >
                                    {record.face_match_confidence >= 70 ? '✅' : 
                                     record.face_match_confidence >= 40 ? '⚠️' : '❌'}
                                    {' '}
                                    {Math.round(record.face_match_confidence)}%
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={async () => {
                                      setSelectedDateForMap(new Date(record.date));
                                      await loadGPSPositionsForDate(recordDate);
                                    }}
                                  >
                                    <Route className="h-4 w-4" />
                                    Travel Heat Map
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Journey Heat Map - {format(new Date(record.date), 'MMM dd, yyyy')}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    <JourneyMap 
                                      positions={gpsPositionsByDate.get(recordDate) || []} 
                                      height="500px"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    onClick={async () => {
                                      await fetchVisitsForDate(recordDate);
                                    }}
                                  >
                                    <CalendarDays className="h-4 w-4" />
                                    Timeline View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                                  <DialogHeader>
                                    <DialogTitle>
                                      Day Timeline - {format(new Date(record.date), 'MMM dd, yyyy')}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="mt-4">
                                    <TimelineView 
                                      visits={selectedDateVisits}
                                      dayStart={formatTime(record.check_in_time)}
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Button
                                size="sm"
                                variant={record.status === 'present' ? 'default' : 'destructive'}
                                className="gap-2"
                                onClick={() => navigate(`/today-summary?date=${recordDate}`)}
                              >
                                <FileText className="h-4 w-4" />
                                Productivity Report
                              </Button>
                            </div>
                          </div>
                        );
                      })
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

      {/* Camera Capture Component */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => {
          setShowCamera(false);
          setIsMarkingAttendance(false);
          setAttendanceType(null);
        }}
        onCapture={handleCameraCapture}
        title="Capture Photo for Attendance"
        description="Position yourself in the frame and capture your photo"
      />
    </Layout>
  );
};

export default Attendance;