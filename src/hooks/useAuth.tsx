import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: 'admin' | 'user' | null;
  signUp: (data: SignUpData) => Promise<{ error: any }>;
  signIn: (email: string, password: string, role?: 'admin' | 'user') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, hintAnswer: string, newPassword: string) => Promise<{ error: any }>;
}

interface SignUpData {
  email: string;
  password: string;
  username: string;
  fullName: string;
  phoneNumber?: string;
  recoveryEmail?: string;
  hintQuestion: string;
  hintAnswer: string;
  role?: 'admin' | 'user';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Function to fetch user role
  const fetchUserRole = async (userId: string): Promise<'admin' | 'user'> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'user';
      }
      
      return data?.role || 'user';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user role when user is authenticated
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
          }, 0);
        } else {
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: SignUpData) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: data.username,
          full_name: data.fullName,
          phone_number: data.phoneNumber,
          recovery_email: data.recoveryEmail,
          hint_question: data.hintQuestion,
          hint_answer: data.hintAnswer,
        },
      },
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string, role?: 'admin' | 'user') => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // If role is specified, verify user has that role
      if (role) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user) {
          const userRole = await fetchUserRole(currentUser.user.id);
          if (userRole !== role) {
            await supabase.auth.signOut();
            toast({
              title: "Access Denied",
              description: `You don't have ${role} permissions.`,
              variant: "destructive",
            });
            return { error: { message: 'Access denied' } };
          }
        }
      }

      toast({
        title: "Success!",
        description: "Signed in successfully!",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string, hintAnswer: string, newPassword: string) => {
    try {
      // First verify the hint answer
      const { data: isValidAnswer, error: verifyError } = await supabase.rpc(
        'verify_hint_answer',
        { user_email: email, submitted_answer: hintAnswer }
      );

      if (verifyError) {
        throw new Error('Failed to verify hint answer');
      }

      if (!isValidAnswer) {
        throw new Error('Incorrect answer to security question');
      }

      // If hint answer is correct, send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?token=true`,
      });

      if (resetError) {
        throw resetError;
      }

      toast({
        title: "Password Reset",
        description: "Please check your email for password reset instructions.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Password Reset Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};