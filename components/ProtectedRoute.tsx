import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useUser } from '@/providers/UserProvider';
import { AuthScreen } from '@/components/AuthScreen';
import OnboardingScreen from '@/app/components/OnboardingScreen';
import { useTheme } from '@/providers/ThemeProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: profileUser, loading: profileLoading, refreshUser } = useUser();
  const { colors } = useTheme();


  // Show loading screen while loading auth or profile
  if (authLoading || profileLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors?.background || '#ffffff' }]}>
        <ActivityIndicator size="large" color={colors?.primary || '#667eea'} />
      </View>
    );
  }

  // Show auth screen if not authenticated
  if (!authUser) {
    console.log('Showing auth screen');
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  // Show onboarding if authenticated but onboarding not completed
  if (authUser && profileUser && !profileUser.onboardingCompleted) {
    console.log('Showing onboarding screen');
    return (
      <OnboardingScreen 
        onComplete={async () => {
          console.log('Onboarding completed, refreshing user profile');
          // Refresh the user profile to get the updated onboarding_completed status
          await refreshUser();
        }} 
      />
    );
  }

  // Show main app if authenticated and onboarding completed
  return (
    <View style={{ flex: 1, backgroundColor: colors?.background || '#ffffff' }}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
});
