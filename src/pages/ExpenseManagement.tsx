import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';
import ProductivityTracking from '@/components/ProductivityTracking';

const ExpenseManagement = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('allowances');

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
    <div className="min-h-screen bg-gradient-subtle p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            onClick={() => navigate('/admin-controls')} 
            variant="ghost" 
            size="sm"
            className="p-1.5 sm:p-2"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Expense Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">Manage daily allowances, travel allowances and track productivity</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="allowances" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              Beat Allowances
            </TabsTrigger>
            <TabsTrigger value="productivity" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
              Productivity Tracking
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="allowances" className="mt-4 sm:mt-6">
            <BeatAllowanceManagement />
          </TabsContent>
          
          <TabsContent value="productivity" className="mt-4 sm:mt-6">
            <ProductivityTracking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExpenseManagement;