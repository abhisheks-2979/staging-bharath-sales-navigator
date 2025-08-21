import { Calendar, Clock, MapPin, ArrowLeft, CheckCircle, XCircle, CalendarDays, Camera, Plus, FileText, User, Edit2 } from "lucide-react";
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
import HolidayList from "@/components/HolidayList";

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
  const [presentDates, setPresentDates] = useState(new Set());
  const [absentDates, setAbsentDates] = useState(new Set());

  // Leave application form state
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    dayType: 'full_day' // Add day type selection
  });

  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [detailsType, setDetailsType] = useState('present');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [locationStored, setLocationStored] = useState(false);
  const [photoStored, setPhotoStored] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);

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
      
      // Update present dates set for calendar
      const presentDateStrings = new Set(attendanceRecords?.map(record => record.date) || []);
      setPresentDates(presentDateStrings);
    } catch (error) {
      console.error('Error fetching all attendance data:', error);
    }
  };

  const fetchAbsentDaysData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`;

      // Get all attendance records for the month
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lt('date', endDate);

      if (attendanceError) {
        console.error('Error fetching attendance records:', attendanceError);
        return;
      }

      // Get approved leave applications for the month
      const { data: applications, error: leaveError } = await supabase
        .from('leave_applications')
        .select(`
          *,
          leave_types:leave_type_id (name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', startDate);

      if (leaveError) {
        console.error('Error fetching leave applications:', leaveError);
        return;
      }

      // Create set of attended dates
      const attendedDates = new Set(attendanceRecords?.map(record => record.date) || []);
      
      // Create set of leave dates
      const leaveDates = new Set();
      const leaveDetails = new Map();
      
      applications?.forEach(app => {
        const appStartDate = new Date(app.start_date);
        const appEndDate = new Date(app.end_date);
        
        for (let d = new Date(appStartDate); d <= appEndDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          leaveDates.add(dateStr);
          leaveDetails.set(dateStr, {
            reason: app.reason,
            leaveType: app.leave_types?.name || 'Unknown'
          });
        }
      });

      // Generate all working days in the month (excluding weekends for now)
      const absentDays = [];
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        // Skip future dates
        if (d > new Date()) continue;
        
        // If not attended and not on leave, mark as absent
        if (!attendedDates.has(dateStr) && !leaveDates.has(dateStr)) {
          absentDays.push({
            date: dateStr,
            reason: 'No attendance recorded',
            leaveType: 'Absent'
          });
        } else if (leaveDates.has(dateStr)) {
          // Add leave days to absent days list
          const leaveInfo = leaveDetails.get(dateStr);
          absentDays.push({
            date: dateStr,
            reason: leaveInfo.reason,
            leaveType: leaveInfo.leaveType
          });
        }
      }

      setAbsentDaysData(absentDays);
      
      // Update absent dates set for calendar
      const absentDateStrings = new Set(absentDays.map(day => day.date));
      setAbsentDates(absentDateStrings);
    } catch (error) {
      console.error('Error fetching absent days data:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      // Define allowed leave types
      const allowedLeaveTypes = [
        'Annual Leave',
        'Casual Leave', 
        'Sick Leave',
        'Privileged Leave',
        'Leave Without Pay'
      ];

      const { data: leaveTypes, error } = await supabase
        .from('leave_types')
        .select('*')
        .in('name', allowedLeaveTypes)
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
    // Reset success indicators
    setLocationStored(false);
    setPhotoStored(false);
    
    // Check if already marked for the day
    const today = new Date().toISOString().split('T')[0];
    if (type === 'check_in' && todaysAttendance?.check_in_time) {
      toast({
        title: "Already Checked In",
        description: "You have already marked your attendance for today.",
        variant: "destructive"
      });
      return;
    }
    
    if (type === 'check_out' && todaysAttendance?.check_out_time) {
      toast({
        title: "Already Checked Out", 
        description: "You have already checked out for today.",
        variant: "destructive"
      });
      return;
    }

    if (type === 'check_out' && !todaysAttendance?.check_in_time) {
      toast({
        title: "Check In First",
        description: "Please check in first before checking out.",
        variant: "destructive"
      });
      return;
    }
    
    // Get current location
    if (!location) {
      getCurrentLocation();
    }
    
    // Start camera for photo capture (camera only, no gallery)
    if (!capturedPhoto) {
      await startCamera();
      return;
    }

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

      // Show success indicators
      setLocationStored(true);
      setPhotoStored(true);
      
      // Success message as specified
      if (type === 'check_out') {
        toast({
          title: "✅ Attendance marked. Have a productive day!",
          description: `Check-out completed successfully at ${new Date(currentTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
        });
      } else {
        toast({
          title: "Day Started Successfully!",
          description: `Check-in completed at ${new Date(currentTime).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
        });
      }

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
      // Reset success indicators after 3 seconds
      setTimeout(() => {
        setLocationStored(false);
        setPhotoStored(false);
      }, 3000);
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

      setLeaveForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '', dayType: 'full_day' });
      
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

  const updateLeaveApplication = async () => {
    if (!editingApplication || !leaveForm.leaveTypeId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsApplyingLeave(true);

    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({
          leave_type_id: leaveForm.leaveTypeId,
          start_date: leaveForm.startDate,
          end_date: leaveForm.endDate,
          reason: leaveForm.reason
        })
        .eq('id', editingApplication.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave application updated successfully!",
      });

      setLeaveForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '', dayType: 'full_day' });
      setEditingApplication(null);
      
      // Refresh data
      await fetchLeaveApplications();
      await fetchLeaveBalance();
    } catch (error) {
      console.error('Error updating leave application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update leave application. Please try again.",
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
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Calendar size={24} />
                Attendance
              </h1>
              <p className="text-primary-foreground/80 text-xs md:text-sm">Track your daily attendance and working hours</p>
            </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold">{stats.attendance}%</div>
                <div className="text-xs md:text-sm text-primary-foreground/80">This Month</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-white/10 rounded-lg p-2 transition-colors"
                onClick={() => {
                  setShowAttendanceDetails(true);
                  setDetailsType('present');
                }}
              >
                <div className="text-xl md:text-2xl font-bold">{stats.presentDays}</div>
                <div className="text-xs md:text-sm text-primary-foreground/80">Present Days</div>
              </div>
              <div 
                className="text-center cursor-pointer hover:bg-white/10 rounded-lg p-2 transition-colors"
                onClick={() => {
                  setShowAttendanceDetails(true);
                  setDetailsType('absent');
                }}
              >
                <div className="text-xl md:text-2xl font-bold">{stats.absentDays}</div>
                <div className="text-xs md:text-sm text-primary-foreground/80">Absent Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">

          {/* Mark Attendance Module */}
          <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 text-base md:text-lg">
                <Clock size={18} />
                Mark Attendance Module
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick Action Buttons */}
              {showCamera && (
                <div className="text-center space-y-4 bg-black/5 p-4 rounded-lg">
                  <h3 className="text-sm font-medium">Take your selfie for attendance</h3>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full max-w-xs rounded-lg mx-auto border-2 border-primary/20"
                  />
                  <Button onClick={capturePhoto} className="w-full max-w-xs">
                    <Camera size={16} className="mr-2" />
                    Capture Photo
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Check In Button */}
              <div className="space-y-2">
                <Button 
                  onClick={() => markAttendance('check_in')} 
                  disabled={isMarkingAttendance || (todaysAttendance?.check_in_time)}
                  className={`w-full text-sm md:text-base py-6 ${
                    todaysAttendance?.check_in_time 
                      ? 'bg-green-600 hover:bg-green-600' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  }`}
                >
                  <Clock size={16} className="mr-2" />
                  {todaysAttendance?.check_in_time ? 'Day Started ✓' : 'Start My Day'}
                </Button>
                {todaysAttendance?.check_in_time && (
                  <p className="text-xs text-green-600 text-center">
                    ✅ Checked in at {new Date(todaysAttendance.check_in_time).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                )}
              </div>

              {/* Check Out Button */}
              <div className="space-y-2">
                <Button 
                  onClick={() => markAttendance('check_out')} 
                  disabled={isMarkingAttendance || !todaysAttendance?.check_in_time || todaysAttendance?.check_out_time}
                  className={`w-full text-sm md:text-base py-6 ${
                    todaysAttendance?.check_out_time 
                      ? 'bg-green-600 hover:bg-green-600' 
                      : 'bg-gray-400 hover:bg-gray-500'
                  }`}
                >
                  <Clock size={16} className="mr-2" />
                  {todaysAttendance?.check_out_time ? 'Day Ended ✓' : 'End My Day'}
                </Button>
                {todaysAttendance?.check_out_time && (
                  <div className="text-xs text-green-600 text-center space-y-1">
                    <p>✅ Checked out at {new Date(todaysAttendance.check_out_time).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</p>
                    {todaysAttendance.total_hours && (
                      <p>🕒 Total Hours: {todaysAttendance.total_hours.toFixed(1)} hrs</p>
                    )}
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {!todaysAttendance?.check_in_time && (
                <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  📱 Tap "Start My Day" to mark your attendance with selfie and location
                </div>
              )}
              
              {todaysAttendance?.check_in_time && !todaysAttendance?.check_out_time && (
                <div className="text-center text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  ⏰ Don't forget to "End My Day" when you finish work
                </div>
              )}

              {todaysAttendance?.check_in_time && todaysAttendance?.check_out_time && (
                <div className="text-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                  ✅ Attendance marked. Have a productive day!
                </div>
              )}

              {/* Tabs Section */}
              <Tabs defaultValue="attendance" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="attendance">My Attendance</TabsTrigger>
                  <TabsTrigger value="leave">Leave</TabsTrigger>
                  <TabsTrigger value="holiday">Holiday</TabsTrigger>
                </TabsList>

                {/* My Attendance Tab */}
                <TabsContent value="attendance" className="space-y-4">
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-800">Attendance Records</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Day</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Check In</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Check Out</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Total Hours</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {attendanceData.length > 0 ? (
                            attendanceData.map((record, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800">
                                  {new Date(record.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="space-y-1">
                                    <div className="text-gray-800 font-medium">{record.checkIn}</div>
                                    <div className="text-gray-500 text-xs truncate max-w-20">{record.location}</div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="space-y-1">
                                    <div className="text-gray-800 font-medium">{record.checkOut}</div>
                                    <div className="text-gray-500 text-xs truncate max-w-20">{record.location}</div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {record.totalHours}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Button variant="ghost" size="sm" className="text-xs">
                                    Details
                                  </Button>
                                  {record.checkIn === '-' || record.checkOut === '-' ? (
                                    <Button variant="ghost" size="sm" className="text-xs text-orange-600 ml-1">
                                      Regularize
                                    </Button>
                                  ) : null}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                                No attendance records found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* Leave Tab */}
                <TabsContent value="leave" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Leave Management</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="text-xs">
                          <Plus size={14} className="mr-1" />
                          Apply Leave
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingApplication ? 'Edit Leave Application' : 'Apply for Leave'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="leaveType">Leave Type</Label>
                            <Select 
                              value={leaveForm.leaveTypeId} 
                              onValueChange={(value) => {
                                setLeaveForm(prev => ({ ...prev, leaveTypeId: value }));
                                setSelectedLeaveType(value);
                              }}
                            >
                              <SelectTrigger className="bg-background border-input">
                                <SelectValue placeholder="Select leave type" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-input shadow-lg z-50">
                                {leaveTypes.map((type) => {
                                  const stats = getLeaveStatistics(type.id);
                                  return (
                                    <SelectItem 
                                      key={type.id} 
                                      value={type.id} 
                                      className="hover:bg-muted"
                                      disabled={stats.available === 0}
                                    >
                                      <div className="flex justify-between items-center w-full">
                                        <span>{type.name}</span>
                                        <span className={`text-xs ml-2 ${stats.available === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                          {stats.available === 0 ? 'No balance' : `${stats.available} days`}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {selectedLeaveType && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                <div className="font-medium text-blue-800">Leave Balance:</div>
                                <div className="text-blue-600">
                                  Available: {getLeaveStatistics(selectedLeaveType).available} days
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <Label>Select leave type:</Label>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="full_day"
                                  name="dayType"
                                  value="full_day"
                                  checked={leaveForm.dayType === 'full_day'}
                                  onChange={(e) => setLeaveForm(prev => ({ ...prev, dayType: e.target.value }))}
                                  className="text-primary focus:ring-primary"
                                />
                                <Label htmlFor="full_day" className="text-sm font-normal cursor-pointer">Full Day</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="half_day"
                                  name="dayType"
                                  value="half_day"
                                  checked={leaveForm.dayType === 'half_day'}
                                  onChange={(e) => setLeaveForm(prev => ({ ...prev, dayType: e.target.value }))}
                                  className="text-primary focus:ring-primary"
                                />
                                <Label htmlFor="half_day" className="text-sm font-normal cursor-pointer">Half Day</Label>
                              </div>
                            </div>
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
                              placeholder="Enter reason for leave"
                              value={leaveForm.reason}
                              onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            {editingApplication && (
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setEditingApplication(null);
                                  setLeaveForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '', dayType: 'full_day' });
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button 
                              onClick={editingApplication ? updateLeaveApplication : applyLeave} 
                              disabled={isApplyingLeave}
                            >
                              {isApplyingLeave ? 'Submitting...' : editingApplication ? 'Update' : 'Apply'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Leave Balance Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {leaveTypes.map((type) => {
                      const stats = getLeaveStatistics(type.id);
                      return (
                        <div key={type.id} className="bg-white p-3 rounded-lg border">
                          <h4 className="font-medium text-gray-800 text-sm">{type.name}</h4>
                          <div className="mt-2 space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Available:</span>
                              <span className="font-medium text-green-600">{stats.available}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Booked:</span>
                              <span className="font-medium text-blue-600">{stats.booked}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Pending:</span>
                              <span className="font-medium text-orange-600">{stats.pending}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pending Leave Applications */}
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-800">Pending Leave Applications</h3>
                    </div>
                    <div className="space-y-3 p-4">
                      {leaveApplications.filter(app => app.status === 'pending').length > 0 ? (
                        leaveApplications.filter(app => app.status === 'pending').map((application) => (
                          <div key={application.id} className="border rounded-lg p-3 bg-yellow-50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {application.leave_types?.name}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs text-orange-600">
                                    Pending
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingApplication(application);
                                      setLeaveForm({
                                        leaveTypeId: application.leave_type_id,
                                        startDate: application.start_date,
                                        endDate: application.end_date,
                                        reason: application.reason,
                                        dayType: 'full_day'
                                      });
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit2 size={12} />
                                  </Button>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <div>📅 {new Date(application.start_date).toLocaleDateString('en-GB')} - {new Date(application.end_date).toLocaleDateString('en-GB')}</div>
                                  <div>📝 {application.reason}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Applied on: {new Date(application.applied_date || application.created_at).toLocaleDateString('en-GB')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-4">
                          No pending leave applications
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Holiday Tab */}
                <TabsContent value="holiday" className="space-y-4">
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-800">Official Holidays</h3>
                      <p className="text-xs text-gray-600 mt-1">Company declared holidays for the year</p>
                    </div>
                    <div className="p-4">
                      <HolidayList />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Leave Management */}
          <Card className="mb-6 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-purple-600 text-base md:text-lg">
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  Leave Management
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="text-xs md:text-sm">
                      <Plus size={14} className="mr-2" />
                      Apply Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingApplication ? 'Edit Leave Application' : 'Apply for Leave'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="leaveType">Leave Type</Label>
                        <Select 
                          value={leaveForm.leaveTypeId} 
                          onValueChange={(value) => {
                            setLeaveForm(prev => ({ ...prev, leaveTypeId: value }));
                            setSelectedLeaveType(value);
                          }}
                        >
                          <SelectTrigger className="bg-background border-input z-50">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-input shadow-lg z-50">
                            {leaveTypes.map((type) => {
                              const stats = getLeaveStatistics(type.id);
                              return (
                                <SelectItem 
                                  key={type.id} 
                                  value={type.id} 
                                  className="hover:bg-muted"
                                  disabled={stats.available === 0}
                                >
                                  <div className="flex justify-between items-center w-full">
                                    <span>{type.name}</span>
                                    <span className={`text-xs ml-2 ${stats.available === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                      {stats.available === 0 ? 'No balance' : `${stats.available} days`}
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {selectedLeaveType && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                            <div className="font-medium text-blue-800">Leave Balance:</div>
                            <div className="text-blue-600">
                              Available: {getLeaveStatistics(selectedLeaveType).available} days
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Select leave type:</Label>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="full_day"
                              name="dayType"
                              value="full_day"
                              checked={leaveForm.dayType === 'full_day'}
                              onChange={(e) => setLeaveForm(prev => ({ ...prev, dayType: e.target.value }))}
                              className="text-primary focus:ring-primary"
                            />
                            <Label htmlFor="full_day" className="text-sm font-normal cursor-pointer">Full Day</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="half_day"
                              name="dayType"
                              value="half_day"
                              checked={leaveForm.dayType === 'half_day'}
                              onChange={(e) => setLeaveForm(prev => ({ ...prev, dayType: e.target.value }))}
                              className="text-primary focus:ring-primary"
                            />
                            <Label htmlFor="half_day" className="text-sm font-normal cursor-pointer">Half Day</Label>
                          </div>
                        </div>
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
                          placeholder="Enter reason for leave"
                          value={leaveForm.reason}
                          onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        {editingApplication && (
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setEditingApplication(null);
                              setLeaveForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '', dayType: 'full_day' });
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button 
                          onClick={editingApplication ? updateLeaveApplication : applyLeave} 
                          disabled={isApplyingLeave}
                        >
                          {isApplyingLeave ? 'Submitting...' : editingApplication ? 'Update' : 'Apply'}
                        </Button>
                      </div>
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
                <div className="text-xs md:text-sm text-blue-700">
                  <p><span className="font-medium">Name:</span> {userProfile?.full_name || 'Loading...'}</p>
                  <p><span className="font-medium">Username:</span> {userProfile?.username || 'Loading...'}</p>
                </div>
              </div>

              {/* Leave Types with Statistics */}
              <div className="space-y-4">
                {leaveTypes.map((type) => {
                  const stats = getLeaveStatistics(type.id);
                  return (
                    <div key={type.id} className="bg-white rounded-lg shadow-sm border border-purple-100 p-4">
                      <h4 className="font-semibold text-purple-800 text-base mb-3">{type.name}</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xs text-green-600 font-medium mb-1">Available:</div>
                          <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xs text-blue-600 font-medium mb-1">Booked:</div>
                          <div className="text-2xl font-bold text-blue-600">{stats.booked}</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-xs text-orange-600 font-medium mb-1">Pending:</div>
                          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pending Leave Applications */}
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-purple-100">
                <div className="p-4 border-b border-purple-100">
                  <h3 className="font-semibold text-purple-800 text-sm md:text-base">Pending Leave Applications</h3>
                </div>
                {leaveApplications.filter(app => app.status === 'pending').length > 0 ? (
                  <div className="space-y-3 p-4">
                    {leaveApplications
                      .filter(app => app.status === 'pending')
                      .map((application) => (
                        <div key={application.id} className="p-3 md:p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {application.leave_types?.name}
                                </Badge>
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                                  Pending
                                </Badge>
                              </div>
                              <div className="text-xs md:text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <CalendarDays size={14} className="text-orange-600" />
                                  <span className="font-medium text-orange-800">
                                    {new Date(application.start_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })} - {new Date(application.end_date).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText size={14} className="text-gray-500" />
                                  <span className="text-gray-700">{application.reason}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingApplication(application);
                                  setLeaveForm({
                                    leaveTypeId: application.leave_type_id,
                                    startDate: application.start_date,
                                    endDate: application.end_date,
                                    reason: application.reason,
                                    dayType: 'full_day'
                                  });
                                }}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                              >
                                <Edit2 size={16} />
                              </Button>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Applied on</p>
                                <p className="text-sm font-medium text-gray-700">
                                  {new Date(application.created_at).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No pending leave applications
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Dialog open={showAttendanceDetails} onOpenChange={setShowAttendanceDetails}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays size={20} />
                  Attendance Details
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  View your attendance records, working hours, and absent days
                </p>
              </DialogHeader>
              
              <Tabs value={detailsType} onValueChange={setDetailsType} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="present">Present Days</TabsTrigger>
                  <TabsTrigger value="absent">Absent Days</TabsTrigger>
                </TabsList>
                
                <TabsContent value="present" className="space-y-4">
                  {/* Visual Attendance Calendar */}
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="font-semibold text-emerald-600 mb-2">Attendance Calendar</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Visual representation of your attendance - Green for present, Red for absent
                      </p>
                    </div>
                    
                    <div className="flex justify-center">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border pointer-events-auto"
                        modifiers={{
                          present: (date) => {
                            const dateStr = date.toISOString().split('T')[0];
                            return presentDates.has(dateStr);
                          },
                          absent: (date) => {
                            const dateStr = date.toISOString().split('T')[0];
                            return absentDates.has(dateStr);
                          }
                        }}
                        modifiersStyles={{
                          present: {
                            backgroundColor: 'hsl(142 76% 36%)',
                            color: 'white',
                            fontWeight: 'bold'
                          },
                          absent: {
                            backgroundColor: 'hsl(0 84% 60%)',
                            color: 'white',
                            fontWeight: 'bold'
                          }
                        }}
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                    
                    {/* Legend */}
                    <div className="flex justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-600 rounded"></div>
                        <span className="text-sm text-green-700 font-medium">Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="text-sm text-red-700 font-medium">Absent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-200 rounded border"></div>
                        <span className="text-sm text-gray-600 font-medium">No Data</span>
                      </div>
                    </div>

                    {/* Today's Attendance */}
                    {(() => {
                      const today = new Date();
                      const todayStr = today.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      });
                      
                      return (
                        <div className="text-center p-3 md:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <h5 className="font-semibold text-green-800 mb-3 md:mb-4 text-sm md:text-base">Attendance for {todayStr}</h5>
                          <div className="grid grid-cols-2 gap-4 md:gap-6">
                            <div className="text-center">
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Check In</p>
                              <div className="text-lg md:text-2xl font-bold text-green-600">
                                {todaysAttendance?.check_in_time ? 
                                  new Date(todaysAttendance.check_in_time).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  }) : 
                                  '--'
                                }
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-xs md:text-sm text-muted-foreground mb-1">Check Out</p>
                              <div className="text-lg md:text-2xl font-bold text-blue-600">
                                {todaysAttendance?.check_out_time ? 
                                  new Date(todaysAttendance.check_out_time).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  }) : 
                                  '--'
                                }
                              </div>
                            </div>
                          </div>
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