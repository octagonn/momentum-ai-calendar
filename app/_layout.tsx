import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Linking from "expo-linking";
// Removed font imports to fix iOS black screen issue
import { ThemeProvider } from "@/providers/ThemeProvider";
import { UserProvider } from "@/providers/UserProvider";
import { GoalsProvider } from "@/providers/GoalsProvider";
import { SupabaseProvider } from "@/providers/SupabaseProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";
import { NotificationIntegration } from "@/components/NotificationIntegration";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import CentralizedModals from "@/components/CentralizedModals";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    // Handle deep links when app is already open
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received:', url);

      // Parse the URL
      const { hostname, path, queryParams } = Linking.parse(url);
      
      // Handle auth callback deep links
      if (path === 'auth/callback' || hostname === 'auth' || url.includes('/auth/callback')) {
        console.log('Auth callback deep link detected');
        
        // Extract query parameters from the URL manually if needed
        const urlObj = new URL(url.replace('momentum://', 'https://dummy.com/'));
        const access_token = urlObj.searchParams.get('access_token');
        const refresh_token = urlObj.searchParams.get('refresh_token');
        const error_description = urlObj.searchParams.get('error_description');
        
        // Navigate to auth callback with parameters
        const params = new URLSearchParams();
        if (access_token) params.set('access_token', access_token);
        if (refresh_token) params.set('refresh_token', refresh_token);
        if (error_description) params.set('error_description', error_description);
        
        const queryString = params.toString();
        router.push(`/auth/callback${queryString ? `?${queryString}` : ''}`);
      }
    };

    // Get initial URL when app launches from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink({ url });
      }
    });

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function RootLayout() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Add any initialization logic here
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure everything is ready
        await SplashScreen.hideAsync();
        setIsReady(true);
      } catch (e) {
        console.warn('Error during app preparation:', e);
        setIsReady(true); // Still show the app even if there's an error
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <SubscriptionProvider>
              <SupabaseProvider>
                <GoalsProvider>
                  <NotificationProvider>
                    <NotificationIntegration>
                      <ErrorBoundary testID="error-boundary-root">
                        <ProtectedRoute>
                          <RootLayoutNav />
                        </ProtectedRoute>
                        {/* Centralized modals to prevent stacking issues */}
                        <CentralizedModals />
                      </ErrorBoundary>
                    </NotificationIntegration>
                  </NotificationProvider>
                </GoalsProvider>
              </SupabaseProvider>
            </SubscriptionProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}