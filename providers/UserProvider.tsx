import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "./AuthProvider";
import { validateDayStreak, checkAndUpdateDayStreak } from "@/services/dayStreakService";

interface UserSettings {
  goalReminders: boolean;
  weeklyReports: boolean;
  achievementBadges: boolean;
}

interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  dayStreak: number;
  activeGoals: number;
  settings: UserSettings;
  onboardingCompleted: boolean;
  isPremium?: boolean;
  subscriptionTier?: 'free' | 'premium' | 'family';
  subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'trialing';
  trialEndsAt?: string;
  // Optional demographics/biometrics for personalization
  age?: number | null;
  gender?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dateOfBirth?: string | null; // YYYY-MM-DD
  unitSystem?: 'imperial' | 'metric';
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  isValidatingSession: boolean;
  hydrated: boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const defaultUser: User = {
  id: "",
  name: "",
  email: "",
  dayStreak: 0,
  activeGoals: 0,
  settings: {
    goalReminders: true,
    weeklyReports: true,
    achievementBadges: true,
  },
  onboardingCompleted: false,
};

export const [UserProvider, useUser] = createContextHook<UserContextType>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const hasShownTimeWarning = useRef(false);
  const lastWarningTime = useRef(0);
  const isValidatingRef = useRef(false);
  const validationTimeoutRef = useRef(null as any);
  const VALIDATION_TIMEOUT_MS = 12000;
  const { user: authUser } = useAuth();
  const isBackgroundRefreshingRef = useRef(false);

  useEffect(() => {
    if (authUser) {
      // Prevent duplicate validation calls
      if (!isValidatingRef.current) {
        isValidatingRef.current = true;
        setIsValidatingSession(true);
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
        validationTimeoutRef.current = setTimeout(() => {
          console.warn('UserProvider: session validation watchdog timeout; resetting state.');
          isValidatingRef.current = false;
          setIsValidatingSession(false);
          setLoading(false);
        }, VALIDATION_TIMEOUT_MS);

        loadUserProfile().finally(() => {
          isValidatingRef.current = false;
          setIsValidatingSession(false);
          setLoading(false);
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
            validationTimeoutRef.current = null;
          }
        });
      }
    } else {
      setUser(null);
      setLoading(false);
      setIsValidatingSession(false);
      setHydrated(false);
      // Reset warning flag when user logs out
      hasShownTimeWarning.current = false;
      lastWarningTime.current = 0;
      isValidatingRef.current = false;
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    }
  }, [authUser]);

  // Failsafe to prevent infinite loading if validation gets stuck
  useEffect(() => {
    if (isValidatingSession) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      validationTimeoutRef.current = setTimeout(() => {
        console.warn('UserProvider: validation stuck; auto-resetting loading state.');
        isValidatingRef.current = false;
        setIsValidatingSession(false);
        setLoading(false);
      }, VALIDATION_TIMEOUT_MS);
      return () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
          validationTimeoutRef.current = null;
        }
      };
    } else {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    }
  }, [isValidatingSession]);

  // Helper function to show time warning alert (only once)
  const showTimeWarningAlert = useCallback(() => {
    const now = Date.now();
    const timeSinceLastWarning = now - lastWarningTime.current;
    
    // Only show if we haven't shown it before, or if it's been more than 5 minutes
    if (!hasShownTimeWarning.current || timeSinceLastWarning > 5 * 60 * 1000) {
      hasShownTimeWarning.current = true;
      lastWarningTime.current = now;
      
      Alert.alert(
        'Login Session Invalid',
        'Your login session has expired, possibly due to incorrect device date/time settings. Please ensure your device time is set correctly and log in again.',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  }, []);

  // Handle app state changes and refresh session to handle time changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: any) => {
      if (nextAppState === 'active' && authUser) {
        console.log('UserProvider: App became active - refreshing session (non-blocking)...');

        try {
          // Avoid overlapping validations on resume
          if (isValidatingRef.current || isValidatingSession) {
            return;
          }
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error) {
            // Non-destructive: do not sign out on transient refresh errors
            console.warn('Session refresh failed on resume (ignored):', error?.message || error);
            return;
          }
          if (session) {
            console.log('UserProvider: Session refreshed on resume, starting background user refresh');
            // Perform a non-blocking user/profile refresh so UI is not gated
            backgroundRefreshUser().catch((e) => {
              console.warn('UserProvider: background refresh failed:', e);
            });
          }
        } catch (error) {
          console.warn('Error refreshing session on resume (ignored):', error);
        }
      }
    };

    const { AppState } = require('react-native');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [authUser, isValidatingSession]);

  const loadUserProfile = async () => {
    if (!authUser) {
      setLoading(false);
      setIsValidatingSession(false);
      return;
    }

    try {
      // Keep loading true during entire validation
      setLoading(true);
      setIsValidatingSession(true);

      // Early session validity check to prevent showing content with invalid session
      console.log('🔐 Starting session validation...');
      const { data: { session: currentSession }, error: sessionCheckError } = await supabase.auth.getSession();
      
      if (sessionCheckError || !currentSession) {
        console.log('⚠️ Session check failed - attempting refresh...');
        
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          // Session is completely invalid
            if (refreshError?.message?.includes('Auth session missing') || 
                refreshError?.message?.includes('refresh_token') ||
                refreshError?.name === 'AuthSessionMissingError') {
              console.log('❌ Session is completely invalid during initial check - signing out...');
              
              showTimeWarningAlert();
              
              await supabase.auth.signOut();
              setUser(null);
              setLoading(false);
              setIsValidatingSession(false);
              return;
          }
        } else {
          console.log('✅ Session refreshed successfully');
        }
      } else {
        console.log('✅ Session is valid');
      }

      // Fetch user profile from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          await createUserProfile();
          return;
        }
        
        // Handle RLS policy violations or JWT errors (can happen with time changes)
        if (error.code === '42501' || error.message?.includes('JWT')) {
          console.log('Authentication error detected - attempting to refresh session...');
          
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            console.error('Session refresh failed:', refreshError);
            
            // If session is completely missing/invalid, sign out and clear state
            if (refreshError?.message?.includes('Auth session missing') || 
                refreshError?.message?.includes('refresh_token') ||
                refreshError?.name === 'AuthSessionMissingError') {
              console.log('Session is completely invalid - signing out user...');
              
              showTimeWarningAlert();
              
              // Sign out to clear invalid session
              await supabase.auth.signOut();
              setUser(null);
              setLoading(false);
              setIsValidatingSession(false);
              return;
            }
            
            setUser(null);
            return;
          }
          
          console.log('Session refreshed successfully, retrying profile fetch...');
          
          // Retry fetching the profile
          const { data: retryProfile, error: retryError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (retryError) {
            console.error('Retry failed:', retryError);
            if (retryError.code === 'PGRST116') {
              await createUserProfile();
              return;
            }
            setUser(null);
            return;
          }
          
          // Validate and update streak for retry case as well
          await validateDayStreak(authUser.id);
          const retryStreak = await checkAndUpdateDayStreak(authUser.id);

          // Count active goals
          const { count: retryActiveGoalsCount } = await supabase
            .from('goals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)
            .in('status', ['active', 'in_progress']);

          // Use the retry profile data
          const userData: User = {
            id: retryProfile.id,
            name: retryProfile.full_name || '',
            username: retryProfile.username || undefined,
            email: retryProfile.email || authUser.email || '',
            dayStreak: retryStreak,
            activeGoals: retryActiveGoalsCount || 0,
            settings: {
              goalReminders: true,
              weeklyReports: true,
              achievementBadges: true,
            },
            onboardingCompleted: retryProfile.onboarding_completed || false,
            isPremium: retryProfile.is_premium || retryProfile.subscription_tier === 'premium' || false,
            subscriptionTier: retryProfile.subscription_tier || 'free',
            subscriptionStatus: retryProfile.subscription_status || 'expired',
            trialEndsAt: retryProfile.trial_ends_at || undefined,
          };
          
          setUser(userData);
          return;
        }
        
        setUser(null);
        return;
      }

      // If user just verified and we have preauth onboarding data, apply it BEFORE building user data
      let effectiveProfile = profile;
      try {
        const preauthRaw = await AsyncStorage.getItem('preauth_onboarding_profile');
        if (preauthRaw) {
          const raw = await AsyncStorage.getItem('preauth_onboarding_profile');
          if (raw) {
            const pending = JSON.parse(raw);
            const base: any = {
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            };
            if (pending.full_name) base.full_name = pending.full_name;
            if (pending.username) base.username = pending.username;

            // Upsert base fields (id/email required for insert)
            const { error: upsertErr } = await supabase
              .from('user_profiles')
              .upsert({ id: authUser.id, email: authUser.email, ...base }, { onConflict: 'id' });
            if (upsertErr) {
              console.warn('Preauth upsert failed:', upsertErr);
            }

            // Optional fields best-effort; ignore unknown column errors
            const optionalKeys: Array<[string, any]> = [
              ['date_of_birth', pending.date_of_birth],
              ['age', pending.age],
              ['gender', pending.gender],
              ['height_cm', pending.height_cm],
              ['weight_kg', pending.weight_kg],
              ['unit_system', pending.unit_system],
            ];
            for (const [key, value] of optionalKeys) {
              if (value === undefined || value === null || value === '') continue;
              const { error: optErr } = await supabase
                .from('user_profiles')
                .update({ [key]: value } as any)
                .eq('id', authUser.id);
              if (optErr) {
                console.warn('Preauth optional update failed:', key, optErr);
              }
            }

            // Re-fetch profile so UI reflects latest values immediately
            const { data: refreshed, error: refetchErr } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', authUser.id)
              .single();
            if (!refetchErr && refreshed) {
              effectiveProfile = refreshed;
            }

            // Clear temp preauth data after use to avoid re-applying
            await AsyncStorage.removeItem('preauth_onboarding_profile');
          }
        }
      } catch (e) {
        console.warn('Failed to apply preauth onboarding profile:', e);
      }

      // Validate and update streak (checks for missed days and updates for today)
      console.log('🔥 Validating day streak...');
      await validateDayStreak(authUser.id);
      const currentStreak = await checkAndUpdateDayStreak(authUser.id);
      console.log('🔥 Current streak:', currentStreak);

      // Count active goals
      const { count: activeGoalsCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .in('status', ['active', 'in_progress']);

      // If user just verified and we have preauth onboarding data, apply it once
      try {
        const preauthFlag = await AsyncStorage.getItem('preauth_onboarding_done');
        if (preauthFlag === 'true') {
          const raw = await AsyncStorage.getItem('preauth_onboarding_profile');
          if (raw) {
            const pending = JSON.parse(raw);
            const base: any = {
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            };
            if (pending.full_name) base.full_name = pending.full_name;
            if (pending.username) base.username = pending.username;
            await supabase.from('user_profiles').upsert({ id: authUser.id, email: authUser.email, ...base }, { onConflict: 'id' });
            const optionalKeys: Array<[string, any]> = [
              ['date_of_birth', pending.date_of_birth],
              ['age', pending.age],
              ['gender', pending.gender],
              ['height_cm', pending.height_cm],
              ['weight_kg', pending.weight_kg],
              ['unit_system', pending.unit_system],
            ];
            for (const [key, value] of optionalKeys) {
              if (value === undefined || value === null || value === '') continue;
              await supabase.from('user_profiles').update({ [key]: value } as any).eq('id', authUser.id);
            }
            await AsyncStorage.removeItem('preauth_onboarding_profile');
            await AsyncStorage.removeItem('preauth_onboarding_done');
          }
        }
      } catch (e) {
        console.warn('Failed to apply preauth onboarding profile:', e);
      }

      // Convert database profile to our User interface (use effectiveProfile which includes preauth updates)
      const userData: User = {
        id: effectiveProfile.id,
        name: effectiveProfile.full_name || '',
        username: effectiveProfile.username || undefined,
        email: effectiveProfile.email || authUser.email || '',
        dayStreak: currentStreak,
        activeGoals: activeGoalsCount || 0,
        settings: {
          goalReminders: true,
          weeklyReports: true,
          achievementBadges: true,
        },
        onboardingCompleted: effectiveProfile.onboarding_completed || false,
        isPremium: (
          (effectiveProfile.subscription_tier === 'premium' || effectiveProfile.subscription_tier === 'family') &&
          (effectiveProfile.subscription_status === 'active' || effectiveProfile.subscription_status === 'trialing')
        ) || false,
        subscriptionTier: effectiveProfile.subscription_tier || 'free',
        subscriptionStatus: effectiveProfile.subscription_status || 'expired',
        trialEndsAt: effectiveProfile.trial_ends_at || undefined,
        age: effectiveProfile.age ?? null,
        gender: effectiveProfile.gender ?? null,
        heightCm: effectiveProfile.height_cm ?? null,
        weightKg: effectiveProfile.weight_kg ?? null,
        dateOfBirth: effectiveProfile.date_of_birth ?? null,
        unitSystem: effectiveProfile.unit_system || 'metric',
      };

      setUser(userData);
      setHydrated(true);
      console.log('✅ User profile loaded successfully');
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setIsValidatingSession(false);
    }
  };

  // Non-blocking, lightweight refresh used on app resume. Never toggles loading/isValidatingSession.
  const backgroundRefreshUser = useCallback(async () => {
    if (!authUser) return;
    if (isBackgroundRefreshingRef.current) return;
    isBackgroundRefreshingRef.current = true;
    try {
      console.log('UserProvider: backgroundRefreshUser started');
      const { data: { session: currentSession }, error: sessionCheckError } = await supabase.auth.getSession();
      if (sessionCheckError || !currentSession) {
        console.log('UserProvider: background refresh - no valid session, skipping');
        return;
      }

      // Fetch profile only; skip preauth updates and heavy streak logic for speed
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (error) {
        console.warn('UserProvider: background refresh profile error (ignored):', error?.message || error);
        return;
      }

      const userData: any = {
        id: profile.id,
        name: profile.full_name || '',
        username: profile.username || undefined,
        email: profile.email || authUser.email || '',
        // Preserve existing quick stats if available to avoid flicker
        dayStreak: (typeof (profile as any).day_streak === 'number') ? (profile as any).day_streak : (user?.dayStreak ?? 0),
        activeGoals: user?.activeGoals ?? 0,
        settings: {
          goalReminders: true,
          weeklyReports: true,
          achievementBadges: true,
        },
        onboardingCompleted: profile.onboarding_completed || false,
        isPremium: (
          (profile.subscription_tier === 'premium' || profile.subscription_tier === 'family') &&
          (profile.subscription_status === 'active' || profile.subscription_status === 'trialing')
        ) || false,
        subscriptionTier: profile.subscription_tier || 'free',
        subscriptionStatus: profile.subscription_status || 'expired',
        trialEndsAt: profile.trial_ends_at || undefined,
        age: profile.age ?? null,
        gender: profile.gender ?? null,
        heightCm: profile.height_cm ?? null,
        weightKg: profile.weight_kg ?? null,
        dateOfBirth: profile.date_of_birth ?? null,
        unitSystem: profile.unit_system || 'metric',
      };

      setUser(prev => ({ ...(prev || {} as any), ...userData }));
      setHydrated(true);
      console.log('UserProvider: backgroundRefreshUser finished');
    } finally {
      isBackgroundRefreshingRef.current = false;
    }
  }, [authUser, user]);

  const createUserProfile = async () => {
    if (!authUser) return;

    try {
      console.log('Creating user profile for:', authUser.id);

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.email, // Default to email, will be updated in onboarding
          onboarding_completed: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        
        // Handle RLS policy violation (error code 42501)
        // This can happen when auth tokens are invalid (e.g., device time changed)
        if (error.code === '42501') {
          console.log('RLS policy violation detected - attempting to refresh session...');
          
          // Try to refresh the session
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            console.error('Session refresh failed:', refreshError);
            
            // If session is completely missing/invalid, sign out and clear state
            if (refreshError?.message?.includes('Auth session missing') || 
                refreshError?.message?.includes('refresh_token') ||
                refreshError?.name === 'AuthSessionMissingError') {
              console.log('Session is completely invalid - signing out user...');
              
              showTimeWarningAlert();
              
              // Sign out to clear invalid session
              await supabase.auth.signOut();
              setUser(null);
              return;
            }
            
            // Session is invalid, user needs to re-authenticate
            setUser(null);
            return;
          }
          
          console.log('Session refreshed successfully, retrying profile creation...');
          
          // Retry the profile creation with refreshed session
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.email,
              onboarding_completed: false,
            })
            .select()
            .single();
          
          if (retryError) {
            console.error('Retry failed:', retryError);
            setUser(null);
            return;
          }
        } else {
          setUser(null);
          return;
        }
      }

      // Load the newly created profile
      await loadUserProfile();
    } catch (error) {
      console.error('Error creating user profile:', error);
      setUser(null);
    }
  };

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!user || !authUser) return;

    try {
      console.log('Updating user profile:', updates);

      // Update in database
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.full_name = updates.name;
      if (updates.username !== undefined) dbUpdates.username = updates.username;
      if (updates.onboardingCompleted !== undefined) dbUpdates.onboarding_completed = updates.onboardingCompleted;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.heightCm !== undefined) dbUpdates.height_cm = updates.heightCm;
      if (updates.weightKg !== undefined) dbUpdates.weight_kg = updates.weightKg;
      if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
      if (updates.unitSystem !== undefined) dbUpdates.unit_system = updates.unitSystem;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('user_profiles')
        .update(dbUpdates)
        .eq('id', authUser.id);

      if (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);

      // Also save to local storage for offline access
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [user, authUser]);

  const refreshUser = useCallback(async () => {
    if (isValidatingRef.current || isValidatingSession) return;
    isValidatingRef.current = true;
    setIsValidatingSession(true);
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    validationTimeoutRef.current = setTimeout(() => {
      console.warn('UserProvider: refreshUser validation watchdog timeout; resetting state.');
      isValidatingRef.current = false;
      setIsValidatingSession(false);
      setLoading(false);
    }, VALIDATION_TIMEOUT_MS);
    try {
      await loadUserProfile();
    } finally {
      isValidatingRef.current = false;
      setIsValidatingSession(false);
      setLoading(false);
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
    }
  }, [authUser, isValidatingSession]);

  return useMemo(() => ({
    user,
    loading: loading || isValidatingSession, // Keep loading true during session validation
    isValidatingSession,
    hydrated,
    updateUser,
    refreshUser,
  }), [user, loading, isValidatingSession, hydrated, updateUser, refreshUser]);
});