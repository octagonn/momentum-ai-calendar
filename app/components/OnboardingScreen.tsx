import React, { useState, useRef } from 'react';
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
import { ArrowRight, User, AtSign, Check, Shield, Ruler, Scale, Plus, Minus } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
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
      title: "Your details (optional)",
      subtitle: "Date of birth and gender help us tailor your plan",
      content: "about"
    },
    {
      title: "Body metrics (optional)",
      subtitle: "Used only for plan personalization",
      content: "metrics"
    },
    {
      title: "All set!",
      subtitle: "Your profile is ready to go",
      content: "complete"
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
        console.error('Error checking username:', error);
        return false;
      }

      // Username exists
      return false;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
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
    }

    if (currentStep === steps.length - 1) {
      // Complete onboarding
      await completeOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

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
        if (!isNaN(derivedAge)) updates.age = Math.max(10, Math.min(120, derivedAge));
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

  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.logoWrap}>
        <View style={[styles.logoGlow, { backgroundColor: colors.primary }]} />
        <Image source={require('@/assets/icon.png')} style={{ width: 180, height: 180 }} resizeMode="contain" />
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
    </View>
  );

  const renderNameStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <User size={80} color={colors.primary} />
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
        <AtSign size={80} color={colors.primary} />
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
        <Shield size={80} color={colors.primary} />
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
        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date of birth</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {dob ? dob.toLocaleDateString() : 'Select'}
        </Text>
      </TouchableOpacity>
      {showDobPicker && (
        <DateTimePicker
          value={dob || new Date(new Date().getFullYear() - 20, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date(new Date().getFullYear() - 10, 11, 31)}
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

      <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>Optional. Used only to personalize your plan. Your data is private, anonymous, and will never be sold.</Text>

      <TouchableOpacity onPress={() => setGender('')} activeOpacity={0.7}>
        <Text style={[styles.skipLink, { color: colors.primary }]}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMetricsStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Ruler size={50} color={colors.primary} />
        <Scale size={50} color={colors.primary} />
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

      {/* Height - Wheel pickers */}
      {useMetric ? (
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height (cm)</Text>
          <View style={{ width: 160 }}>
            <Picker
              selectedValue={heightCm || '170'}
              onValueChange={(v) => setHeightCm(String(v))}
              itemStyle={{ color: colors.text }}
            >
              {Array.from({ length: 201 }).map((_, i) => {
                const val = 50 + i; // 50..250
                return (
                  <Picker.Item key={val} label={`${val} cm`} value={String(val)} />
                );
              })}
            </Picker>
          </View>
        </View>
      ) : (
        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Height</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 120 }}>
              <Text style={[styles.stepperLabel, { color: colors.textSecondary, textAlign: 'center' }]}>ft</Text>
              <Picker
                selectedValue={heightFt || '5'}
                onValueChange={(v) => setHeightFt(String(v))}
                itemStyle={{ color: colors.text }}
              >
                {Array.from({ length: 6 }).map((_, i) => {
                  const val = 3 + i; // 3..8
                  return (
                    <Picker.Item key={val} label={`${val}`} value={String(val)} />
                  );
                })}
              </Picker>
            </View>
            <View style={{ width: 120 }}>
              <Text style={[styles.stepperLabel, { color: colors.textSecondary, textAlign: 'center' }]}>in</Text>
              <Picker
                selectedValue={heightIn || '6'}
                onValueChange={(v) => setHeightIn(String(v))}
                itemStyle={{ color: colors.text }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <Picker.Item key={i} label={`${i}`} value={String(i)} />
                ))}
              </Picker>
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

  const renderCompleteStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
        <Check size={80} color={colors.success} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Welcome to Momentum, {fullName}! You're all set to start your journey towards achieving your goals.
      </Text>
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
      case 'complete':
        return renderCompleteStep();
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border, minWidth: 140, paddingHorizontal: 16 }]}
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
                  { flex: currentStep > 0 ? 2 : 1, minWidth: 240 }
                ]}
                onPress={handleNext}
                disabled={isLoading}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
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
