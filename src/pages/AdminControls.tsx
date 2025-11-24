import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft } from 'lucide-react';

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

  const adminModules = [
    { title: "Admin Panel", description: "Access all administrative controls and system management features", icon: Shield, color: "green", path: "/admin" },
  ];

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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Admin Controls</h1>
            <p className="text-muted-foreground">Manage different aspects of your system</p>
          </div>
        </div>

        {/* Admin Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-md mx-auto">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.path}
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => navigate(module.path)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-6 bg-green-100 rounded-full w-20 h-20 flex items-center justify-center">
                    <Icon className="h-10 w-10 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription className="text-base">{module.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminControls;