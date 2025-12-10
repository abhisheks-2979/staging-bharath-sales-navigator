import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getValidatedCachedUser, clearCachedAuth } from '@/utils/cachedAuthIntegrity';
import { devLog } from '@/utils/devLog';

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

  // When offline, allow access if validated cached user data exists
  // Uses integrity checking to prevent tampered data from granting access
  if (!user) {
    const validatedUser = getValidatedCachedUser();
    if (validatedUser) {
      devLog('✅ Allowing offline access with validated cached user');
      return <>{children}</>;
    }
    
    // Clear any invalid cached data
    clearCachedAuth();
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
