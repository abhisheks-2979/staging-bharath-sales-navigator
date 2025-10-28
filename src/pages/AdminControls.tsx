import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Settings, Package, ArrowLeft, CalendarDays, MapPin, DollarSign, BarChart3, MessageSquareText, Navigation } from 'lucide-react';

const AdminControls = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Controls</h1>
            <p className="text-muted-foreground">Manage different aspects of your system</p>
          </div>
        </div>

        {/* Admin Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Admin Dashboard</CardTitle>
              <CardDescription>
                View system statistics and manage general administration tasks
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin#users')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin#settings')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Settings className="h-8 w-8 text-gray-600" />
              </div>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings and preferences
              </CardDescription>
            </CardHeader>
          </Card>


          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/attendance-management')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center">
                <CalendarDays className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Attendance Management</CardTitle>
              <CardDescription>
                Manage user attendance, holidays, and leave approvals
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/product-management')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Manage your product catalog, SKUs, and promotional schemes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/vendors')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Vendors</CardTitle>
              <CardDescription>
                Manage vendor relationships and approvals
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/territories-distributors')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center">
                <MapPin className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle>Territories & Distributors</CardTitle>
              <CardDescription>
                Manage territory assignments and distributor network
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin-expense-management')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle>Expense Management</CardTitle>
              <CardDescription>
                Track team productivity and expense analytics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/feedback-management')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center">
                <MessageSquareText className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Feedback Management</CardTitle>
              <CardDescription>
                View retailer feedback, competition insights, and branding requests
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/operations')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Operations</CardTitle>
              <CardDescription>
                Monitor real-time operations, check-ins, orders, and stock data
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/gps-track-management')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-cyan-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Navigation className="h-8 w-8 text-cyan-600" />
              </div>
              <CardTitle>GPS Track Management</CardTitle>
              <CardDescription>
                Monitor live locations and track user movements from login to logout
              </CardDescription>
            </CardHeader>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default AdminControls;