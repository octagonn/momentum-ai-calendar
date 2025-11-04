import React from 'react';
import OnboardingScreen from '@/app/components/OnboardingScreen';
import { useRouter } from 'expo-router';

export default function OnboardingRoute() {
  const router = useRouter();
  return (
    <OnboardingScreen onComplete={() => {
      try {
        router.replace('/auth/sign-in');
      } catch (e) {}
    }} />
  );
}


