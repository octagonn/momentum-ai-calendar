import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase-client";

interface UserSettings {
  goalReminders: boolean;
  weeklyReports: boolean;
  achievementBadges: boolean;
}

interface User {
  name: string;
  email: string;
  dayStreak: number;
  activeGoals: number;
  settings: UserSettings;
}

interface UserContextType {
  user: User;
  updateUser: (updates: Partial<User>) => void;
}

const defaultUser: User = {
  name: "",
  email: "",
  dayStreak: 0,
  activeGoals: 0,
  settings: {
    goalReminders: true,
    weeklyReports: true,
    achievementBadges: true,
  },
};

export const [UserProvider, useUser] = createContextHook<UserContextType>(() => {
  console.log('UserProvider initializing');
  const [user, setUser] = useState<User>(defaultUser);

  useEffect(() => {
    // For now, just load from local storage
    // In a real app, you'd implement user authentication with Supabase Auth
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser !== null) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    
    try {
      // Save locally
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      
      // In a real app, you'd also update the user in Supabase
      // For now, we'll just use local storage
    } catch (error) {
      console.error("Error saving user:", error);
    }
  }, [user]);

  return useMemo(() => ({
    user,
    updateUser,
  }), [user, updateUser]);
});