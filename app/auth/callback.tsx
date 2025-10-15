import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase-client';
import * as Linking from 'expo-linking';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get URL parameters - they might come from deep link or route params
        const access_token = params.access_token as string;
        const refresh_token = params.refresh_token as string;
        const type = params.type as string;
        const error_description = params.error_description as string;
        
        // Check if there's an error in the URL
        if (error_description) {
          console.error('Auth error from URL:', error_description);
          setError(error_description);
          setLoading(false);
          return;
        }

        // If we have tokens in the URL, set the session
        if (access_token && refresh_token) {
          console.log('Setting session from URL tokens');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError(sessionError.message);
          } else if (data.session) {
            console.log('Session set successfully, user:', data.session.user?.email);
            // Small delay to ensure session is persisted
            await new Promise(resolve => setTimeout(resolve, 500));
            router.replace('/(tabs)/(home)/home');
          } else {
            setError('Failed to create session');
          }
        } else {
          // No tokens in URL, check if we already have a session
          const { data, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('Auth callback error:', sessionError);
            setError(sessionError.message);
          } else if (data.session) {
            console.log('Existing session found, user:', data.session.user?.email);
            router.replace('/(tabs)/(home)/home');
          } else {
            setError('No session found. Please sign in again.');
          }
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, params]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8e44ad" />
        <Text style={styles.text}>Verifying your email...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.text}>Please try again or contact support.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  text: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ff6b6b',
    marginBottom: 16,
    textAlign: 'center',
  },
});
