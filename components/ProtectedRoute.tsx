import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useUser } from '@/providers/UserProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useRouter, usePathname } from 'expo-router';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user: authUser, loading: authLoading } = useAuth();
  const { loading: profileLoading, isValidatingSession } = useUser();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = (path: string | null | undefined) => {
    if (!path) return false;
    return (
      path === '/onboarding' ||
      path === '/auth/sign-in' ||
      path.startsWith('/auth/callback') ||
      path.startsWith('/auth/reset-password')
    );
  };

  // Perform navigation effects outside of render to avoid setState during render errors
  useEffect(() => {
    // Avoid redirecting during transient states (e.g., app resume while session/profile is validating)
    if (!authUser && !isPublicRoute(pathname) && !authLoading && !profileLoading && !isValidatingSession) {
      try {
        router.replace('/onboarding');
      } catch (e) {
        console.warn('Navigation to onboarding failed', e);
      }
    }
  }, [authUser, authLoading, profileLoading, isValidatingSession, pathname, router]);

  console.log('🔒 ProtectedRoute state:', { 
    authUser: !!authUser, 
    authLoading, 
    profileLoading,
    isValidatingSession 
  });

  // Safety: If we somehow get stuck in loading for >10s on foreground, bypass with content and let screens self-refresh
  const [stuckTimer, setStuckTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [forceBypass, setForceBypass] = React.useState(false);
  React.useEffect(() => {
    if (authLoading || profileLoading || isValidatingSession) {
      if (stuckTimer) clearTimeout(stuckTimer);
      const t = setTimeout(() => {
        console.warn('ProtectedRoute: loading stuck >10s, bypassing to content to avoid deadlock');
        setForceBypass(true);
      }, 10000);
      setStuckTimer(t);
      return () => { clearTimeout(t); };
    } else {
      if (stuckTimer) clearTimeout(stuckTimer);
      setStuckTimer(null);
      setForceBypass(false);
    }
  }, [authLoading, profileLoading, isValidatingSession]);

  // Show loading screen while loading auth, profile, or validating session
  // Critical: Keep showing loading during session validation to prevent content flash
  if (!forceBypass && (authLoading || profileLoading || isValidatingSession)) {
    console.log('⏳ Showing loading screen');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors?.background || '#ffffff' }]}>
        <ActivityIndicator size="large" color={colors?.primary || '#667eea'} />
      </View>
    );
  }

  // Not authenticated: allow public routes, otherwise redirect to onboarding by default
  if (!authUser) {
    if (isPublicRoute(pathname)) {
      return (
        <View style={{ flex: 1, backgroundColor: colors?.background || '#ffffff' }}>
          {children}
        </View>
      );
    }
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors?.background || '#ffffff' }]}>
        <ActivityIndicator size="large" color={colors?.primary || '#667eea'} />
      </View>
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
