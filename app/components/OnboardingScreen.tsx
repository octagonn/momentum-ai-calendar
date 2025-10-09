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
import { ArrowRight, User, AtSign, Check } from 'lucide-react-native';
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
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim(),
          username: username.toLowerCase().trim(),
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to save profile. Please try again.');
        return;
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
      <View style={styles.iconContainer}>
        <User size={80} color={colors.primary} />
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
        <User size={60} color={colors.primary} />
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
        <AtSign size={60} color={colors.primary} />
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
            <TouchableOpacity
              style={[
                styles.nextButton,
                { 
                  backgroundColor: colors.primary,
                  opacity: isLoading ? 0.7 : 1 
                }
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
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginTop: 32,
    position: 'relative',
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
    height: 56,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
