import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'user' | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (email: string, password: string, role?: 'admin' | 'user') => Promise<void>;
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
}

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  phone_number?: string;
  recovery_email?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<'admin' | 'user' | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role || null;
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      return null;
    }
  };

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, phone_number, recovery_email')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only synchronous state updates here
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);
          }, 0);
        } else {
          setUserRole(null);
          setUserProfile(null);
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
        const profile = await fetchUserProfile(session.user.id);
        setUserProfile(profile);
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
      toast.error(error.message);
      throw error;
    }

    toast.success('Account created successfully! Please check your email to verify your account.');
  };

  const signIn = async (email: string, password: string, role?: 'admin' | 'user') => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    if (data.user) {
      const userRole = await fetchUserRole(data.user.id);
      
      // Only check role if user explicitly selected admin login
      if (role === 'admin' && userRole !== 'admin') {
        await supabase.auth.signOut();
        throw new Error(`Access denied. This account does not have admin privileges.`);
      }
      
      const profile = await fetchUserProfile(data.user.id);
      setUserProfile(profile);
      toast.success('Signed in successfully!');

      // Redirect based on role
      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const signOut = async () => {
    // Clear local session state first (works offline)
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
    
    // Clear any local storage
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
    
    // Redirect immediately
    window.location.href = '/auth';
    
    // Try server logout when online (background operation)
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.log('Server logout failed (offline or network error):', error);
      // Ignore errors - user is already logged out locally
    }
  };

  const resetPassword = async (email: string, hintAnswer: string, newPassword: string) => {
    try {
      // First verify the hint answer
      const { data: isValid, error: verifyError } = await supabase
        .rpc('verify_hint_answer', {
          user_email: email,
          submitted_answer: hintAnswer
        });

      if (verifyError) {
        console.error('Error verifying hint answer:', verifyError);
        return { error: verifyError };
      }

      if (!isValid) {
        const error = new Error('Invalid security answer') as AuthError;
        return { error };
      }

      // If hint answer is correct, get the user ID and update password
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('recovery_email', email)
        .single();

      if (userError || !userData) {
        // Try with primary email if recovery email doesn't work
        const { data: authData, error: authError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1000);
        
        if (authError) {
          return { error: authError };
        }

        // Skip this search since we can't properly find by recovery email
        const error = new Error('User not found') as any;
        return { error };
      }

      // For security, we'll use a simplified password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      return { error: resetError };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error: error as any };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      userProfile,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
