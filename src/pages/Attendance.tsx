import { Calendar, Clock, MapPin, ArrowLeft, CheckCircle, XCircle, CalendarDays, Camera, Plus, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Attendance = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attendanceData, setAttendanceData] = useState([]);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const [location, setLocation] = useState(null);

  // Leave application form state
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const stats = {
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    avgCheckIn: "09:12 AM",
    attendance: 90
  };

  useEffect(() => {
    fetchAttendanceData();
    fetchLeaveTypes();
    fetchLeaveBalance();
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
    // Mock data for now - will be replaced with real Supabase calls once types are updated
    const mockData = [
      { date: "2024-01-20", status: "present", checkIn: "09:15 AM", checkOut: "06:30 PM", location: "Bangalore Office" },
      { date: "2024-01-19", status: "present", checkIn: "09:05 AM", checkOut: "06:45 PM", location: "Field Visit - Indiranagar" },
      { date: "2024-01-18", status: "present", checkIn: "09:20 AM", checkOut: "06:25 PM", location: "Bangalore Office" },
      { date: "2024-01-17", status: "absent", checkIn: "-", checkOut: "-", location: "-" },
      { date: "2024-01-16", status: "present", checkIn: "09:10 AM", checkOut: "06:40 PM", location: "Field Visit - Koramangala" },
    ];
    setAttendanceData(mockData);
    
    // Check today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = mockData.find(record => record.date === today);
    setTodaysAttendance(todayRecord);
  };

  const fetchLeaveTypes = async () => {
    // Mock data for now
    const mockLeaveTypes = [
      { id: '1', name: 'Annual Leave', description: 'Yearly vacation leave' },
      { id: '2', name: 'Sick Leave', description: 'Medical leave for illness' },
      { id: '3', name: 'Casual Leave', description: 'Short-term casual leave' },
      { id: '4', name: 'Emergency Leave', description: 'Emergency or urgent leave' }
    ];
    setLeaveTypes(mockLeaveTypes);
  };

  const fetchLeaveBalance = async () => {
    // Mock data for now
    const mockLeaveBalance = [
      { id: '1', leave_type_id: '1', leave_types: { name: 'Annual Leave' }, opening_balance: 20, used_balance: 5, remaining_balance: 15 },
      { id: '2', leave_type_id: '2', leave_types: { name: 'Sick Leave' }, opening_balance: 10, used_balance: 2, remaining_balance: 8 },
      { id: '3', leave_type_id: '3', leave_types: { name: 'Casual Leave' }, opening_balance: 12, used_balance: 3, remaining_balance: 9 }
    ];
    setLeaveBalance(mockLeaveBalance);
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
      // Mock implementation - will be replaced with real Supabase calls
      toast({
        title: "Success",
        description: `${type === 'check_in' ? 'Check-in' : 'Check-out'} marked successfully!`,
      });

      setCapturedPhoto(null);
      fetchAttendanceData();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
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

    setIsApplyingLeave(true);

    try {
      // Mock implementation - will be replaced with real Supabase calls
      toast({
        title: "Success",
        description: "Leave application submitted successfully!",
      });

      setLeaveForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
    } catch (error) {
      console.error('Error applying leave:', error);
      toast({
        title: "Error",
        description: "Failed to submit leave application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsApplyingLeave(false);
    }
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
                onClick={() => navigate(-1)}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.attendance}%</div>
                <div className="text-sm text-primary-foreground/80">This Month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{stats.presentDays}/{stats.totalDays}</div>
                <div className="text-sm text-primary-foreground/80">Present Days</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 -mt-4 relative z-10">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.presentDays}</div>
                <div className="text-xs text-green-700">Present Days</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-200 shadow-lg">
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
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Leave Balance</h4>
                {leaveBalance.map((balance) => (
                  <div key={balance.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                    <span className="text-sm font-medium">{balance.leave_types.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-green-600">{balance.remaining_balance}</span>
                      <span className="text-xs text-muted-foreground">/{balance.opening_balance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Attendance History */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays size={20} />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceData.map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      {day.status === "present" ? (
                        <CheckCircle size={20} className="text-green-600" />
                      ) : (
                        <XCircle size={20} className="text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-xs text-muted-foreground">{day.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{day.checkIn}</p>
                      <p className="text-xs text-muted-foreground">{day.checkOut}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Attendance;