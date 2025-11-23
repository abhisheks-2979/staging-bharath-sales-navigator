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
    // Check if we're offline - if so, try to get user from localStorage
    if (!navigator.onLine) {
      const cachedUser = localStorage.getItem('cached_user');
      if (cachedUser) {
        // User was authenticated, allow access in offline mode
        return <>{children}</>;
      }
    }
    
    // Also check cached_user even if online (for app scenarios)
    const cachedUser = localStorage.getItem('cached_user');
    if (cachedUser) {
      try {
        JSON.parse(cachedUser); // Validate it's valid JSON
        // User was authenticated, allow access
        return <>{children}</>;
      } catch (e) {
        console.error('Invalid cached user data');
      }
    }
    
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};