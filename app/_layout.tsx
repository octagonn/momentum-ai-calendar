import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
        console.log('App preparing...');
        // Add any initialization logic here
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure everything is ready
        console.log('App ready, hiding splash screen');
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
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.container}>
          <ThemeProvider>
            <UserProvider>
              <SupabaseProvider>
                <GoalsProvider>
                  <ErrorBoundary testID="error-boundary-root">
                    <RootLayoutNav />
                  </ErrorBoundary>
                </GoalsProvider>
              </SupabaseProvider>
            </UserProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}