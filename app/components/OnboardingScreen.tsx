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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, User, AtSign, Check, Mail, Lock, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';

interface OnboardingScreenProps {
  onComplete: () => void;
  onNavigateToSignIn?: () => void;
}

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete, onNavigateToSignIn }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const { user, signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      title: "What's your email?",
      subtitle: "We'll use this for your account",
      content: "email"
    },
    {
      title: "Create a password",
      subtitle: "Keep your account secure",
      content: "password"
    },
    {
      title: "All set!",
      subtitle: "Check your email to verify your account",
      content: "verification"
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
    } else if (currentStep === 3) {
      // Email step
      if (!email.trim()) {
        Alert.alert('Required', 'Please enter your email');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
        return;
      }
    } else if (currentStep === 4) {
      // Password step
      if (!password.trim()) {
        Alert.alert('Required', 'Please enter a password');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Password Too Short', 'Password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match');
        return;
      }
      // Sign up the user
      await handleSignUp();
      return; // Don't increment step here, handleSignUp will do it
    }

    if (currentStep === steps.length - 1) {
      // Navigate to sign in
      if (onNavigateToSignIn) {
        onNavigateToSignIn();
      }
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      // Sign up with Supabase
      const { error } = await signUp(email, password);
      
      if (error) {
        Alert.alert('Sign Up Error', error.message);
        setIsLoading(false);
        return;
      }

      // Store name and username in localStorage temporarily
      // Will be saved to profile after email verification
      try {
        const pendingData = JSON.stringify({ fullName, username });
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('pendingProfileData', pendingData);
        }
      } catch (e) {
        console.log('Could not store pending profile data:', e);
      }

      // Move to verification screen
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Error during sign up:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.appIcon}
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
        We'll help you set up your profile so you can start achieving your goals with Momentum.
      </Text>
      
      {onNavigateToSignIn && (
        <TouchableOpacity 
          style={styles.signInLinkContainer}
          onPress={onNavigateToSignIn}
        >
          <Text style={[styles.signInLinkText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
            <Text style={[styles.signInLink, { color: colors.primary }]}>
              Sign In
            </Text>
          </Text>
        </TouchableOpacity>
      )}
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

  const renderEmailStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Mail size={60} color={colors.primary} />
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
          placeholder="Enter your email address"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
        />
      </View>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <Lock size={60} color={colors.primary} />
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
          placeholder="Enter your password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border 
          }]}
          placeholder="Re-enter your password"
          placeholderTextColor={colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <Text style={[styles.helpText, { color: colors.textSecondary }]}>
        Password must be at least 6 characters long.
      </Text>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
        <CheckCircle size={60} color={colors.success} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        {steps[currentStep].title}
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        {steps[currentStep].subtitle}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        We've sent a verification link to {email}. Please check your email and click the link to verify your account.
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
      case 'email':
        return renderEmailStep();
      case 'password':
        return renderPasswordStep();
      case 'verification':
        return renderVerificationStep();
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
                {isLoading ? 'Please wait...' : 
                 currentStep === steps.length - 1 ? 'Go to Sign In' : 'Continue'}
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
  appIcon: {
    width: 100,
    height: 100,
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
  signInLinkContainer: {
    marginTop: 32,
    paddingVertical: 12,
  },
  signInLinkText: {
    fontSize: 16,
    textAlign: 'center',
  },
  signInLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
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
