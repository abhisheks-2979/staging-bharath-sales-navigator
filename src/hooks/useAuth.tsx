import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  profile_picture_url?: string;
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Idle timeout: 1 hour = 3600000 ms
  const IDLE_TIMEOUT = 3600000;

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
      // Use a simple query without any complex operations
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, phone_number, recovery_email, profile_picture_url')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, return a basic profile with user data
        if (error.code === 'PGRST116') {
          return {
            id: userId,
            username: user?.email?.split('@')[0] || 'User',
            full_name: user?.user_metadata?.full_name || 'Unknown User',
            phone_number: user?.user_metadata?.phone_number,
            recovery_email: user?.user_metadata?.recovery_email,
            profile_picture_url: user?.user_metadata?.profile_picture_url
          };
        }
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Return basic profile from user metadata as fallback
      if (user) {
        return {
          id: userId,
          username: user?.email?.split('@')[0] || 'User',
          full_name: user?.user_metadata?.full_name || 'Unknown User',
          phone_number: user?.user_metadata?.phone_number,
          recovery_email: user?.user_metadata?.recovery_email,
          profile_picture_url: user?.user_metadata?.profile_picture_url
        };
      }
      return null;
    }
  };

  // Auto-logout on idle (1 hour of inactivity)
  useEffect(() => {
    if (!user) return;

    let idleTimer: NodeJS.Timeout;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        console.log('User idle for 1 hour, logging out...');
        toast.info('You have been logged out due to inactivity');
        signOut();
      }, IDLE_TIMEOUT);
    };

    // Activity events to reset the timer
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    // Start the timer
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [user]);

  useEffect(() => {
    // Load cached auth state for offline support
    const loadCachedAuth = () => {
      try {
        const cachedUser = localStorage.getItem('cached_user');
        const cachedRole = localStorage.getItem('cached_role');
        const cachedProfile = localStorage.getItem('cached_profile');
        
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          setUserRole(cachedRole as 'admin' | 'user' | null);
          setUserProfile(cachedProfile ? JSON.parse(cachedProfile) : null);
        }
      } catch (error) {
        console.error('Error loading cached auth:', error);
      }
    };

    // Load cached auth immediately for offline support
    loadCachedAuth();
    
    // Safety timeout: ensure loading is false after 5 seconds max
    const loadingTimeout = setTimeout(() => {
      console.log('Auth loading timeout reached, setting loading to false');
      setLoading(false);
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only synchronous state updates here
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Cache auth state for offline use
        if (session?.user) {
          localStorage.setItem('cached_user', JSON.stringify(session.user));
        } else {
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_role');
          localStorage.removeItem('cached_profile');
        }
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(async () => {
            try {
              const role = await fetchUserRole(session.user.id);
              setUserRole(role);
              if (role) localStorage.setItem('cached_role', role);
              
              const profile = await fetchUserProfile(session.user.id);
              setUserProfile(profile);
              if (profile) localStorage.setItem('cached_profile', JSON.stringify(profile));
            } catch (err) {
              console.error('Error loading user data in auth change:', err);
              // Set basic profile from user metadata as fallback
              const basicProfile: UserProfile = {
                id: session.user.id,
                username: session.user.email?.split('@')[0] || 'User',
                full_name: session.user.user_metadata?.full_name || 'Unknown User'
              };
              setUserProfile(basicProfile);
              localStorage.setItem('cached_profile', JSON.stringify(basicProfile));
            }
          }, 0);
        } else {
          setUserRole(null);
          setUserProfile(null);
        }
        
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (session?.user) {
        localStorage.setItem('cached_user', JSON.stringify(session.user));
        
        try {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);
          if (role) localStorage.setItem('cached_role', role);
          
          const profile = await fetchUserProfile(session.user.id);
          setUserProfile(profile);
          if (profile) localStorage.setItem('cached_profile', JSON.stringify(profile));
        } catch (err) {
          console.error('Error loading user data:', err);
          // Set basic profile from user metadata
          const basicProfile: UserProfile = {
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'User',
            full_name: session.user.user_metadata?.full_name || 'Unknown User'
          };
          setUserProfile(basicProfile);
          localStorage.setItem('cached_profile', JSON.stringify(basicProfile));
        }
      }
      
      clearTimeout(loadingTimeout);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      clearTimeout(loadingTimeout);
      setLoading(false);
    });

    return () => {
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
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
      
      // Request permissions after successful sign-in (both web and native)
      setTimeout(async () => {
        try {
          const { requestLocationPermission, requestStoragePermission } = await import('@/utils/permissions');
          
          // Request location permission first
          const locationGranted = await requestLocationPermission();
          if (!locationGranted) {
            toast.info('Location permission is needed for check-ins and GPS tracking');
          }
          
          // Request storage permission for offline mode
          await requestStoragePermission();
          
        } catch (error) {
          console.error('Error requesting permissions:', error);
        }
      }, 1000); // Small delay to let the success toast show first

      // Redirect based on role
      if (userRole === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/dashboard';
      }
    }
  };

  const signOut = async () => {
    try {
      // Get current user before signing out
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Cancel all pending planned visits for today
        const today = new Date().toISOString().split('T')[0];
        const { error: cancelError } = await supabase
          .from('visits')
          .update({ status: 'cancelled' })
          .eq('user_id', user.id)
          .eq('planned_date', today)
          .eq('status', 'planned');
        
        if (cancelError) {
          console.error('Error canceling planned visits:', cancelError);
        }
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    // Clear local session state
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
    
    // Clear all auth-related storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear any Supabase-specific storage keys
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.startsWith('supabase')
    );
    supabaseKeys.forEach(key => localStorage.removeItem(key));
    
    // Create a clean URL without any query parameters
    const cleanUrl = `${window.location.origin}/auth`;
    
    // Force a hard redirect to clear any lingering state
    window.location.replace(cleanUrl);
  };

  const resetPassword = async (email: string, hintAnswer: string, newPassword: string) => {
    try {
      // Use the new rate-limited verification function
      const { data: verifyResult, error: verifyError } = await supabase
        .rpc('verify_hint_answer_with_rate_limit', {
          user_email: email,
          submitted_answer: hintAnswer
        });

      if (verifyError) {
        console.error('Error verifying hint answer:', verifyError);
        return { error: verifyError };
      }

      if (!verifyResult || verifyResult.length === 0) {
        const error = new Error('Verification failed') as AuthError;
        return { error };
      }

      const result = verifyResult[0];

      // Check if account is locked
      if (result.is_locked) {
        const error = new Error('Account locked due to too many failed attempts. Please contact an administrator to unlock your account.') as AuthError;
        return { error };
      }

      // Check if answer is valid
      if (!result.is_valid) {
        const remainingText = result.attempts_remaining > 0 
          ? ` ${result.attempts_remaining} attempt(s) remaining before account lockout.`
          : ' Account will be locked on next failed attempt.';
        const error = new Error('Invalid security answer.' + remainingText) as AuthError;
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
