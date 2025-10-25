import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Check } from 'lucide-react-native';
import { Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const { user, signUp, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDobPicker, setShowDobPicker] = useState<boolean>(false);
  const [gender, setGender] = useState<string>('');
  const [useMetric, setUseMetric] = useState<boolean>(false);
  const [heightFt, setHeightFt] = useState<string>('');
  const [heightIn, setHeightIn] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightLb, setWeightLb] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const scrollRef = useRef<ScrollView | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [lastResendAt, setLastResendAt] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  const MIN_AGE_YEARS = 13;

  const computeAgeFromDate = (birthDate: Date): number => {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const steps = [
    {
      title: "Welcome to Momentum!",
      subtitle: "Let's set up your profile to get started",
      content: "welcome"
    },
    {
      title: "What's your name?",
      subtitle: "This will be displayed in your profile",
      content: "name"
    },
    {
      title: "Choose a username",
      subtitle: "This will be your unique identifier",
      content: "username"
    },
    {
      title: "Your details",
      subtitle: "You must be at least 13 years old to use Momentum",
      content: "about"
    },
    {
      title: "Body metrics (optional)",
      subtitle: "Used only for plan personalization",
      content: "metrics"
    },
    {
      title: "What's your email?",
      subtitle: "We'll create your account with this email",
      content: "email"
    },
    {
      title: "Create a password",
      subtitle: "Enter and confirm your password",
      content: "password"
    },
    {
      title: "All set!",
      subtitle: "Check your email to verify your account",
      content: "verify"
    }
  ];

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found, username is available
        return true;
      }
      
      if (error) {
        // In pre-auth mode RLS may block; allow proceed instead of failing
        console.warn('Username check skipped due to error:', error);
        return true;
      }

      // Username exists
      return false;
    } catch (error) {
      console.warn('Username availability check error:', error);
      return true;
    }
  };

  const handleUsernameChange = async (text: string) => {
    setUsername(text);
    setUsernameError('');

    if (text.length >= 3) {
      const isAvailable = await checkUsernameAvailability(text);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
      }
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Name step
      if (!fullName.trim()) {
        Alert.alert('Required', 'Please enter your name');
        return;
      }
    } else if (currentStep === 2) {
      // Username step
      if (!username.trim()) {
        Alert.alert('Required', 'Please enter a username');
        return;
      }
      if (username.length < 3) {
        Alert.alert('Invalid Username', 'Username must be at least 3 characters long');
        return;
      }
      if (usernameError) {
        Alert.alert('Username Taken', 'Please choose a different username');
        return;
      }
    } else if (currentStep === 3) {
      // About step - require DOB and enforce 13+
      if (!dob) {
        Alert.alert('Required', 'Please enter your date of birth to continue');
        return;
      }
      const age = computeAgeFromDate(dob);
      if (age < MIN_AGE_YEARS) {
        Alert.alert('Age Restriction', 'You must be at least 13 years old to create an account.');
        return;
      }
    } else if (currentStep === 5) {
      // Email step
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
        return;
      }
    } else if (currentStep === 6) {
      // Password step
      if (password.length < 6) {
        Alert.alert('Password Too Short', 'Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match');
        return;
      }

      // Enforce DOB and 13+ right before sign-up as a guard
      if (!dob) {
        Alert.alert('Required', 'Please enter your date of birth to continue');
        return;
      }
      const ageCheck = computeAgeFromDate(dob);
      if (ageCheck < MIN_AGE_YEARS) {
        Alert.alert('Age Restriction', 'You must be at least 13 years old to create an account.');
        return;
      }

      // Perform sign up and then move to verify step
      try {
        setIsLoading(true);
        // Bundle onboarding metadata to create profile via DB trigger
        const metadata: any = {
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          gender: gender || null,
          unit_system: useMetric ? 'metric' : 'imperial',
        };
        if (dob) {
          const yyyy = dob.getFullYear();
          const mm = String(dob.getMonth() + 1).padStart(2, '0');
          const dd = String(dob.getDate()).padStart(2, '0');
          metadata.date_of_birth = `${yyyy}-${mm}-${dd}`;
          const now = new Date();
          let derivedAge = now.getFullYear() - yyyy;
          const m = now.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) derivedAge--;
          if (!isNaN(derivedAge)) metadata.age = Math.max(MIN_AGE_YEARS, Math.min(120, derivedAge));
        }
        if (useMetric) {
          if (heightCm) metadata.height_cm = Math.max(50, Math.min(250, parseInt(heightCm, 10)));
          if (weightKg) metadata.weight_kg = Math.max(20, Math.min(500, parseInt(weightKg, 10)));
        } else {
          const ft = parseInt(heightFt, 10) || 0;
          const inc = parseInt(heightIn, 10) || 0;
          const totalIn = ft * 12 + inc;
          if (totalIn > 0) metadata.height_cm = Math.round(totalIn * 2.54);
          const lb = parseInt(weightLb, 10) || 0;
          if (lb > 0) metadata.weight_kg = Math.round(lb * 0.453592);
        }

        const { error } = await signUp(email.trim(), password, metadata);
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('rate') || msg.includes('too many')) {
            Alert.alert('Please wait', 'Too many verification emails sent. Try again in a few minutes.');
          } else if (msg.includes('already registered')) {
            Alert.alert('Email Already Registered', 'Please check your email for a previous verification link or use Sign In.');
          } else {
            Alert.alert('Sign Up Error', error.message);
          }
          setIsLoading(false);
          return;
        }

        // Save pre-auth onboarding data locally as fallback for older accounts or if trigger fails
        await AsyncStorage.setItem('preauth_onboarding_profile', JSON.stringify(metadata));

        setIsLoading(false);
      } catch (e) {
        console.error('Error during sign up:', e);
        setIsLoading(false);
        Alert.alert('Error', 'Something went wrong. Please try again.');
        return;
      }
    }

    if (currentStep === steps.length - 1) {
      // Final step: hand off to sign-in
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  useEffect(() => {
    let timer: any;
    if (currentStep === 7 && lastResendAt) {
      timer = setInterval(() => {
        const diffSec = Math.max(0, 180 - Math.floor((Date.now() - lastResendAt) / 1000));
        setCooldown(diffSec);
      }, 1000);
    } else {
      setCooldown(0);
    }
    return () => timer && clearInterval(timer);
  }, [currentStep, lastResendAt]);

  const handleResendFromVerify = async () => {
    if (cooldown > 0) return;
    try {
      setIsLoading(true);
      const { error } = await resendVerification(email.trim());
      setIsLoading(false);
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('rate') || msg.includes('too many')) {
          Alert.alert('Please wait', 'Too many verification emails sent. Try again in a few minutes.');
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }
      setLastResendAt(Date.now());
      Alert.alert('Verification Sent', 'We sent you a new verification email.');
    } catch (e: any) {
      setIsLoading(false);
      Alert.alert('Error', e?.message || 'Failed to resend verification email');
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    // Defensive: ensure DOB present and 13+
    if (!dob) {
      Alert.alert('Required', 'Please enter your date of birth to continue');
      return;
    }
    const age = computeAgeFromDate(dob);
    if (age < MIN_AGE_YEARS) {
      Alert.alert('Age Restriction', 'You must be at least 13 years old to use Momentum.');
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile in database
      // Build updates with graceful fallback for unmigrated columns
      const updates: any = {
        full_name: fullName.trim(),
        username: username.toLowerCase().trim(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Compute DOB and derived age if provided
      if (dob) {
        const yyyy = dob.getFullYear();
        const mm = String(dob.getMonth() + 1).padStart(2, '0');
        const dd = String(dob.getDate()).padStart(2, '0');
        updates.date_of_birth = `${yyyy}-${mm}-${dd}`;
        const now = new Date();
        let derivedAge = now.getFullYear() - yyyy;
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) derivedAge--;
        if (!isNaN(derivedAge)) updates.age = Math.max(MIN_AGE_YEARS, Math.min(120, derivedAge));
      }

      if (gender) updates.gender = gender;

      // Height/weight with unit conversion
      if (useMetric) {
        if (heightCm) updates.height_cm = Math.max(50, Math.min(250, parseInt(heightCm, 10)));
        if (weightKg) updates.weight_kg = Math.max(20, Math.min(500, parseInt(weightKg, 10)));
      } else {
        const ft = parseInt(heightFt, 10) || 0;
        const inc = parseInt(heightIn, 10) || 0;
        const totalIn = ft * 12 + inc;
        if (totalIn > 0) updates.height_cm = Math.round(totalIn * 2.54);
        const lb = parseInt(weightLb, 10) || 0;
        if (lb > 0) updates.weight_kg = Math.round(lb * 0.453592);
      }

      // First update baseline fields to ensure onboarding completes even if optional columns are missing
      const baseUpdate: any = {
        full_name: updates.full_name,
        username: updates.username,
        onboarding_completed: true,
        updated_at: updates.updated_at,
      };

      const { error: baseErr } = await supabase
        .from('user_profiles')
        .update(baseUpdate)
        .eq('id', user.id);

      if (baseErr) {
        console.error('Error updating base profile:', baseErr);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        return;
      }

      // Try optional fields individually; ignore unknown column errors (PGRST204)
      const optionalKeys: Array<[string, any]> = [
        ['date_of_birth', updates.date_of_birth],
        ['age', updates.age],
        ['gender', gender ? gender.trim() : null],
        ['height_cm', updates.height_cm],
        ['weight_kg', updates.weight_kg],
        ['unit_system', useMetric ? 'metric' : 'imperial'],
      ];
      for (const [key, value] of optionalKeys) {
        if (value === undefined || value === null || value === '') continue;
        const { error: optErr } = await supabase
          .from('user_profiles')
          .update({ [key]: value } as any)
          .eq('id', user.id);
        if (optErr && optErr.code !== 'PGRST204') {
          console.warn('Optional field update failed:', key, optErr);
        }
      }

      // Complete onboarding
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always reset scroll to top when changing steps (especially for metrics)
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.logoWrap}>
        <View style={[styles.logoGlow, { backgroundColor: colors.primary }]} />
        <Image source={require('@/assets/images/icon.png')} style={{ width: 180, height: 180 }} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        We'll help you set up your profile so you can start achieving your goals with Momentum.
      </Text>
      <TouchableOpacity onPress={onComplete} activeOpacity={0.8} style={{ marginTop: 8 }}>
        <Text style={[styles.helpText, { color: colors.primary }]}>Already have an account?</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNameStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Image source={require('@/assets/images/profile-icon.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border 
          }]}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textSecondary}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>
    </View>
  );

  const renderUsernameStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Image source={require('@/assets/images/username-icon.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: usernameError ? colors.error : colors.border 
          }]}
          placeholder="Choose a username"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />
        {username.length >= 3 && !usernameError && (
          <View style={styles.checkIcon}>
            <Check size={20} color={colors.success} />
          </View>
        )}
      </View>
      
      {usernameError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {usernameError}
        </Text>
      )}
      
      <Text style={[styles.helpText, { color: colors.textSecondary }]}>
        Username must be at least 3 characters and can contain letters, numbers, and underscores.
      </Text>
    </View>
  );

  const renderAboutStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Image source={require('@/assets/images/personal-details-icon.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>

      {/* Date of Birth (native picker) */}
      <TouchableOpacity
        onPress={() => setShowDobPicker(true)}
        activeOpacity={0.8}
        style={[styles.dobRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date of birth (required)</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {dob ? dob.toLocaleDateString() : 'Select'}
        </Text>
      </TouchableOpacity>
      {showDobPicker && (
        <DateTimePicker
          value={dob || new Date(new Date().getFullYear() - 20, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date(new Date().getFullYear() - MIN_AGE_YEARS, new Date().getMonth(), new Date().getDate())}
          minimumDate={new Date(new Date().getFullYear() - 120, 0, 1)}
          onChange={(event: any, selected?: Date) => {
            if (Platform.OS !== 'ios') setShowDobPicker(false);
            if (selected) setDob(selected);
          }}
          style={{ alignSelf: 'stretch' }}
        />
      )}

      {/* Gender chips */}
      <View style={[styles.chipsContainer, { justifyContent: 'center' }]}> 
        <Text style={[styles.inputLabel, { width: '100%', textAlign: 'center', color: colors.textSecondary }]}>Gender (optional)</Text>
        {['Female','Male','Non-binary','Prefer not to say'].map((g) => {
          const selected = gender === g;
          return (
            <TouchableOpacity
              key={g}
              style={[styles.chip, selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setGender(selected ? '' : g)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: selected ? 'white' : colors.text }]}>{g}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>We require your date of birth to verify you are at least 13 years old. Gender is optional and used only to personalize your plan. Your data is private, anonymous, and never sold.</Text>

      <TouchableOpacity onPress={() => setGender('')} activeOpacity={0.7}>
        <Text style={[styles.skipLink, { color: colors.primary }]}>Skip gender for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMetricsStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Image source={require('@/assets/images/body-metrics-icon.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>

      {/* Unit toggle */}
      <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Units</Text>
        <View style={styles.chipsContainer}>
          {['Imperial','Metric'].map((label, idx) => {
            const selected = (idx === 1) === useMetric;
            return (
              <TouchableOpacity
                key={label}
                style={[styles.chip, selected ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setUseMetric(idx === 1)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: selected ? 'white' : colors.text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Height - Compact inputs to reduce vertical space */}
      {useMetric ? (
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
          <TextInput
            style={[styles.textInputBare, { color: colors.text }]}
            keyboardType="number-pad"
            placeholder="e.g. 170"
            placeholderTextColor={colors.textSecondary}
            value={heightCm}
            onChangeText={(t) => setHeightCm(t.replace(/[^0-9]/g, ''))}
          />
        </View>
      ) : (
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 100 }}>
              <Text style={[styles.stepperLabel, { color: colors.textSecondary, textAlign: 'center' }]}>ft</Text>
              <TextInput
                style={[styles.textInputBare, { color: colors.text, textAlign: 'center' }]}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                value={heightFt}
                onChangeText={(t) => setHeightFt(t.replace(/[^0-9]/g, ''))}
              />
            </View>
            <View style={{ width: 100 }}>
              <Text style={[styles.stepperLabel, { color: colors.textSecondary, textAlign: 'center' }]}>in</Text>
              <TextInput
                style={[styles.textInputBare, { color: colors.text, textAlign: 'center' }]}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor={colors.textSecondary}
                value={heightIn}
                onChangeText={(t) => setHeightIn(t.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>
        </View>
      )}

      {/* Weight - text entry */}
      {useMetric ? (
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
          <TextInput
            style={[styles.textInputBare, { color: colors.text }]}
            keyboardType="number-pad"
            placeholder="e.g. 70"
            placeholderTextColor={colors.textSecondary}
            value={weightKg}
            onChangeText={(t) => setWeightKg(t.replace(/[^0-9]/g, ''))}
          />
        </View>
      ) : (
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (lb)</Text>
          <TextInput
            style={[styles.textInputBare, { color: colors.text }]}
            keyboardType="number-pad"
            placeholder="e.g. 160"
            placeholderTextColor={colors.textSecondary}
            value={weightLb}
            onChangeText={(t) => setWeightLb(t.replace(/[^0-9]/g, ''))}
          />
        </View>
      )}

      <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>Optional. This helps tailor training volume, recovery, and pacing guidance. Private and never sold.</Text>

      <TouchableOpacity onPress={() => { setHeightCm(''); setWeightKg(''); }} activeOpacity={0.7}>
        <Text style={[styles.skipLink, { color: colors.primary }]}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmailStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Image source={require('@/assets/images/username-icon.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border 
          }]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </View>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Image source={require('@/assets/images/lock-icon.png')} style={styles.illustration} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border 
          }]}
          placeholder="Enter a password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border 
          }]}
          placeholder="Confirm password"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>
      <Text style={[styles.helpText, { color: colors.textSecondary }]}>Password must be at least 6 characters.</Text>
    </View>
  );

  const renderVerifyStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
        <Image
          source={require('@/assets/images/all-set-icon.png')}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        We've sent a verification link to {email}. Please verify your email, then continue to sign in.
      </Text>
      <TouchableOpacity
        onPress={handleResendFromVerify}
        disabled={isLoading || cooldown > 0}
        activeOpacity={0.8}
        style={[styles.secondaryButton, { borderColor: colors.border, paddingHorizontal: 22, marginTop: 8, opacity: (isLoading || cooldown > 0) ? 0.6 : 1 }]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
          {cooldown > 0 ? `Resend in ${Math.floor(cooldown/60)}:${String(cooldown%60).padStart(2,'0')}` : 'Resend Verification Email'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStepContent = () => {
    switch (steps[currentStep].content) {
      case 'welcome':
        return renderWelcomeStep();
      case 'name':
        return renderNameStep();
      case 'username':
        return renderUsernameStep();
      case 'about':
        return renderAboutStep();
      case 'metrics':
        return renderMetricsStep();
      case 'email':
        return renderEmailStep();
      case 'password':
        return renderPasswordStep();
      case 'verify':
        return renderVerifyStep();
      default:
        return renderWelcomeStep();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[colors.primary + '10', colors.background]}
        style={styles.gradient}
      >
        <ScrollView 
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(24, 24 + insets.top * 0.5), paddingBottom: 24 + insets.bottom }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'always' : 'automatic'}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor: index <= currentStep ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation */}
          <View style={styles.navigationContainer}>
            <View style={styles.navRow}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border, paddingHorizontal: 16, flex: 1, minWidth: 0 }]}
                  onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={isLoading}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]} numberOfLines={1}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  { 
                    backgroundColor: colors.primary,
                    opacity: isLoading ? 0.7 : 1 
                  },
                  { flex: 1, minWidth: 0 }
                ]}
                onPress={handleNext}
                disabled={isLoading}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? 'Continue' : 'Continue'}
                </Text>
                <ArrowRight size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 10,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  logoWrap: {
    width: 220,
    height: 220,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    backgroundColor: 'transparent',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.25,
    filter: 'blur(40px)'
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    opacity: 0.8,
    marginBottom: 16,
  },
  inputContainer: {
    width: '100%',
    marginTop: 32,
    position: 'relative',
  },
  inputRow: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dobRow: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dobInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dobInput: {
    width: 48,
    borderBottomWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 2,
  },
  dobInputYear: {
    width: 72,
    borderBottomWidth: 1,
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 2,
  },
  dobSep: {
    fontSize: 16,
    opacity: 0.7,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInputBare: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
  },
  chipsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  privacyNote: {
    marginTop: 20,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
    maxWidth: '90%',
  },
  skipLink: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  checkIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  navigationContainer: {
    paddingTop: 32,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  stepperValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepperGroup: {
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
