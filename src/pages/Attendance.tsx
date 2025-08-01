import { Calendar, Clock, MapPin, ArrowLeft, CheckCircle, XCircle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";

const Attendance = () => {
  const navigate = useNavigate();

  const attendanceData = [
    { date: "2024-01-20", status: "present", checkIn: "09:15 AM", checkOut: "06:30 PM", location: "Bangalore Office" },
    { date: "2024-01-19", status: "present", checkIn: "09:05 AM", checkOut: "06:45 PM", location: "Field Visit - Indiranagar" },
    { date: "2024-01-18", status: "present", checkIn: "09:20 AM", checkOut: "06:25 PM", location: "Bangalore Office" },
    { date: "2024-01-17", status: "absent", checkIn: "-", checkOut: "-", location: "-" },
    { date: "2024-01-16", status: "present", checkIn: "09:10 AM", checkOut: "06:40 PM", location: "Field Visit - Koramangala" },
  ];

  const stats = {
    totalDays: 20,
    presentDays: 18,
    absentDays: 2,
    avgCheckIn: "09:12 AM",
    attendance: 90
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

          {/* Today's Attendance */}
          <Card className="mb-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <Clock size={20} />
                Today's Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Check In</p>
                  <p className="font-semibold">09:15 AM</p>
                </div>
                <Badge className="bg-green-100 text-green-800">Present</Badge>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold text-sm">Bangalore Office</p>
                </div>
              </div>
              <Button className="w-full">
                <MapPin size={16} className="mr-2" />
                Check Out
              </Button>
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