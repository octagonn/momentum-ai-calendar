import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resendVerification: (email: string) => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('AuthProvider: initial session user:', session?.user?.id || 'none');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: onAuthStateChange', event, 'user:', session?.user?.id || 'none');
        setSession(session);
        // Keep user object stable when ID is unchanged to avoid heavy downstream effects on TOKEN_REFRESHED
        setUser((prev) => {
          const next = session?.user ?? null;
          if ((prev?.id ?? null) === (next?.id ?? null)) return prev;
          return next;
        });
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();
      // Defensive: block sign up if age provided is under 13
      const age = typeof metadata?.age === 'number' ? metadata.age : undefined;
      if (age !== undefined && age < 13) {
        return { error: { name: 'AuthError', message: 'You must be at least 13 years old to create an account.' } as AuthError };
      }
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : 'momentum://auth/callback';
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          emailRedirectTo: redirectTo,
          data: metadata,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPassword = (password || '').trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });
      // If credentials rejected on web, hint verification path
      if (error && Platform.OS === 'web' && /invalid login credentials/i.test(error.message)) {
        console.warn('Sign in failed with invalid credentials; user may need to verify email.');
      }
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : 'momentum://auth/callback';

      // 1) Primary: resend sign-up verification
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (!resendError) return { error: null };

      // 2) Fallback: calling signUp again on an unverified user re-sends confirmation
      // Note: password is required by API but ignored for existing unverified accounts
      const dummyPassword = Math.random().toString(36).slice(2) + 'Aa1!';
      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: dummyPassword,
        options: { emailRedirectTo: redirectTo },
      });
      if (!signUpError) return { error: null };

      // 3) Last resort: send a magic-link (does not create user) to get them in
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      return { error: otpError ?? signUpError ?? resendError };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://momentumaicalendar.com/reset-password.html',
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const refreshSession = async () => {
    try {
      console.log('AuthProvider: Refreshing session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
      } else {
        console.log('AuthProvider: Session refreshed:', session ? 'Success' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
      }
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resendVerification,
    resetPassword,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
