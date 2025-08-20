import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';
import ExpenseSummaryBoxes from '@/components/ExpenseSummaryBoxes';

const ExpenseManagement = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Expense management is now accessible to all authenticated users

  return (
    <div className="min-h-screen bg-gradient-subtle p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            size="sm"
            className="p-1.5 sm:p-2"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">My Expenses</h1>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">Manage your daily allowances and travel allowances</p>
          </div>
        </div>

        <ExpenseSummaryBoxes />
        <BeatAllowanceManagement />
      </div>
    </div>
  );
};

export default ExpenseManagement;