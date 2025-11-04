import React from 'react';
import { AuthScreen } from '@/components/AuthScreen';
import { useRouter } from 'expo-router';

export default function SignInRoute() {
  const router = useRouter();
  return (
    <AuthScreen
      onAuthSuccess={() => {
        try {
          router.replace('/');
        } catch (e) {}
      }}
      onSignUpRequest={() => {
        try {
          router.replace('/onboarding');
        } catch (e) {}
      }}
    />
  );
}


