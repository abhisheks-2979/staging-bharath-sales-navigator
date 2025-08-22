import { Calendar, Clock, MapPin, ArrowLeft, CheckCircle, XCircle, CalendarDays, Camera, Plus, FileText, User, Edit2, Shield, Filter } from "lucide-react";
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
import { useFaceMatching, type FaceMatchResult } from "@/hooks/useFaceMatching";
import HolidayList from "@/components/HolidayList";
import { AttendanceDetailModal } from "@/components/AttendanceDetailModal";

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { compareImages, getMatchStatusIcon, getMatchStatusText } = useFaceMatching();
  const [attendanceData, setAttendanceData] = useState([]);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const [regularizationRequests, setRegularizationRequests] = useState([]);
  const [attendanceFilter, setAttendanceFilter] = useState('week');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);
  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [regularizeData, setRegularizeData] = useState({
    selectedDate: '',
    newCheckIn: '',
    newCheckOut: '',
    reason: ''
  });

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
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    dayType: 'full_day'
  });
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [detailsType, setDetailsType] = useState('present');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [locationStored, setLocationStored] = useState(false);
  const [photoStored, setPhotoStored] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [faceMatchResults, setFaceMatchResults] = useState({});

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
    fetchRegularizationRequests();
    getCurrentLocation();
    performFaceMatching();
  }, []);

  useEffect(() => {
    fetchFilteredAttendanceData();
  }, [attendanceFilter, dateRange]);

  const fetchRegularizationRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: requests, error } = await supabase
        .from('regularization_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegularizationRequests(requests || []);
    } catch (error) {
      console.error('Error fetching regularization requests:', error);
    }
  };

  const fetchFilteredAttendanceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      const today = new Date();
      if (attendanceFilter === 'week') {
        const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        query = query.gte('date', weekStart.toISOString().split('T')[0]);
      } else if (attendanceFilter === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        query = query.gte('date', monthStart.toISOString().split('T')[0]);
      } else if (attendanceFilter === 'range' && dateRange.start && dateRange.end) {
        query = query.gte('date', dateRange.start).lte('date', dateRange.end);
      } else {
        query = query.limit(7);
      }

      const { data: attendanceRecords, error } = await query;
      if (error) throw error;

      const formattedData = attendanceRecords?.map(record => ({
        id: record.id,
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
        rawRecord: record
      })) || [];

      setAttendanceData(formattedData);
    } catch (error) {
      console.error('Error fetching filtered attendance data:', error);
    }
  };

  const fetchAttendanceData = async () => {
    await fetchFilteredAttendanceData();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: todayRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      setTodaysAttendance(todayRecord);
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
    }
  };

  const handleDateClick = (date, record) => {
    setSelectedAttendanceDate({ date, record });
  };

  const openRegularizeModal = () => {
    setShowRegularizeModal(true);
  };

  const submitRegularization = async () => {
    if (!regularizeData.selectedDate || !regularizeData.reason) {
      toast({
        title: "Missing Information",
        description: "Please select a date and provide a reason.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', regularizeData.selectedDate)
        .single();

      const { error } = await supabase
        .from('regularization_requests')
        .insert({
          user_id: user.id,
          attendance_date: regularizeData.selectedDate,
          current_check_in_time: currentRecord?.check_in_time || null,
          current_check_out_time: currentRecord?.check_out_time || null,
          requested_check_in_time: regularizeData.newCheckIn ? 
            `${regularizeData.selectedDate}T${regularizeData.newCheckIn}:00` : null,
          requested_check_out_time: regularizeData.newCheckOut ? 
            `${regularizeData.selectedDate}T${regularizeData.newCheckOut}:00` : null,
          reason: regularizeData.reason
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Regularization request submitted successfully!",
      });

      setShowRegularizeModal(false);
      fetchRegularizationRequests();
    } catch (error) {
      console.error('Error submitting regularization:', error);
      toast({
        title: "Error",
        description: "Failed to submit regularization request. Please try again.",
        variant: "destructive"
      });
    }
  };


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

  const performFaceMatching = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: employeeData } = await supabase
        .from('employees')
        .select('photo_url')
        .eq('user_id', user.id)
        .single();

      if (!employeeData?.photo_url) return;

      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .not('check_in_photo_url', 'is', null)
        .order('date', { ascending: false })
        .limit(10);

      if (!attendanceRecords) return;

      const matchResults = {};
      for (const record of attendanceRecords) {
        if (record.check_in_photo_url) {
          const result = await compareImages(employeeData.photo_url, record.check_in_photo_url);
          matchResults[record.id] = result;
        }
      }

      setFaceMatchResults(matchResults);
    } catch (error) {
      console.error('Error performing face matching:', error);
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

      const { data: applications, error: leaveError } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('start_date', startDate);

      if (leaveError) {
        console.error('Error fetching leave applications:', leaveError);
        return;
      }

      // Fetch leave types for the applications
      let enrichedApplications: any[] = applications || [];
      if (applications && applications.length > 0) {
        const leaveTypeIds = [...new Set(applications.map(app => app.leave_type_id))];
        const { data: leaveTypesData } = await supabase
          .from('leave_types')
          .select('id, name')
          .in('id', leaveTypeIds);

        enrichedApplications = applications.map(app => ({
          ...app,
          leave_types: leaveTypesData?.find(type => type.id === app.leave_type_id) || { name: 'Unknown' }
        }));
      }

      const attendedDates = new Set(attendanceRecords?.map(record => record.date) || []);
      const leaveDates = new Set();
      const leaveDetails = new Map();
      
      enrichedApplications?.forEach(app => {
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

      const absentDays = [];
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        if (d > new Date()) continue;
        
        if (!attendedDates.has(dateStr) && !leaveDates.has(dateStr)) {
          absentDays.push({
            date: dateStr,
            reason: 'No attendance recorded',
            leaveType: 'Absent'
          });
        } else if (leaveDates.has(dateStr)) {
          const leaveInfo = leaveDetails.get(dateStr);
          absentDays.push({
            date: dateStr,
            reason: leaveInfo.reason,
            leaveType: leaveInfo.leaveType
          });
        }
      }

      setAbsentDaysData(absentDays);
      const absentDateStrings = new Set(absentDays.map(day => day.date));
      setAbsentDates(absentDateStrings);
    } catch (error) {
      console.error('Error fetching absent days data:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
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
        .select('*')
        .eq('user_id', user.id)
        .gte('start_date', `${new Date().getFullYear()}-01-01`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave applications:', error);
        return;
      }

      // Fetch leave types for the applications
      let enrichedApplications = applications || [];
      if (applications && applications.length > 0) {
        const leaveTypeIds = [...new Set(applications.map(app => app.leave_type_id))];
        const { data: leaveTypesData } = await supabase
          .from('leave_types')
          .select('id, name')
          .in('id', leaveTypeIds);

        enrichedApplications = applications.map(app => ({
          ...app,
          leave_types: leaveTypesData?.find(type => type.id === app.leave_type_id) || null
        }));
      }

      setLeaveApplications(enrichedApplications);
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
        
        const stream = video.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const markAttendance = async (type = 'check_in') => {
    setLocationStored(false);
    setPhotoStored(false);
    
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
    
    if (!location) {
      getCurrentLocation();
    }
    
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
        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (existingRecord) {
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
        const { data: existingRecord } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (!existingRecord) {
          throw new Error('No check-in record found for today. Please check in first.');
        }

        let totalHours = null;
        if (existingRecord.check_in_time) {
          const checkInTime = new Date(existingRecord.check_in_time);
          const checkOutTime = new Date(currentTime);
          totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
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

      setLocationStored(true);
      setPhotoStored(true);
      
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

    const startDate = new Date(leaveForm.startDate);
    const endDate = new Date(leaveForm.endDate);
    const leaveDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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

  const deleteLeaveApplication = async (applicationId) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .delete()
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave application deleted successfully!",
      });
      await fetchLeaveApplications();
      await fetchLeaveBalance();
    } catch (error) {
      console.error('Error deleting leave application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete leave application. Please try again.",
        variant: "destructive"
      });
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

        <div className="p-4 -mt-4 relative z-10">
          <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 text-base md:text-lg">
                <Clock size={18} />
                Mark Attendance Module
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    if (!todaysAttendance?.check_in_time) {
                      toast({
                        title: "🌟 Have a productive day!",
                        description: "Let's make today amazing! Starting your attendance now...",
                      });
                    }
                    markAttendance('check_in');
                  }} 
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
                  <div className="text-xs text-green-600 text-center space-y-1">
                    <p>✅ Checked in at {new Date(todaysAttendance.check_in_time).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</p>
                    {todaysAttendance.check_in_location && (
                      <p className="text-gray-600">
                        📍 {todaysAttendance.check_in_address ? 
                          `${todaysAttendance.check_in_address.split(',')[0]} (${todaysAttendance.check_in_location.latitude?.toFixed(4)}, ${todaysAttendance.check_in_location.longitude?.toFixed(4)})` : 
                          `Location (${todaysAttendance.check_in_location.latitude?.toFixed(4)}, ${todaysAttendance.check_in_location.longitude?.toFixed(4)})`}
                      </p>
                    )}
                  </div>
                )}
              </div>

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

              <Tabs defaultValue="attendance" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="attendance">My Attendance</TabsTrigger>
                  <TabsTrigger value="leave">Leave</TabsTrigger>
                  <TabsTrigger value="holiday">Holiday</TabsTrigger>
                </TabsList>

                <TabsContent value="attendance" className="space-y-4">
                  <div className="bg-white rounded-lg border">
                    <div className="p-4 border-b">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">Attendance Records</h3>
                          <p className="text-xs text-gray-600 mt-1">Click on date to view details</p>
                        </div>
                        <Button size="sm" onClick={openRegularizeModal} className="text-xs">
                          <Edit2 size={14} className="mr-1" />
                          Regularization
                        </Button>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                          <Filter size={16} className="text-gray-500" />
                          <Label className="text-sm">View:</Label>
                        </div>
                        <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="week">Last Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="range">Date Range</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {attendanceFilter === 'range' && (
                          <>
                            <Input
                              type="date"
                              placeholder="Start Date"
                              value={dateRange.start}
                              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                              className="w-36"
                            />
                            <Input
                              type="date"
                              placeholder="End Date"
                              value={dateRange.end}
                              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                              className="w-36"
                            />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Day</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Day Start</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Day End</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Total Hours</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-600">Face Match</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {attendanceData.length > 0 ? (
                            attendanceData.map((record, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td 
                                  className="px-3 py-2 text-blue-600 cursor-pointer hover:underline font-medium"
                                  onClick={() => handleDateClick(record.date, record)}
                                >
                                  {new Date(record.date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-gray-800 font-medium">{record.checkIn}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="text-gray-800 font-medium">{record.checkOut}</div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {record.totalHours}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {faceMatchResults[record.id] ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-lg">
                                        {getMatchStatusIcon(faceMatchResults[record.id])}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">No data</span>
                                  )}
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


                <TabsContent value="leave" className="space-y-4">
                  {/* Leave Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {leaveTypes.map(leaveType => {
                      const stats = getLeaveStatistics(leaveType.id);
                      return (
                        <div key={leaveType.id} className="space-y-2">
                          <div className="bg-white rounded-lg border p-4">
                            <h4 className="font-medium text-sm text-gray-700 mb-3">{leaveType.name}</h4>
                            <div className="space-y-2">
                              <div 
                                className="flex justify-between items-center p-2 bg-green-50 rounded cursor-pointer hover:bg-green-100"
                                onClick={() => {/* Will add modal later */}}
                              >
                                <span className="text-xs text-green-700">Balance</span>
                                <span className="text-sm font-semibold text-green-800">{stats.available}</span>
                              </div>
                              <div 
                                className="flex justify-between items-center p-2 bg-yellow-50 rounded cursor-pointer hover:bg-yellow-100"
                                onClick={() => {/* Will add modal later */}}
                              >
                                <span className="text-xs text-yellow-700">Pending</span>
                                <span className="text-sm font-semibold text-yellow-800">{stats.pending}</span>
                              </div>
                              <div 
                                className="flex justify-between items-center p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100"
                                onClick={() => {/* Will add modal later */}}
                              >
                                <span className="text-xs text-blue-700">Booked</span>
                                <span className="text-sm font-semibold text-blue-800">{stats.booked}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Apply Leave Button */}
                  <div className="flex justify-end mb-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Plus className="h-4 w-4 mr-2" />
                          Apply for Leave
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Apply for Leave</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="leaveType">Leave Type</Label>
                            <Select value={leaveForm.leaveTypeId} onValueChange={(value) => setLeaveForm(prev => ({ ...prev, leaveTypeId: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select leave type" />
                              </SelectTrigger>
                              <SelectContent>
                                {leaveTypes.map(type => (
                                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
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
                              placeholder="Reason for leave"
                              value={leaveForm.reason}
                              onChange={(e) => setLeaveForm(prev => ({ ...prev, reason: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          
                          <Button onClick={applyLeave} disabled={isApplyingLeave} className="w-full">
                            {isApplyingLeave ? 'Submitting...' : 'Submit Leave Application'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>

                <TabsContent value="holiday">
                  <div className="p-4">
                    <HolidayList />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <AttendanceDetailModal
          isOpen={!!selectedAttendanceDate}
          onClose={() => setSelectedAttendanceDate(null)}
          selectedDate={selectedAttendanceDate?.date || null}
          record={selectedAttendanceDate?.record || null}
        />

        <Dialog open={showRegularizeModal} onOpenChange={setShowRegularizeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Regularize Attendance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="regularizeDate">Select Date</Label>
                <Input
                  id="regularizeDate"
                  type="date"
                  value={regularizeData.selectedDate}
                  onChange={(e) => setRegularizeData(prev => ({ ...prev, selectedDate: e.target.value }))}
                />
              </div>

              {regularizeData.selectedDate && (
                <>
                  {/* Show Current Times */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium text-gray-700">Current Recorded Times:</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">Day Start: </span>
                        <span className="font-medium">
                          {attendanceData.find(record => record.date === regularizeData.selectedDate)?.checkIn || 'Not recorded'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Day End: </span>
                        <span className="font-medium">
                          {attendanceData.find(record => record.date === regularizeData.selectedDate)?.checkOut || 'Not recorded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>New Correction Timings</Label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <Label htmlFor="newCheckIn">Check In</Label>
                        <Input
                          id="newCheckIn"
                          type="time"
                          value={regularizeData.newCheckIn}
                          onChange={(e) => setRegularizeData(prev => ({ ...prev, newCheckIn: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCheckOut">Check Out</Label>
                        <Input
                          id="newCheckOut"
                          type="time"
                          value={regularizeData.newCheckOut}
                          onChange={(e) => setRegularizeData(prev => ({ ...prev, newCheckOut: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Change</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please provide a reason for the attendance correction"
                      value={regularizeData.reason}
                      onChange={(e) => setRegularizeData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setShowRegularizeModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={submitRegularization} size="sm" disabled={!regularizeData.reason.trim()}>
                      Submit
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Attendance;
