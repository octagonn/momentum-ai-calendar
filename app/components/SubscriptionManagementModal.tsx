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
  Linking,
} from 'react-native';
import { X, Crown, CreditCard, Settings, ExternalLink, AlertCircle, Sparkles, Target, Zap, Lock, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useUser } from '../../providers/UserProvider';
import { useSubscription } from '../../providers/SubscriptionProvider';
import { subscriptionService } from '../../services/subscriptionService';

interface SubscriptionManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionManagementModal({ 
  visible, 
  onClose 
}: SubscriptionManagementModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { user: userProfile } = useUser();
  const { isPremium, isTrialing } = useSubscription();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    if (visible && user) {
      loadSubscriptionInfo();
    }
  }, [visible, user]);

  const loadSubscriptionInfo = async () => {
    try {
      setLoading(true);
      const info = await subscriptionService.getSubscriptionInfo();
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription info:', error);
      // Use actual subscription status from provider
      setSubscriptionInfo({
        tier: isPremium ? 'premium' : 'free',
        status: isTrialing ? 'trialing' : (isPremium ? 'active' : 'inactive'),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        trialEndsAt: userProfile?.trialEndsAt ? new Date(userProfile.trialEndsAt) : null,
        price: '$4.99',
        billingPeriod: 'monthly',
        features: [
          { icon: 'target', text: 'Unlimited Goals', description: 'Create as many goals as you need' },
          { icon: 'sparkles', text: 'AI Goal Creation', description: 'Let AI build personalized plans' },
          { icon: 'zap', text: 'Unlimited AI Chats', description: 'No weekly chat limits' },
          { icon: 'crown', text: 'Custom Goal Colors', description: 'Personalize your goals' },
          { icon: 'check', text: 'Priority Support', description: 'Get help faster' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageOnAppStore = () => {
    Alert.alert(
      'Manage on App Store',
      'To modify your subscription or view billing history, you\'ll need to manage it through the App Store.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open App Store',
          onPress: () => {
            // Open App Store subscription management
            Linking.openURL('https://apps.apple.com/account/subscriptions');
          }
        }
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'trialing': return colors.warning;
      case 'cancelled': return colors.danger;
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'trialing': return 'Free Trial';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { 
          paddingTop: insets.top + 16,
          borderBottomColor: colors.border 
        }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Crown size={24} color={colors.background} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              My Subscription
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading subscription details...
              </Text>
            </View>
          ) : (
            <>
              {/* Subscription Status Card */}
              <View style={[styles.statusCard, { 
                backgroundColor: colors.surface,
                borderColor: isPremium ? colors.primary : colors.border,
                borderWidth: isPremium ? 2 : 1,
              }]}>
                {isPremium && (
                  <View style={[styles.premiumBadge, { backgroundColor: colors.primary }]}>
                    <Crown size={14} color={colors.background} />
                    <Text style={[styles.premiumBadgeText, { color: colors.background }]}>
                      PREMIUM
                    </Text>
                  </View>
                )}
                
                <View style={styles.statusHeader}>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: colors.text }]}>
                      Momentum {isPremium ? 'Premium' : 'Free'}
                    </Text>
                    <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                      {isPremium 
                        ? 'All premium features unlocked' 
                        : 'Limited features'}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { 
                    backgroundColor: getStatusColor(subscriptionInfo?.status) + '20',
                    borderColor: getStatusColor(subscriptionInfo?.status)
                  }]}>
                    <Text style={[styles.statusText, { 
                      color: getStatusColor(subscriptionInfo?.status) 
                    }]}>
                      {getStatusText(subscriptionInfo?.status)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.priceContainer, { 
                  backgroundColor: colors.background,
                  borderColor: colors.border 
                }]}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    Monthly Price
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.primary }]}>
                    {subscriptionInfo?.price || '$4.99'}
                    <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
                      /{subscriptionInfo?.billingPeriod || 'month'}
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Premium Features - Always show */}
              <View style={[styles.featuresCard, { 
                backgroundColor: colors.surface,
                borderColor: colors.border 
              }]}>
                <View style={styles.sectionTitleContainer}>
                  <Crown size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Premium Features
                  </Text>
                </View>
                {[
                  { icon: 'target', text: 'Unlimited Goals', description: 'Create as many goals as you need' },
                  { icon: 'sparkles', text: 'AI Goal Creation', description: 'Let AI build personalized plans' },
                  { icon: 'zap', text: 'Unlimited AI Chats', description: 'No weekly chat limits' },
                  { icon: 'crown', text: 'Custom Goal Colors', description: 'Personalize your goals' },
                  { icon: 'check', text: 'Priority Support', description: 'Get help faster' }
                ].map((feature: any, index: number) => {
                  const IconComponent = 
                    feature.icon === 'target' ? Target :
                    feature.icon === 'sparkles' ? Sparkles :
                    feature.icon === 'zap' ? Zap :
                    feature.icon === 'crown' ? Crown :
                    Check;
                  
                  return (
                    <View key={index} style={[styles.featureItem, { 
                      backgroundColor: colors.background,
                      borderColor: isPremium ? colors.primary + '40' : colors.border,
                      opacity: isPremium ? 1 : 0.7,
                    }]}>
                      <View style={[styles.featureIconContainer, { 
                        backgroundColor: isPremium ? colors.primary + '15' : colors.border + '40'
                      }]}>
                        <IconComponent size={18} color={isPremium ? colors.primary : colors.textSecondary} />
                      </View>
                      <View style={styles.featureTextContainer}>
                        <Text style={[styles.featureText, { color: colors.text }]}>
                          {feature.text}
                        </Text>
                        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                          {feature.description}
                        </Text>
                      </View>
                      {isPremium && (
                        <Check size={20} color={colors.success} style={{ marginLeft: 8 }} />
                      )}
                      {!isPremium && (
                        <Lock size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Trial Information */}
              {subscriptionInfo?.trialEndsAt && subscriptionInfo.status === 'trialing' && (
                <View style={[styles.trialCard, { 
                  backgroundColor: colors.warning + '20',
                  borderColor: colors.warning 
                }]}>
                  <View style={styles.trialHeader}>
                    <AlertCircle size={20} color={colors.warning} />
                    <Text style={[styles.trialTitle, { color: colors.warning }]}>
                      Free Trial Active
                    </Text>
                  </View>
                  <Text style={[styles.trialText, { color: colors.text }]}>
                    Your 7-day free trial ends on {formatDate(subscriptionInfo.trialEndsAt)}. 
                    You will be charged {subscriptionInfo.price || '$4.99'} monthly afterwards.
                  </Text>
                </View>
              )}

              {/* Management Actions */}
              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={[styles.actionButton, { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border 
                  }]}
                  onPress={handleManageOnAppStore}
                >
                  <Settings size={20} color={colors.primary} />
                  <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                    Manage on App Store
                  </Text>
                  <ExternalLink size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </>
          )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  premiumBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
    marginRight: 12,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
  },
  priceContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  pricePeriod: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  trialCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trialText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsSection: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dangerButton: {
    // Additional styling for dangerous actions
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});
