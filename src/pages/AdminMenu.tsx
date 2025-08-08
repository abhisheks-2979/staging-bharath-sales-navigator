import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Users, Settings, Package, ArrowLeft, Calendar, UserPlus, BarChart3 } from 'lucide-react';

const AdminMenu = () => {
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
    return <Navigate to="/" replace />;
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
            <h1 className="text-3xl font-bold text-foreground">Admin Menu</h1>
            <p className="text-muted-foreground">Choose an administrative area to manage</p>
          </div>
        </div>

        {/* Admin Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin-controls')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Settings className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Admin Controls</CardTitle>
              <CardDescription>
                Access admin dashboard, user management, and product management
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Dashboard</CardTitle>
              <CardDescription>
                View system statistics, analytics, and general administration
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/product-management')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Package className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Product Management</CardTitle>
              <CardDescription>
                Manage products, SKUs, categories, and promotional schemes
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
            onClick={() => navigate('/admin#holidays')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-cyan-100 rounded-full w-16 h-16 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-cyan-600" />
              </div>
              <CardTitle>Holiday Management</CardTitle>
              <CardDescription>
                Manage company holidays and calendar settings
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/admin#create-user')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
                <UserPlus className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Create User</CardTitle>
              <CardDescription>
                Add new users to the system with specific roles
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminMenu;