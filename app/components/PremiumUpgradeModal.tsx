import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  ImageBackground,
} from 'react-native';
import { X, Check, Lock, Target, Palette, Bot, TrendingUp } from 'lucide-react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useSubscription } from '@/providers/SubscriptionProvider';
import { useAuth } from '../../providers/AuthProvider';
import { subscriptionService } from '../../services/subscriptionService';
import { Subscription } from '../../lib/iap-wrapper';

interface PremiumUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  trigger?: 'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general';
}

export default function PremiumUpgradeModal({ 
  visible, 
  onClose, 
  onSuccess,
  trigger = 'general' 
}: PremiumUpgradeModalProps) {
  const { colors, isDark, isGalaxy } = useTheme();
  const { showUpgradeModal } = useSubscription();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  
  useEffect(() => {
    if (visible && user) {
      loadOfferings();
    }
  }, [visible, user]);
  
  const loadOfferings = async () => {
    try {
      setLoading(true);
      await subscriptionService.initialize(user!.id);
      const products = await subscriptionService.getSubscriptions();
      setSubs(products);
      if (products.length > 0) setSelected(products[0].productId);
    } catch (error) {
      console.error('Error loading offerings:', error);
      Alert.alert('Error', 'Unable to load subscription options. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchase = async () => {
    // Proceed even if no plan is pre-selected; service will fall back to default SKU
    console.log('PremiumUpgradeModal: Starting purchase process...');
    setLoading(true);
    try {
      // Ensure IAP is initialized and listeners are attached before requesting purchase
      if (user?.id) {
        await subscriptionService.initialize(user.id);
      }
      console.log('PremiumUpgradeModal: Calling subscriptionService.purchaseSubscription() with SKU:', selected);
      const success = await subscriptionService.purchaseSubscription(selected || undefined);
      console.log('PremiumUpgradeModal: Purchase result:', success);
      
      if (success) {
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription is now active. Enjoy all the premium features!',
          [{ text: 'OK', onPress: () => {
            onSuccess?.();
            onClose();
          }}]
        );
      } else {
        Alert.alert(
          'Purchase Failed', 
          'The subscription could not be completed. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('PremiumUpgradeModal: Purchase error:', error);
      // Provide more specific error messages based on the error type
      let errorMessage = 'An error occurred during the purchase process. Please try again.';
      
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.code) {
          switch (error.code) {
            case 'E_USER_CANCELLED':
              errorMessage = 'Purchase was cancelled.';
              break;
            case 'E_ITEM_UNAVAILABLE':
              errorMessage = 'This subscription is not available. Please try again later.';
              break;
            case 'E_NETWORK_ERROR':
              errorMessage = 'Network error. Please check your connection and try again.';
              break;
            case 'E_SERVICE_ERROR':
              errorMessage = 'Service temporarily unavailable. Please try again later.';
              break;
            default:
              errorMessage = `Purchase failed: ${error.code}`;
          }
        }
      }
      
      Alert.alert('Purchase Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRestore = async () => {
    setLoading(true);
    try {
      const restored = await subscriptionService.restorePurchases();
      if (restored) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getTriggerContent = () => {
    switch (trigger) {
      case 'goal_limit':
        return {
          title: 'You\'ve Reached Your Goal Limit',
          subtitle: 'Upgrade to create unlimited goals and unlock all premium features',
        };
      case 'ai_goal':
        return {
          title: 'AI Goal Creation is Premium',
          subtitle: 'Let AI help you create personalized goals with smart scheduling',
        };
      case 'color_picker':
        return {
          title: 'Custom Colors are Premium',
          subtitle: 'Personalize each goal with unique colors',
        };
      case 'analytics':
        return {
          title: 'Advanced Analytics are Premium',
          subtitle: 'Get detailed insights and progress reports',
        };
      default:
        return {
          title: 'Upgrade to Premium',
          subtitle: 'Unlock all features and reach your goals faster',
        };
    }
  };
  
  const features = [
    { icon: Target, title: 'Unlimited Goals', description: 'Create as many goals as you need' },
    { icon: Bot, title: 'AI Goal Creation', description: 'Smart goal planning with AI assistance' },
    { icon: Palette, title: 'Custom Colors', description: 'Personalize each goal with unique colors' },
    { icon: TrendingUp, title: 'Advanced Analytics', description: 'Detailed insights and progress tracking' },
  ];
  
  const { title, subtitle } = getTriggerContent();
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isGalaxy ? 'rgba(0, 0, 0, 0.5)' : colors.background }]}> 
        {isGalaxy && (
          <ImageBackground 
            source={require('@/assets/images/background.png')} 
            style={StyleSheet.absoluteFillObject} 
            resizeMode="cover"
          />
        )}
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon and Title */}
          <View style={styles.titleSection}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Image
                source={require('@/assets/images/premium-icon-2.png')}
                style={{ width: 96, height: 96 }}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>
          
          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Everything in Premium
            </Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.surface }]}>
                  <feature.icon size={24} color={colors.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          
          {/* Pricing Options */}
          {subs.length > 0 && (
            <View style={styles.pricingSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Choose Your Plan
              </Text>
              {subs.map((p) => (
                <TouchableOpacity
                  key={p.productId}
                  style={[
                    styles.pricingOption,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: selected === p.productId 
                        ? colors.primary 
                        : colors.border,
                      borderWidth: selected === p.productId ? 2 : 1,
                    }
                  ]}
                  onPress={() => setSelected(p.productId)}
                  disabled={loading}
                >
                  <View style={styles.pricingHeader}>
                    <View>
                      <Text style={[styles.planName, { color: colors.text }]}>
                        {p.title}
                      </Text>
                      <Text style={[styles.planPrice, { color: colors.primary }]}>
                        {subscriptionService.formatPrice(p)}
                      </Text>
                    </View>
                    {selected === p.productId && (
                      <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                        <Check size={16} color={colors.background} />
                      </View>
                    )}
                  </View>
                  {p.description && (
                    <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
                      {p.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                { backgroundColor: colors.primary },
                loading && styles.disabledButton
              ]}
              onPress={handlePurchase}
            disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={[styles.purchaseButtonText, { color: colors.background }]}>
                  Start Premium Now
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
            disabled={loading}
            >
              <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
                Restore Purchases
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Terms */}
          <View style={styles.termsSection}>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}> 
              By subscribing, you agree to our{' '}
              <Text 
                style={{ color: colors.primary }}
                onPress={() => {
                  // Navigate to Settings screen where Terms modal exists
                  try {
                    const { router } = require('expo-router');
                    router.push('/(tabs)/settings');
                  } catch {
                    Alert.alert('Where to find Terms', 'Open Settings > Legal & Privacy to view the Terms.');
                  }
                }}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text 
                style={{ color: colors.primary }}
                onPress={() => {
                  try {
                    const { router } = require('expo-router');
                    router.push('/(tabs)/settings');
                  } catch {
                    Alert.alert('Where to find Privacy Policy', 'Open Settings > Legal & Privacy to view the Privacy Policy.');
                  }
                }}
              >
                Privacy Policy
              </Text>
            </Text>
            <Text style={[styles.termsText, { color: colors.textSecondary, marginTop: 8 }]}>
              Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresSection: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
  },
  pricingSection: {
    marginBottom: 32,
  },
  pricingOption: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSection: {
    marginBottom: 24,
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  termsSection: {
    paddingTop: 20,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
