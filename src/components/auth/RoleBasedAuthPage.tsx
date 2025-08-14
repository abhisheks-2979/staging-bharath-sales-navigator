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
  const [authMode, setAuthMode] = useState<AuthMode>('user-signin');
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>('user');

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
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #e3f2fd 0%, #90caf9 30%, #42a5f5 60%, #1976d2 100%)',
        minHeight: '100vh'
      }}
    >
      <Card className="w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-sm border-white/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-56 h-20 rounded-lg overflow-hidden bg-white p-2 border-2 border-primary/20 shadow-lg">
            <img 
              src="/lovable-uploads/4c36505f-db4e-43df-a38e-80e7d29ff090.png" 
              alt="KVP Business Solutions" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold text-primary mb-2">Welcome</CardTitle>
            <CardDescription className="text-lg font-medium text-muted-foreground">
              Sign in to your account
            </CardDescription>
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
                    <div className="font-bold">Admin Sign In</div>
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
              {selectedUserType === 'admin' && (
                <div className="text-center space-y-2">
                  <h1 className="text-xl font-bold">Admin Sign In</h1>
                  <p className="text-muted-foreground text-sm">Full system access</p>
                </div>
              )}
              
              <SignInForm role={selectedUserType as 'admin' | 'user'} />
              
              <div className="flex flex-col gap-2 text-center text-sm">
                {selectedUserType === 'user' && (
                  <button
                    onClick={() => {
                      setSelectedUserType('admin');
                      setAuthMode('admin-signin');
                    }}
                    className="text-primary hover:underline font-bold"
                  >
                    Admin Sign In
                  </button>
                )}
                <button
                  onClick={() => setAuthMode('forgot')}
                  className="text-muted-foreground hover:underline"
                >
                  Forgot your password?
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className="text-muted-foreground hover:underline"
                >
                  Don't have an account? Sign up
                </button>
                {selectedUserType === 'admin' && (
                  <button
                    onClick={() => {
                      setSelectedUserType('user');
                      setAuthMode('user-signin');
                    }}
                    className="text-muted-foreground hover:underline"
                  >
                    Back to user login
                  </button>
                )}
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
                  onClick={() => {
                    setAuthMode('user-signin');
                    setSelectedUserType('user');
                  }}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Back to sign in
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
                  onClick={() => {
                    setAuthMode('user-signin');
                    setSelectedUserType('user');
                  }}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};