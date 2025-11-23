import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // When offline, allow access if user data exists in local storage or cache
  // This prevents blocking authenticated users when offline
  if (!user) {
    const cachedUser = localStorage.getItem('cached_user');
    if (cachedUser) {
      try {
        JSON.parse(cachedUser); // Validate it's valid JSON
        console.log('✅ Allowing offline access with cached user');
        return <>{children}</>;
      } catch (e) {
        console.error('Invalid cached user data');
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_user_id');
      }
    }
    
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};