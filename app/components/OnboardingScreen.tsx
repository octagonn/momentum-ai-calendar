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
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shadowSm, shadowMd, insetTopLight, insetBottomDark, lighten, gradientPrimary } from '@/ui/depth';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, isDark } = useTheme();
  const { user, signUp, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [termsModalVisible, setTermsModalVisible] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const clampNumber = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };
  const sanitizeFeet = (text: string) => {
    // Allow free numeric entry; validate ranges on Continue
    return text.replace(/[^0-9]/g, '');
  };
  const sanitizeInches = (text: string) => {
    // Allow free numeric entry; validate ranges on Continue
    return text.replace(/[^0-9]/g, '');
  };
  const sanitizePounds = (text: string) => {
    // Allow free numeric entry; validate ranges on Continue
    return text.replace(/[^0-9]/g, '');
  };

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

  const animateToStep = async (nextStep: number, direction: 'forward' | 'back') => {
    if (isAnimating) return;
    setIsAnimating(true);
    try {
      if (direction === 'forward') {
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
      } else {
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      }

      await new Promise<void>((resolve) => {
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: direction === 'forward' ? -width : width,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(fade, {
            toValue: 0.2,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Switch content
          setCurrentStep(nextStep);
          // Prepare next content offscreen
          translateX.setValue(direction === 'forward' ? width : -width);
          fade.setValue(0.2);
          // Animate in
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 0,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(fade, {
              toValue: 1,
              duration: 250,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsAnimating(false);
            resolve();
          });
        });
      });
    } catch {
      setIsAnimating(false);
    }
  };

  const handleBack = async () => {
    if (isLoading || isAnimating) return;
    if (currentStep > 0) {
      await animateToStep(Math.max(0, currentStep - 1), 'back');
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && !acceptedTerms) {
      Alert.alert('Agreement Required', 'Please agree to the Terms & Conditions to continue.');
      return;
    }
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
    } else if (currentStep === 4) {
      // Metrics validation (optional inputs)
      if (useMetric) {
        if (heightCm) {
          const cm = parseInt(heightCm, 10);
          if (isNaN(cm) || cm < 50 || cm > 250) {
            Alert.alert('Invalid Height', 'Height must be between 50 and 250 cm.');
            return;
          }
        }
        if (weightKg) {
          const kg = parseInt(weightKg, 10);
          if (isNaN(kg) || kg < 20 || kg > 500) {
            Alert.alert('Invalid Weight', 'Weight must be between 20 and 500 kg.');
            return;
          }
        }
      } else {
        const ft = heightFt ? parseInt(heightFt, 10) : 0;
        const inc = heightIn ? parseInt(heightIn, 10) : 0;
        if (heightFt || heightIn) {
          const totalIn = (isNaN(ft) ? 0 : ft) * 12 + (isNaN(inc) ? 0 : inc);
          const cm = Math.round(totalIn * 2.54);
          if (cm < 50 || cm > 250) {
            Alert.alert('Invalid Height', 'Height must be between 1 ft 8 in (50 cm) and 8 ft 2 in (250 cm).');
            return;
          }
        }
        if (weightLb) {
          const lb = parseInt(weightLb, 10);
          if (isNaN(lb) || lb < 44 || lb > 1100) {
            Alert.alert('Invalid Weight', 'Weight must be between 44 and 1100 lb.');
            return;
          }
        }
      }
    } else if (currentStep === 5) {
      // Email step
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
        return;
      }
      // Check if email already exists (using user_profiles for verified accounts)
      try {
        const normalized = email.trim().toLowerCase();
        // prefer maybeSingle if available, otherwise use single and handle no-row error
        const existsResp: any = (supabase.from('user_profiles') as any).select('id').eq('email', normalized).maybeSingle
          ? await (supabase.from('user_profiles') as any).select('id').eq('email', normalized).maybeSingle()
          : await supabase.from('user_profiles').select('id').eq('email', normalized).single();
        const existing = existsResp?.data;
        const existErr = existsResp?.error;
        if (existing && existing.id && !existErr) {
          Alert.alert(
            'Account Already Exists',
            'An account with this email already exists. Would you like to sign in instead?',
            [
              { text: 'Use different email' },
              { text: 'Sign In', onPress: onComplete },
            ]
          );
          return;
        }
      } catch (e) {
        // Ignore lookup errors and proceed
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
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
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
          if (heightCm) metadata.height_cm = parseInt(heightCm, 10);
          if (weightKg) metadata.weight_kg = parseInt(weightKg, 10);
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
          const status = (error as any)?.status;
          const alreadyPatterns = [
            'already exists',
            'already registered',
            'already in use',
            'already used',
            'user already exists',
            'email already',
            'duplicate',
            'conflict',
          ];
          const isAlready = alreadyPatterns.some(p => msg.includes(p)) || status === 409 || status === 422;

          if (msg.includes('rate') || msg.includes('too many')) {
            Alert.alert('Please wait', 'Too many verification emails sent. Try again in a few minutes.');
          } else if (msg.includes('already registered')) {
            Alert.alert('Email Already Registered', 'An account with this email already exists. Please sign in instead, or check your inbox for a verification link if you haven’t verified yet.');
          } else if (isAlready) {
            Alert.alert('Account Already Exists', 'An account with this email already exists. Please sign in instead or reset your password.');
          } else {
            Alert.alert('Sign Up Error', error.message);
          }
          try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
          setIsLoading(false);
          return;
        }

        // Save pre-auth onboarding data locally as fallback for older accounts or if trigger fails
        await AsyncStorage.setItem('preauth_onboarding_profile', JSON.stringify(metadata));

        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        setIsLoading(false);
      } catch (e) {
        console.error('Error during sign up:', e);
        setIsLoading(false);
        Alert.alert('Error', 'Something went wrong. Please try again.');
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
        return;
      }
    }

    if (currentStep === steps.length - 1) {
      // Final step: hand off to sign-in
      onComplete();
    } else {
      await animateToStep(currentStep + 1, 'forward');
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
        const ft = Math.max(0, Math.min(8, parseInt(heightFt, 10) || 0));
        const inc = Math.max(0, Math.min(11, parseInt(heightIn, 10) || 0));
        const totalIn = ft * 12 + inc;
        if (totalIn > 0) updates.height_cm = Math.max(50, Math.min(250, Math.round(totalIn * 2.54)));
        const lbRaw = parseInt(weightLb, 10) || 0;
        const lb = Math.max(44, Math.min(1100, lbRaw));
        if (lb > 0) updates.weight_kg = Math.max(20, Math.min(500, Math.round(lb * 0.453592)));
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
      <TouchableOpacity onPress={async () => { try { await Haptics.selectionAsync(); } catch {} onComplete(); }} activeOpacity={0.8} style={{ marginTop: 8 }}>
        <Text style={[styles.helpText, { color: colors.primary }]}>Already have an account?</Text>
      </TouchableOpacity>

      <View style={styles.termsRow}>
        <TouchableOpacity
          onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setAcceptedTerms(!acceptedTerms); }}
          activeOpacity={0.8}
          style={[
            styles.checkBox,
            {
              borderColor: acceptedTerms ? colors.primary : colors.text,
              backgroundColor: acceptedTerms ? colors.primary : 'transparent',
            },
          ]}
        >
          {acceptedTerms && <Check size={16} color={'white'} />}
        </TouchableOpacity>
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>I agree to the <Text onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setTermsModalVisible(true); }} style={[styles.termsLink, { color: colors.primary }]}>Terms & Conditions</Text></Text>
      </View>
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
          style={[
            styles.textInput,
            { backgroundColor: colors.card, color: colors.text },
            focusedField === 'name' ? shadowMd(isDark) : shadowSm(isDark),
          ]}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textSecondary}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoCorrect={false}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
        />
        <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
        <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
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
          style={[
            styles.textInput,
            { backgroundColor: colors.card, color: colors.text },
            usernameError ? { borderWidth: 1.5, borderColor: colors.error } : null,
            focusedField === 'username' ? shadowMd(isDark) : shadowSm(isDark),
          ]}
          placeholder="Choose a username"
          placeholderTextColor={colors.textSecondary}
          value={username}
          onChangeText={handleUsernameChange}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          onFocus={() => setFocusedField('username')}
          onBlur={() => setFocusedField(null)}
        />
        {username.length >= 3 && !usernameError && (
          <View style={styles.checkIcon}>
            <Check size={20} color={colors.success} />
          </View>
        )}
        <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
        <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
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
        onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setShowDobPicker(true); }}
        activeOpacity={0.8}
        style={[styles.dobRow, { backgroundColor: colors.card }, shadowSm(isDark)]}
      >
        <Text style={[styles.inputLabel, { color: isDark ? colors.textSecondary : colors.text }]}>Date of birth (required)</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {dob ? dob.toLocaleDateString() : 'Select'}
        </Text>
        <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
        <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
      </TouchableOpacity>
      {showDobPicker && (
        <DateTimePicker
          value={dob || new Date(new Date().getFullYear() - 20, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          {...(Platform.OS === 'ios' ? { themeVariant: isDark ? 'dark' : 'light' } : {})}
          {...(Platform.OS === 'ios' ? { textColor: isDark ? '#FFFFFF' : colors.text } : {})}
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
              style={[
                styles.chip,
                selected ? { backgroundColor: colors.primary } : { backgroundColor: colors.card },
                selected ? shadowMd(isDark) : shadowSm(isDark),
              ]}
              onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setGender(selected ? '' : g); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: selected ? 'white' : colors.text }]}>{g}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>We require your date of birth to verify you are at least 13 years old. Gender is optional and used only to personalize your plan. Your data is private, anonymous, and never sold.</Text>
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
      <View style={[styles.inputRow, { backgroundColor: colors.card }, shadowSm(isDark)]}> 
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Units</Text>
        <View style={styles.chipsContainer}>
          {['Imperial','Metric'].map((label, idx) => {
            const selected = (idx === 1) === useMetric;
            return (
              <TouchableOpacity
                key={label}
                style={[
                  styles.chip,
                  selected ? { backgroundColor: colors.primary } : { backgroundColor: colors.card },
                  selected ? shadowMd(isDark) : shadowSm(isDark),
                ]}
                onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setUseMetric(idx === 1); }}
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
        <View style={[styles.inputRow, { backgroundColor: colors.card }, shadowSm(isDark)]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
          <TextInput
            style={[styles.textInputBare, { color: colors.text }]}
            keyboardType="number-pad"
            placeholder="e.g. 170"
            placeholderTextColor={colors.textSecondary}
            value={heightCm}
            onChangeText={(t) => setHeightCm(t.replace(/[^0-9]/g, ''))}
          />
          <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
          <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
        </View>
      ) : (
        <View style={[styles.inputRow, { backgroundColor: colors.card }, shadowSm(isDark)]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.unitInputBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.unitInput, { color: colors.text }]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={heightFt}
                  onChangeText={(t) => setHeightFt(sanitizeFeet(t))}
                />
              </View>
              <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>ft</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.unitInputBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.unitInput, { color: colors.text }]}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={heightIn}
                  onChangeText={(t) => setHeightIn(sanitizeInches(t))}
                />
              </View>
              <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>in</Text>
            </View>
          </View>
          <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
          <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
        </View>
      )}

      {/* Weight - text entry */}
      {useMetric ? (
        <View style={[styles.inputRow, { backgroundColor: colors.card }, shadowSm(isDark)]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight (kg)</Text>
          <TextInput
            style={[styles.textInputBare, { color: colors.text }]}
            keyboardType="number-pad"
            placeholder="e.g. 70"
            placeholderTextColor={colors.textSecondary}
            value={weightKg}
            onChangeText={(t) => setWeightKg(t.replace(/[^0-9]/g, ''))}
          />
          <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
          <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
        </View>
      ) : (
        <View style={[styles.inputRow, { backgroundColor: colors.card }, shadowSm(isDark)]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Weight</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.unitInputBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.unitInput, { color: colors.text, textAlign: 'center' }]}
                keyboardType="number-pad"
                maxLength={4}
                value={weightLb}
                onChangeText={(t) => setWeightLb(sanitizePounds(t))}
              />
            </View>
            <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>lbs</Text>
          </View>
          <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
          <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
        </View>
      )}

      <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>Optional. This helps tailor training volume, recovery, and pacing guidance. Private and never sold.</Text>

      <TouchableOpacity onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setHeightCm(''); setWeightKg(''); }} activeOpacity={0.7}>
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
          style={[
            styles.textInput,
            { backgroundColor: colors.card, color: colors.text },
            focusedField === 'email' ? shadowMd(isDark) : shadowSm(isDark),
          ]}
          placeholder="Enter your email"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
        />
        <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
        <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
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
          style={[
            styles.textInput,
            { backgroundColor: colors.card, color: colors.text },
            focusedField === 'password' ? shadowMd(isDark) : shadowSm(isDark),
          ]}
          placeholder="Enter a password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
        />
        <TouchableOpacity
          onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setShowPassword(!showPassword); }}
          activeOpacity={0.7}
          style={styles.checkIcon}
        >
          {showPassword ? (
            <EyeOff size={20} color={colors.text} />
          ) : (
            <Eye size={20} color={colors.text} />
          )}
        </TouchableOpacity>
        <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
        <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: colors.card, color: colors.text },
            focusedField === 'confirm' ? shadowMd(isDark) : shadowSm(isDark),
          ]}
          placeholder="Confirm password"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          onFocus={() => setFocusedField('confirm')}
          onBlur={() => setFocusedField(null)}
        />
        <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.08)} />
        <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.08)} />
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
        onPress={async () => { try { await Haptics.selectionAsync(); } catch {} await handleResendFromVerify(); }}
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
          <View style={[styles.stepCard, { backgroundColor: colors.surface }, shadowSm(isDark)]}>
            <Animated.View style={{ width: '100%', transform: [{ translateX }], opacity: fade }}>
              {renderStepContent()}
            </Animated.View>
          </View>

          {/* Navigation */}
          <View style={styles.navigationContainer}>
            <View style={styles.navRow}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border, paddingHorizontal: 16, flex: 1, minWidth: 0 }]}
                  onPress={handleBack}
                  disabled={isLoading || isAnimating}
                >
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]} numberOfLines={1}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[{ flex: 1, minWidth: 0 }]}
                onPress={handleNext}
                disabled={isLoading || isAnimating || (currentStep === 0 && !acceptedTerms)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={gradientPrimary(colors as any)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.nextButton,
                    shadowMd(isDark),
                    { opacity: (isLoading || (currentStep === 0 && !acceptedTerms)) ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.nextButtonText}>
                    {currentStep === steps.length - 1 ? 'Continue' : 'Continue'}
                  </Text>
                  <ArrowRight size={20} color="white" />
                  <View pointerEvents="none" style={[insetTopLight(colors as any, isDark, 0.12), { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    {/* Terms & Conditions Modal */}
    <Modal
      visible={termsModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setTermsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }, shadowMd(isDark)]}> 
          <View style={[styles.modalHeader] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Terms & Conditions</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={async () => { try { await Haptics.selectionAsync(); } catch {} setTermsModalVisible(false); }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, color: colors.text }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={[styles.helpText, { color: colors.textSecondary, textAlign: 'left', marginTop: 0 }]}>Last updated: October 25, 2025</Text>
            <Text style={[styles.stepSubtitle, { color: colors.primary, textAlign: 'left', marginTop: 16 }]}>⚠️ IMPORTANT NOTICE - USE AT YOUR OWN RISK</Text>
            <Text style={[styles.description, { color: colors.text, textAlign: 'left' }]}>By using Momentum: AI Calendar, you acknowledge and agree that you use the Services at your own risk. AI-generated content may be inaccurate, and you must verify all outputs independently. No warranties are provided.</Text>
            <Text style={[styles.stepSubtitle, { color: colors.primary, textAlign: 'left', marginTop: 16 }]}>Agreement to Our Legal Terms</Text>
            <Text style={[styles.description, { color: colors.text, textAlign: 'left' }]}>By creating an account or continuing to use the app, you agree to these Terms & Conditions. For the full policy text, including arbitration, limitations of liability, and privacy practices, see Terms & Conditions in Settings.</Text>
            <Text style={[styles.stepSubtitle, { color: colors.primary, textAlign: 'left', marginTop: 16 }]}>Key Points</Text>
            <Text style={[styles.description, { color: colors.text, textAlign: 'left' }]}>• You use the Services entirely at your own risk.
• AI content may be inaccurate; you must verify.
• We are not liable for missed appointments or reliance on AI outputs.
• Subscriptions renew automatically unless canceled in App Store settings.</Text>
            <Text style={[styles.description, { color: colors.text, textAlign: 'left', marginTop: 12 }]}>Contact: app.momentum.mobile@gmail.com</Text>
          </ScrollView>
          <View pointerEvents="none" style={insetTopLight(colors as any, isDark, 0.06)} />
          <View pointerEvents="none" style={insetBottomDark(colors as any, isDark, 0.06)} />
        </View>
      </View>
    </Modal>
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
  stepCard: {
    width: '100%',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 28,
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
    paddingVertical: 28,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  illustration: {
    width: 140,
    height: 140,
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
    marginBottom: 20,
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
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  unitInputBox: {
    width: 64,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  unitInput: {
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 30,
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
    borderWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0,
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
  termsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    fontSize: 14,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
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
    minHeight: 56,
    paddingVertical: 14,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    minHeight: 52,
    paddingVertical: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    borderRadius: 24,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    borderRadius: 12,
  },
  modalContent: {
    padding: 20,
  },
});
