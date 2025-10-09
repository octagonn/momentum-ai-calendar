import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
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