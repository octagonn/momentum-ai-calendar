import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "./AuthProvider";

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
}

interface UserContextType {
  user: User | null;
  loading: boolean;
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
  const { user: authUser } = useAuth();

  useEffect(() => {
    if (authUser) {
      loadUserProfile();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [authUser]);

  const loadUserProfile = async () => {
    if (!authUser) return;

    try {
      setLoading(true);

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
        
        setUser(null);
        return;
      }

      // Convert database profile to our User interface
      const userData: User = {
        id: profile.id,
        name: profile.full_name || '',
        username: profile.username || undefined,
        email: profile.email || authUser.email || '',
        dayStreak: 0, // TODO: Calculate from goals/tasks
        activeGoals: 0, // TODO: Count active goals
        settings: {
          goalReminders: true,
          weeklyReports: true,
          achievementBadges: true,
        },
        onboardingCompleted: profile.onboarding_completed || false,
      };

      setUser(userData);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
        setUser(null);
        return;
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
    await loadUserProfile();
  }, [authUser]);

  return useMemo(() => ({
    user,
    loading,
    updateUser,
    refreshUser,
  }), [user, loading, updateUser, refreshUser]);
});