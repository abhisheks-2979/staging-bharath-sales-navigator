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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              onClick={() => navigate('/')} 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/20 p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">My Expenses</h1>
              <p className="text-blue-100 mt-1">Track your TA & DA expenses</p>
            </div>
            <Button 
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white">₹1080</div>
                <div className="text-sm text-blue-100">This Month</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-white">₹320</div>
                <div className="text-sm text-blue-100">Pending</div>
              </CardContent>
            </Card>
          </div>

          {/* Allowance Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className="text-blue-600 text-sm mb-2">🚗</div>
                <div className="text-2xl font-bold text-blue-700">₹720</div>
                <div className="text-sm text-blue-600">Travel Allowance</div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
              <CardContent className="p-4 text-center">
                <div className="text-orange-600 text-sm mb-2">☕</div>
                <div className="text-2xl font-bold text-orange-700">₹360</div>
                <div className="text-sm text-orange-600">Daily Allowance</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Monthly Overview */}
          <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
                📊 Monthly Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">Approved</div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">₹760</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">Success Rate</div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">70%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📋 Recent Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
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