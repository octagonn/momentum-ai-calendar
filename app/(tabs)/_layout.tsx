import { Tabs } from "expo-router";
import { Image } from "react-native";
import React from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 12,
          paddingTop: 6,
          height: 88,
          elevation: 8,
          shadowColor: colors.text,
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500" as const,
          marginTop: 6,
          lineHeight: 14,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: () => (
            <Image source={require('@/assets/images/home-icon.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: () => (
            <Image source={require('@/assets/images/ai-chat-icon.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: () => (
            <Image source={require('@/assets/images/calendar-icon.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarIcon: () => (
            <Image source={require('@/assets/images/goals-icon.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: () => (
            <Image source={require('@/assets/images/settings-icon.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
          ),
        }}
      />
    </Tabs>
  );
}