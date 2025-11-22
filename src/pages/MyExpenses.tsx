import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ExpenseSummaryBoxes from '@/components/ExpenseSummaryBoxes';
import BeatAllowanceManagement from '@/components/BeatAllowanceManagement';

const MyExpenses = () => {
  const { userRole, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-primary text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="relative p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                onClick={() => navigate('/')} 
                variant="ghost" 
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold">My Expenses</h1>
                <p className="text-primary-foreground/80 mt-1 text-sm sm:text-base">Track your TA & DA expenses</p>
              </div>
              <Button 
                variant="secondary"
                size="sm"
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30 hidden sm:flex"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
              <Button 
                variant="secondary"
                size="icon"
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30 sm:hidden"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Stats - Moved to -mt-6 section */}
          </div>
        </div>
      </div>

      {/* Stats Cards - Overlapping Header */}
      <div className="p-4 -mt-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-200 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">₹1080</div>
                <div className="text-[10px] sm:text-xs text-blue-700 font-medium leading-tight">This Month</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-200 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">₹320</div>
                <div className="text-[10px] sm:text-xs text-purple-700 font-medium leading-tight">Pending</div>
              </CardContent>
            </Card>
          </div>

          {/* Allowance Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-200 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-green-600 text-sm mb-2">🚗</div>
                <div className="text-xl sm:text-2xl font-bold text-green-700">₹720</div>
                <div className="text-[10px] sm:text-xs text-green-600 font-medium leading-tight">Travel Allowance</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-200 shadow-lg">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-orange-600 text-sm mb-2">☕</div>
                <div className="text-xl sm:text-2xl font-bold text-orange-700">₹360</div>
                <div className="text-[10px] sm:text-xs text-orange-600 font-medium leading-tight">Daily Allowance</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Monthly Overview */}
          <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border-emerald-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-emerald-800 flex items-center gap-2 text-base sm:text-lg">
                📊 Monthly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm sm:text-base font-bold text-emerald-700">Approved</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-800">₹760</div>
                </div>
                <div className="text-center">
                  <div className="text-sm sm:text-base font-bold text-emerald-700">Success Rate</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-800">70%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                📋 Recent Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8 text-sm sm:text-base">
                No recent expenses found
              </div>
            </CardContent>
          </Card>

          {/* Detailed Components */}
          <ExpenseSummaryBoxes />
          <BeatAllowanceManagement />
        </div>
      </div>
    </div>
  );
};

export default MyExpenses;