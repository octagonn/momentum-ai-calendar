import { useState, useEffect, useMemo, useCallback } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";

interface Colors {
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  surface: string;
}

export type ThemeMode = 'light' | 'dark' | 'galaxy' | 'system';

interface ThemeContextType {
  isDark: boolean;
  colors: Colors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isGalaxy: boolean;
}

const lightColors: Colors = {
  primary: "#6366f1",
  primaryLight: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  background: "#ffffff",
  card: "#ffffff",
  text: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  error: "#ef4444",
  surface: "#f8fafc",
};

const darkColors: Colors = {
  primary: "#6366f1",
  primaryLight: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  background: "#0f0f23",
  card: "#1a1a2e",
  text: "#ffffff",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  border: "#374151",
  error: "#ef4444",
  surface: "#1e1e3a",
};

export const [ThemeProvider, useTheme] = createContextHook<ThemeContextType>(() => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [isGalaxy, setIsGalaxy] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    // Update isDark and isGalaxy when system theme or themeMode changes
    if (themeMode === 'system') {
      setIsDark(systemColorScheme === 'dark');
      setIsGalaxy(false);
    } else if (themeMode === 'galaxy') {
      setIsDark(true); // Galaxy theme is always dark
      setIsGalaxy(true);
    } else {
      setIsDark(themeMode === 'dark');
      setIsGalaxy(false);
    }
  }, [themeMode, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("themeMode");
      if (savedTheme !== null && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'galaxy' || savedTheme === 'system')) {
        setThemeModeState(savedTheme as ThemeMode);
      } else {
        // Default to system theme
        setThemeModeState('system');
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem("themeMode", mode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = !isDark;
    const newMode: ThemeMode = newTheme ? 'dark' : 'light';
    setThemeModeState(newMode);
    try {
      await AsyncStorage.setItem("themeMode", newMode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, [isDark]);

  return useMemo(() => ({
    isDark,
    colors: isDark ? darkColors : lightColors,
    themeMode,
    setThemeMode,
    toggleTheme,
    isGalaxy,
  }), [isDark, themeMode, setThemeMode, toggleTheme, isGalaxy]);
});