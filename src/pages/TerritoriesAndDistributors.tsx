import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import TerritoriesManagement from '@/components/TerritoriesManagement';

const TerritoryMaster = () => {
  const { loading } = useAuth();
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
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="ghost" 
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20 p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Territory Master</h1>
              <p className="text-primary-foreground/80 text-sm sm:text-base mt-1">Manage your territory assignments and regions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <TerritoriesManagement />
        </div>
      </div>
    </div>
  );
};

export default TerritoryMaster;