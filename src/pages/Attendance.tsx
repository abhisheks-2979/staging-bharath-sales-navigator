import { Calendar, Clock, MapPin, ArrowLeft, CheckCircle, XCircle, CalendarDays, Camera, Plus, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allAttendanceData, setAllAttendanceData] = useState([]);
  const [absentDaysData, setAbsentDaysData] = useState([]);

  // Leave application form state
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [detailsType, setDetailsType] = useState('present');

  const stats = {
    totalDays: 20,
    presentDays: allAttendanceData.length,
    absentDays: absentDaysData.length,
    avgCheckIn: "09:12 AM",
    attendance: Math.round((allAttendanceData.length / 20) * 100)
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchAllAttendanceData();
    fetchAbsentDaysData();
    fetchLeaveTypes();
    fetchLeaveBalance();
    fetchLeaveApplications();
    getCurrentLocation();
  }, []);

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

  const fetchAttendanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: attendanceRecords, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching attendance:', error);
        return;
      }

      // Format data for display
      const formattedData = attendanceRecords?.map(record => ({
        date: record.date,
        status: record.status,
        checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '-',
        checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '-',
        totalHours: record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-',
        location: record.check_in_location && typeof record.check_in_location === 'object' && 'latitude' in record.check_in_location && 'longitude' in record.check_in_location 
          ? `${(record.check_in_location as any).latitude?.toFixed(4)}, ${(record.check_in_location as any).longitude?.toFixed(4)}` 
          : '-'
      })) || [];

      setAttendanceData(formattedData);
      
      // Check today's attendance
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = attendanceRecords?.find(record => record.date === today);
      setTodaysAttendance(todayRecord);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const fetchAllAttendanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`;

      const { data: attendanceRecords, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .eq('status', 'present')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching all attendance:', error);
        return;
      }

      const formattedData = attendanceRecords?.map(record => ({
        ...record,
        checkIn: record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '--',
        checkOut: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '--',
        totalHours: record.total_hours ? `${record.total_hours.toFixed(1)}h` : '--'
      })) || [];

      setAllAttendanceData(formattedData);
    } catch (error) {
      console.error('Error fetching all attendance data:', error);
    }
  };

  const fetchAbsentDaysData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: applications, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types:leave_type_id (name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching absent days:', error);
        return;
      }

      const absentDays = [];
      applications?.forEach(app => {
        const startDate = new Date(app.start_date);
        const endDate = new Date(app.end_date);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          absentDays.push({
            date: d.toISOString().split('T')[0],
            reason: app.reason,
            leaveType: app.leave_types?.name || 'Unknown'
          });
        }
      });

      setAbsentDaysData(absentDays);
    } catch (error) {
      console.error('Error fetching absent days data:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const { data: leaveTypes, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching leave types:', error);
        return;
      }

      setLeaveTypes(leaveTypes || []);
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const fetchLeaveBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: leaveBalance, error } = await supabase
        .from('leave_balance')
        .select(`
          *,
          leave_types:leave_type_id (name)
        `)
        .eq('user_id', user.id)
        .eq('year', new Date().getFullYear());

      if (error) {
        console.error('Error fetching leave balance:', error);
        return;
      }

      setLeaveBalance(leaveBalance || []);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
    }
  };

  const fetchLeaveApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: applications, error } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types:leave_type_id (name)
        `)
        .eq('user_id', user.id)
        .gte('start_date', `${new Date().getFullYear()}-01-01`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave applications:', error);
        return;
      }

      setLeaveApplications(applications || []);
    } catch (error) {
      console.error('Error fetching leave applications:', error);
    }
  };

  const getLeaveStatistics = (leaveTypeId) => {
    const balance = leaveBalance.find(b => b.leave_type_id === leaveTypeId);
    const applications = leaveApplications.filter(app => app.leave_type_id === leaveTypeId);
    
    const approvedLeaves = applications
      .filter(app => app.status === 'approved')
      .reduce((total, app) => {
        const startDate = new Date(app.start_date);
        const endDate = new Date(app.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

    const pendingLeaves = applications
      .filter(app => app.status === 'pending')
      .reduce((total, app) => {
        const startDate = new Date(app.start_date);
        const endDate = new Date(app.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

    const openingBalance = balance?.opening_balance || 0;
    const usedBalance = balance?.used_balance || 0;
    const availableLeaves = openingBalance - usedBalance - pendingLeaves;

    return {
      available: Math.max(0, availableLeaves),
      pending: pendingLeaves,
      booked: usedBalance
    };
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        setCapturedPhoto(blob);
        setShowCamera(false);
        
        // Stop camera stream
        const stream = video.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const markAttendance = async (type = 'check_in') => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable GPS to mark attendance.",
        variant: "destructive"
      });
      return;
    }

    if (!capturedPhoto) {
      toast({
        title: "Photo Required",
        description: "Please capture a photo to mark attendance.",
        variant: "destructive"
      });
      return;
    }

    setIsMarkingAttendance(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload photo to storage
      const photoFileName = `${user.id}/${Date.now()}_${type}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(photoFileName, capturedPhoto, {
          contentType: 'image/jpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        throw uploadError;
      }

      const photoUrl = `attendance-photos/${photoFileName}`;
      const currentTime = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];

      if (type === 'check_in') {
        // Check if attendance record exists for today
        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (existingRecord) {
          // Update existing record with check-in
          const { error: updateError } = await supabase
            .from('attendance')
            .update({
              check_in_time: currentTime,
              check_in_photo_url: photoUrl,
              check_in_location: location,
              status: 'present'
            })
            .eq('id', existingRecord.id);

          if (updateError) throw updateError;
        } else {
          // Create new attendance record
          const { error: insertError } = await supabase
            .from('attendance')
            .insert({
              user_id: user.id,
              date: today,
              check_in_time: currentTime,
              check_in_photo_url: photoUrl,
              check_in_location: location,
              status: 'present'
            });

          if (insertError) throw insertError;
        }
      } else if (type === 'check_out') {
        // Update existing record with check-out
        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (!existingRecord) {
          throw new Error('No check-in record found for today. Please check in first.');
        }

        // Calculate total hours if check-in time exists
        let totalHours = null;
        if (existingRecord.check_in_time) {
          const checkInTime = new Date(existingRecord.check_in_time);
          const checkOutTime = new Date(currentTime);
          totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60); // Convert to hours
        }

        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: currentTime,
            check_out_photo_url: photoUrl,
            check_out_location: location,
            total_hours: totalHours
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Success",
        description: `${type === 'check_in' ? 'Check-in' : 'Check-out'} marked successfully!`,
      });

      setCapturedPhoto(null);
      await fetchAttendanceData();
      await fetchAllAttendanceData();
      await fetchAbsentDaysData();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const applyLeave = async () => {
    if (!leaveForm.leaveTypeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Calculate leave days
    const startDate = new Date(leaveForm.startDate);
    const endDate = new Date(leaveForm.endDate);
    const leaveDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check available leave balance
    const stats = getLeaveStatistics(leaveForm.leaveTypeId);
    if (stats.available < leaveDays) {
      toast({
        title: "Insufficient Leave Balance",
        description: `You do not have enough leave balance. Available: ${stats.available} days, Requested: ${leaveDays} days.`,
        variant: "destructive"
      });
      return;
    }

    setIsApplyingLeave(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('leave_applications')
        .insert({
          user_id: user.id,
          leave_type_id: leaveForm.leaveTypeId,
          start_date: leaveForm.startDate,
          end_date: leaveForm.endDate,
          reason: leaveForm.reason,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave application submitted successfully!",
      });

      setLeaveForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      
      // Refresh data to update leave statistics
      await fetchLeaveApplications();
      await fetchLeaveBalance();
    } catch (error) {
      console.error('Error applying leave:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplyingLeave(false);
    }
  };

  const getSelectedDateAttendance = () => {
    if (!selectedDate) return null;
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    return allAttendanceData.find(record => record.date === selectedDateStr);
  };

  const calculateMonthlyHours = () => {
    return allAttendanceData.reduce((total, record) => {
      return total + (record.total_hours || 0);
    }, 0);
  };

  const getTodayAttendanceData = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = allAttendanceData.find(record => record.date === today);
    return todayRecord;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar size={28} />
                  Attendance
                </h1>
                <p className="text-primary-foreground/80 text-sm">Track your daily attendance and working hours</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.attendance}%</div>
                <div className="text-sm text-primary-foreground/80">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.presentDays}/{stats.totalDays}</div>
                <div className="text-sm text-primary-foreground/80">Present Days</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{calculateMonthlyHours().toFixed(0)}h</div>
                <div className="text-sm text-primary-foreground/80">Monthly Hours</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card 
              className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => {
                setShowAttendanceDetails(true);
                setDetailsType('present');
              }}
            >
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
                <div className="text-xs text-green-700">Present Days</div>
              </CardContent>
            </Card>
            <Card 
              className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-200 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
              onClick={() => {
                setShowAttendanceDetails(true);
                setDetailsType('absent');
              }}
            >
              <CardContent className="p-4 text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{stats.absentDays}</div>
                <div className="text-xs text-red-700">Absent Days</div>
              </CardContent>
            </Card>
          </div>

          {/* Mark Attendance Section */}
          <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Clock size={20} />
                Mark Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {location && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <MapPin size={16} />
                  Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </div>
              )}
              
              {capturedPhoto ? (
                <div className="text-center">
                  <img 
                    src={URL.createObjectURL(capturedPhoto)} 
                    alt="Captured" 
                    className="w-32 h-32 object-cover rounded-lg mx-auto mb-2"
                  />
                  <p className="text-sm text-green-600">Photo captured ✓</p>
                </div>
              ) : (
                <Button 
                  onClick={startCamera} 
                  variant="outline" 
                  className="w-full"
                  disabled={showCamera}
                >
                  <Camera size={16} className="mr-2" />
                  {showCamera ? 'Camera Active' : 'Capture Photo'}
                </Button>
              )}

              {showCamera && (
                <div className="text-center space-y-4">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full max-w-xs rounded-lg mx-auto"
                  />
                  <Button onClick={capturePhoto} className="w-full">
                    Take Photo
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => markAttendance('check_in')} 
                  disabled={isMarkingAttendance || !location || !capturedPhoto}
                  className="w-full"
                >
                  <Clock size={16} className="mr-2" />
                  Check In
                </Button>
                <Button 
                  onClick={() => markAttendance('check_out')} 
                  disabled={isMarkingAttendance || !location || !capturedPhoto}
                  variant="outline"
                  className="w-full"
                >
                  <Clock size={16} className="mr-2" />
                  Check Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Leave Management */}
          <Card className="mb-6 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-purple-600">
                <div className="flex items-center gap-2">
                  <FileText size={20} />
                  Leave Management
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus size={16} className="mr-2" />
                      Apply Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Apply for Leave</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="leaveType">Leave Type</Label>
                        <Select 
                          value={leaveForm.leaveTypeId} 
                          onValueChange={(value) => setLeaveForm(prev => ({ ...prev, leaveTypeId: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                          <SelectContent>
                            {leaveTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={leaveForm.startDate}
                            onChange={(e) => setLeaveForm(prev => ({ ...prev, startDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={leaveForm.endDate}
                            onChange={(e) => setLeaveForm(prev => ({ ...prev, endDate: e.target.value }))}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                          id="reason"
                          placeholder="Please provide a reason for your leave..."
                          value={leaveForm.reason}
                          onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                        />
                      </div>
                      
                      <Button 
                        onClick={applyLeave} 
                        disabled={isApplyingLeave}
                        className="w-full"
                      >
                        {isApplyingLeave ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* User Info Section */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <User size={20} className="text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Employee Information</h4>
                </div>
                <div className="text-sm text-blue-700">
                  <p><span className="font-medium">Name:</span> {userProfile?.full_name || 'Not available'}</p>
                  <p><span className="font-medium">Username:</span> {userProfile?.username || 'Not available'}</p>
                  <p><span className="font-medium">Phone:</span> {userProfile?.phone_number || 'Not available'}</p>
                </div>
              </div>

              {/* Leave Type Sections */}
              <div className="space-y-4">
                <h4 className="font-semibold text-purple-800 mb-4">Leave Balance Overview</h4>
                {leaveTypes.map((leaveType) => {
                  const stats = getLeaveStatistics(leaveType.id);
                  return (
                    <div key={leaveType.id} className="p-4 bg-white rounded-lg border border-purple-200 shadow-sm">
                      <h5 className="font-medium text-purple-700 mb-3">{leaveType.name}</h5>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                          <div className="text-xs text-green-700 font-medium">Available</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                          <div className="text-xs text-orange-700 font-medium">Pending</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">{stats.booked}</div>
                          <div className="text-xs text-blue-700 font-medium">Booked</div>
                        </div>
                      </div>
                      {leaveType.description && (
                        <p className="text-xs text-muted-foreground mt-2">{leaveType.description}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Details Modal */}
          <Dialog open={showAttendanceDetails} onOpenChange={setShowAttendanceDetails}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays size={20} />
                  Attendance Details
                </DialogTitle>
              </DialogHeader>
              
              <Tabs value={detailsType} onValueChange={setDetailsType} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="present">Present Days</TabsTrigger>
                  <TabsTrigger value="absent">Absent Days</TabsTrigger>
                </TabsList>
                
                <TabsContent value="present" className="space-y-4">
                  {/* Today's Attendance */}
                  {(() => {
                    const todayData = getTodayAttendanceData();
                    return (
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3">Today's Attendance</h4>
                        {todayData ? (
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-sm text-muted-foreground">Check In</p>
                              <p className="font-medium text-green-600">{todayData.checkIn}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Check Out</p>
                              <p className="font-medium text-blue-600">{todayData.checkOut}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Hours</p>
                              <p className="font-medium text-purple-600">{todayData.totalHours}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center">No attendance recorded for today</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Date Selection */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Select Date to View Attendance</h4>
                    <div className="flex justify-center">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border"
                      />
                    </div>
                    
                    {/* Selected Date Attendance */}
                    {(() => {
                      const selectedDateAttendance = getSelectedDateAttendance();
                      return (
                        <div className="p-4 bg-muted/20 rounded-lg">
                          <h5 className="font-medium mb-3">
                            Attendance for {selectedDate.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </h5>
                          {selectedDateAttendance ? (
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-sm text-muted-foreground">Check In</p>
                                <p className="font-medium text-green-600">{selectedDateAttendance.checkIn}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Check Out</p>
                                <p className="font-medium text-blue-600">{selectedDateAttendance.checkOut}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Hours</p>
                                <p className="font-medium text-purple-600">{selectedDateAttendance.totalHours}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">No attendance recorded for this date</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>
                
                
                <TabsContent value="absent" className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Absent Days This Month</h4>
                    {absentDaysData.length > 0 ? (
                      absentDaysData.map((absentDay, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <XCircle size={20} className="text-red-600" />
                            <div>
                              <p className="font-medium text-sm text-red-800">
                                {new Date(absentDay.date).toLocaleDateString('en-US', { 
                                  weekday: 'long',
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </p>
                              <p className="text-xs text-red-600">{absentDay.leaveType}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-red-700 font-medium">Reason:</p>
                            <p className="text-xs text-red-600 max-w-40 truncate">{absentDay.reason}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle size={48} className="text-green-600 mx-auto mb-3" />
                        <h5 className="font-medium text-green-800 mb-1">Perfect Attendance!</h5>
                        <p className="text-sm text-green-600">No absent days recorded this month</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;