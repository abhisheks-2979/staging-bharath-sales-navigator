import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, User } from 'lucide-react';

type AuthMode = 'role-selection' | 'admin-signin' | 'user-signin' | 'signup' | 'forgot';
type UserType = 'admin' | 'user';

export const RoleBasedAuthPage = () => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('role-selection');
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleRoleSelection = (role: UserType) => {
    setSelectedUserType(role);
    setAuthMode(role === 'admin' ? 'admin-signin' : 'user-signin');
  };

  const goBackToRoleSelection = () => {
    setAuthMode('role-selection');
    setSelectedUserType(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </CardHeader>
        
        <CardContent>
          {authMode === 'role-selection' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold">Choose Sign In Type</h1>
                <p className="text-muted-foreground text-sm">
                  Select your role to continue
                </p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleRoleSelection('admin')}
                  variant="outline"
                  className="w-full h-14 flex items-center gap-3 text-left"
                >
                  <Shield className="w-5 h-5" />
                  <div>
                    <div className="font-medium">Admin Sign In</div>
                    <div className="text-xs text-muted-foreground">Full system access</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleRoleSelection('user')}
                  variant="outline"
                  className="w-full h-14 flex items-center gap-3 text-left"
                >
                  <User className="w-5 h-5" />
                  <div>
                    <div className="font-medium">User Sign In</div>
                    <div className="text-xs text-muted-foreground">Standard user access</div>
                  </div>
                </Button>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setAuthMode('signup')}
                  className="text-sm text-primary hover:underline"
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </div>
          )}

          {(authMode === 'admin-signin' || authMode === 'user-signin') && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h1 className="text-xl font-semibold">
                  {selectedUserType === 'admin' ? 'Admin' : 'User'} Sign In
                </h1>
                <p className="text-muted-foreground text-sm">
                  Sign in to your {selectedUserType} account
                </p>
              </div>
              
              <SignInForm />
              
              <div className="flex flex-col gap-2 text-center text-sm">
                <button
                  onClick={() => setAuthMode('forgot')}
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </button>
                <button
                  onClick={goBackToRoleSelection}
                  className="text-muted-foreground hover:underline"
                >
                  ← Back to role selection
                </button>
              </div>
            </div>
          )}

          {authMode === 'signup' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h1 className="text-xl font-semibold">Create Account</h1>
                <p className="text-muted-foreground text-sm">
                  Create a new user account
                </p>
              </div>
              
              <SignUpForm />
              
              <div className="text-center">
                <button
                  onClick={goBackToRoleSelection}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  ← Back to sign in
                </button>
              </div>
            </div>
          )}

          {authMode === 'forgot' && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h1 className="text-xl font-semibold">Reset Password</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your details to reset your password
                </p>
              </div>
              
              <ForgotPasswordForm />
              
              <div className="text-center">
                <button
                  onClick={goBackToRoleSelection}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  ← Back to sign in
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};