import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, User } from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'admin-signin' | 'user-signin';

export const AuthPage = () => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('user-signin');

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

  const renderAuthModeContent = () => {
    switch (authMode) {
      case 'forgot':
        return (
          <>
            <ForgotPasswordForm />
            <div className="mt-4 text-center">
              <button
                onClick={() => setAuthMode('signin')}
                className="text-sm text-primary hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </>
        );
      
      case 'admin-signin':
        return (
          <>
            <div className="mb-4 text-center">
              <h3 className="text-xl font-semibold text-primary">Admin Sign In</h3>
              <p className="text-sm text-muted-foreground">Full system access</p>
            </div>
            <SignInForm role="admin" />
            <div className="mt-4 text-center space-y-2">
              <button
                onClick={() => setAuthMode('forgot')}
                className="text-sm text-primary hover:underline block w-full"
              >
                Forgot your password?
              </button>
              <button
                onClick={() => setAuthMode('user-signin')}
                className="text-sm text-muted-foreground hover:underline"
              >
                Back to user login
              </button>
            </div>
          </>
        );
      
      case 'user-signin':
        return (
          <>
            <SignInForm role="user" />
            <div className="mt-4 text-center space-y-3">
              <button
                onClick={() => setAuthMode('admin-signin')}
                className="text-sm text-primary hover:underline block w-full"
              >
                Admin Sign In
              </button>
              <button
                onClick={() => setAuthMode('forgot')}
                className="text-sm text-muted-foreground hover:underline block w-full"
              >
                Forgot your password?
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className="text-sm text-muted-foreground hover:underline"
              >
                Don't have an account? Sign up
              </button>
            </div>
          </>
        );
      
      case 'signup':
        return (
          <>
            <SignUpForm />
            <div className="mt-4 text-center">
              <button
                onClick={() => setAuthMode('user-signin')}
                className="text-sm text-muted-foreground hover:underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        );
      
      default:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                onClick={() => setAuthMode('admin-signin')}
                className="h-16 flex flex-col items-center justify-center space-y-2"
              >
                <Shield className="h-6 w-6" />
                <span>Admin Sign In</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setAuthMode('user-signin')}
                className="h-16 flex flex-col items-center justify-center space-y-2"
              >
                <User className="h-6 w-6" />
                <span>User Sign In</span>
              </Button>
            </div>
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground mb-2">Don't have an account?</p>
              <button
                onClick={() => setAuthMode('signup')}
                className="text-sm text-primary hover:underline"
              >
                Sign up here
              </button>
            </div>
          </div>
        );
    }
  };

  console.log('AuthPage rendering, authMode:', authMode);
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: 'linear-gradient(135deg, #e0f2fe 0%, #81d4fa 25%, #29b6f6 50%, #0288d1 75%, #01579b 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Geometric pattern overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 2px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px, 25px 25px'
        }}
      ></div>
      
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-white/20 bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-40 h-24 rounded-lg overflow-hidden bg-white p-3 border-2 border-primary/20 shadow-lg">
            <img 
              src="/lovable-uploads/f1a677a5-6652-4477-972d-8c634cd05cd0.png" 
              alt="Bharath Beverages" 
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error('Image failed to load:', e);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log('Image loaded successfully')}
            />
          </div>
          <div>
            <CardTitle className="text-4xl font-bold text-primary mb-2">Welcome</CardTitle>
            <CardDescription className="text-lg font-medium text-muted-foreground">
              Select your role to continue
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {renderAuthModeContent()}
        </CardContent>
      </Card>
    </div>
  );
};