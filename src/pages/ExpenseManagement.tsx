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
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/admin-controls')} 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
            <p className="text-muted-foreground">Manage daily allowances, travel allowances and track productivity</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="allowances">Beat Allowances</TabsTrigger>
            <TabsTrigger value="productivity">Productivity Tracking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="allowances" className="mt-6">
            <BeatAllowanceManagement />
          </TabsContent>
          
          <TabsContent value="productivity" className="mt-6">
            <ProductivityTracking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExpenseManagement;