import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';

const { width } = Dimensions.get('window');

interface AuthScreenProps {
  onAuthSuccess: () => void;
  onSignUpRequest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, onSignUpRequest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [lastResendAt, setLastResendAt] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  const { signIn, resendVerification } = useAuth();

  useEffect(() => {
    let timer: any;
    if (showVerifyModal && lastResendAt) {
      timer = setInterval(() => {
        const diffSec = Math.max(0, 180 - Math.floor((Date.now() - lastResendAt) / 1000));
        setCooldown(diffSec);
      }, 1000);
    } else {
      setCooldown(0);
    }
    return () => timer && clearInterval(timer);
  }, [showVerifyModal, lastResendAt]);

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      const msg = (error.message || '').toLowerCase();
      const looksUnconfirmed = msg.includes('confirm') || msg.includes('verify') || msg.includes('confirmed');
      if (looksUnconfirmed) {
        setShowVerifyModal(true);
        return;
      }
      Alert.alert('Sign In Error', error.message);
    } else {
      onAuthSuccess();
    }
  };

  const handleResendVerification = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      const { error } = await resendVerification(email);
      setLoading(false);
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setLastResendAt(Date.now());
      Alert.alert('Verification Sent', 'We sent you a new verification email.');
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e?.message || 'Failed to resend verification email');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f0f23', '#1a0b2e', '#2d1b69', '#8e44ad', '#c44569']}
        locations={[0, 0.2, 0.4, 0.7, 1]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
            {/* Background Elements */}
            <View style={styles.backgroundElements}>
              <View style={styles.floatingCircle1} />
              <View style={styles.floatingCircle2} />
              <View style={styles.floatingCircle3} />
            </View>
            
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.appIcon}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.logo}>Momentum</Text>
              <Text style={styles.tagline}>Achieve Your Goals, One Step at a Time</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardSubtitle}>Sign in to continue your journey</Text>
              </View>

              <View style={styles.formContent}>
                <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.disabledButton]}
                onPress={handleSignIn}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? 'Please wait...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

                <Text style={styles.footerText}>
                  {"Don't have an account? "}
                  <Text
                    style={styles.linkText}
                    onPress={() => onSignUpRequest && onSignUpRequest()}
                  >
                    Sign Up
                  </Text>
                </Text>
              </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
      {showVerifyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
              <Text style={styles.modalTitle}>Email Not Verified</Text>
              <Text style={{ color: '#555', textAlign: 'center', fontSize: 15, lineHeight: 22, paddingHorizontal: 8 }}>
                Your account for {email || 'this email'} isn’t verified yet. Please check your inbox for the verification link.
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowVerifyModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton, cooldown > 0 ? { opacity: 0.6 } : null]}
                onPress={handleResendVerification}
                disabled={loading || cooldown > 0}
              >
                <Text style={styles.acceptButtonText}>
                  {cooldown > 0 ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2,'0')}` : 'Resend Verification Email'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  safeArea: {
    flex: 1,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingCircle1: {
    position: 'absolute',
    top: 100,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(142, 68, 173, 0.1)',
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  floatingCircle2: {
    position: 'absolute',
    top: 300,
    left: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(196, 69, 105, 0.08)',
    shadowColor: '#c44569',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  floatingCircle3: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(45, 27, 105, 0.15)',
    shadowColor: '#2d1b69',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    paddingBottom: 60,
    zIndex: 1,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    zIndex: 1,
  },
  logo: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    marginTop: 10,
    textShadowColor: 'rgba(142, 68, 173, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: 'rgba(142, 68, 173, 0.6)',
    borderRadius: 2,
    marginTop: 8,
  },
  appIcon: {
    width: 150,
    height: 150,
    marginBottom: 15,
    marginTop: 20
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 0,
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
    backdropFilter: 'blur(20px)',
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '400',
  },
  formContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  termsContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#8e44ad',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#8e44ad',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  termsLink: {
    color: '#8e44ad',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#8e44ad',
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
    shadowColor: '#8e44ad',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#ccc',
  },
  linkText: {
    color: '#8e44ad',
    fontWeight: '600',
  },
  verificationContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  verificationIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  resendButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#1a0b2e',
    borderRadius: 20,
    margin: 20,
    maxHeight: '80%',
    width: width - 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  termsContent: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  termsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  acceptButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
