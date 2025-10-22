import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase-client';
import { iapWrapper, Subscription, Purchase, PurchaseUpdatedListener, PurchaseErrorListener } from '@/lib/iap-wrapper';

export type SubscriptionTier = 'free' | 'premium' | 'family';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trialing';

interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  expiresAt?: Date;
  isActive: boolean;
  productIdentifier?: string;
  originalPurchaseDate?: Date;
}

class SubscriptionService {
  private static instance: SubscriptionService;
  private initialized = false;
  private currentUserId: string | null = null;
  private readonly isExpoGoOrWeb = Platform.OS === 'web' || (Constants?.appOwnership === 'expo');
  private purchaseUpdateSub: PurchaseUpdatedListener | null = null;
  private purchaseErrorSub: PurchaseErrorListener | null = null;
  private pendingPurchaseResolve: ((value: boolean) => void) | null = null;
  private pendingPurchaseReject: ((reason?: any) => void) | null = null;

  // SKU configured in App Store Connect (7-day trial handled by Apple config)
  public readonly PREMIUM_SKU = 'com.momentumaicalendar.premium.monthly';

  private constructor() {}

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async initialize(userId: string): Promise<void> {
    if (this.initialized && this.currentUserId === userId) {
      return;
    }

    try {
      if (this.isExpoGoOrWeb) {
        console.log('Expo Go/Web detected. Skipping native IAP init. Use a Dev Build to test purchases.');
        this.currentUserId = userId;
        this.initialized = true;
        return;
      }

      await iapWrapper.initConnection();
      await iapWrapper.flushFailedPurchasesCachedAsPendingAndroid();

      this.currentUserId = userId;
      this.initialized = true;

      // Set up listeners once
      this.setupPurchaseListeners();

      // Sync subscription status with backend
      await this.syncSubscriptionStatus();
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
      if (!this.isExpoGoOrWeb) throw error;
    }
  }

  private setupPurchaseListeners(): void {
    if (this.purchaseUpdateSub || this.purchaseErrorSub) return;

    this.purchaseUpdateSub = iapWrapper.purchaseUpdatedListener(async (purchase) => {
      try {
        // iOS receipt
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          const verified = await this.verifyAndApplyEntitlement(receipt);
          try {
            await iapWrapper.finishTransaction({ purchase, isConsumable: false });
          } catch (e) {
            console.warn('finishTransaction error:', e);
          }
          if (this.pendingPurchaseResolve) {
            this.pendingPurchaseResolve(verified);
            this.pendingPurchaseResolve = null;
            this.pendingPurchaseReject = null;
          }
        }
      } catch (err) {
        console.error('Error processing purchase:', err);
        if (this.pendingPurchaseReject) this.pendingPurchaseReject(err);
        this.pendingPurchaseResolve = null;
        this.pendingPurchaseReject = null;
      }
    });

    this.purchaseErrorSub = iapWrapper.purchaseErrorListener((err) => {
      console.error('IAP error:', err);
      if (this.pendingPurchaseReject) this.pendingPurchaseReject(err);
      this.pendingPurchaseResolve = null;
      this.pendingPurchaseReject = null;
    });
  }

  async getSubscriptions(): Promise<Subscription[]> {
    try {
      if (this.isExpoGoOrWeb) {
        console.log('getSubscriptions: Providing mock subscriptions for Expo Go/Web testing');
        // Provide mock subscriptions for testing in Expo Go
        return [
          {
            productId: this.PREMIUM_SKU,
            title: 'Momentum Premium',
            description: '7-day free trial, then $4.99/month',
            price: '$4.99',
            localizedPrice: '$4.99',
            currency: 'USD'
          }
        ];
      }
      const subs = await iapWrapper.getSubscriptions({ skus: [this.PREMIUM_SKU] });
      return subs;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  async purchaseSubscription(): Promise<boolean> {
    try {
      console.log('Purchase attempt - isExpoGoOrWeb:', this.isExpoGoOrWeb);
      
      if (this.isExpoGoOrWeb) {
        console.log('Running in Expo Go/Web mode - showing simulation dialog');
        // In Expo Go, simulate the purchase flow for UI testing
        return new Promise((resolve) => {
          Alert.alert(
            'Expo Go Testing Mode',
            'This is a test purchase flow. In a production build, this would process a real payment through the App Store.\n\nWould you like to simulate a successful purchase?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Simulate Purchase',
                onPress: async () => {
                  console.log('Simulating successful purchase in Expo Go');
                  
                  // Simulate premium upgrade in development
                  try {
                    await this.simulatePremiumUpgrade();
                    resolve(true);
                  } catch (error) {
                    console.error('Error simulating premium upgrade:', error);
                    resolve(false);
                  }
                }
              }
            ]
          );
        });
      }
      
      console.log('Attempting real purchase with SKU:', this.PREMIUM_SKU);
      const result = new Promise<boolean>((resolve, reject) => {
        this.pendingPurchaseResolve = resolve;
        this.pendingPurchaseReject = reject;
      });
      await iapWrapper.requestSubscription({ sku: this.PREMIUM_SKU });
      console.log('Purchase request sent, waiting for result...');
      return await result;
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', (error as any)?.message || 'An error occurred during purchase');
      return false;
    }
  }

  private async simulatePremiumUpgrade(): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user ID available');
    }

    // Update user profile to premium in Supabase
    // Try to update premium fields, but handle gracefully if they don't exist yet
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier: 'premium',
          subscription_status: 'active',
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentUserId);

      if (error) {
        console.log('Premium columns not found in database, but simulation completed for UI testing');
        console.log('Database update error (expected):', error.message);
        return;
      }
    } catch (dbError) {
      console.log('Simulating premium upgrade (database columns not available yet)');
      console.log('Database error (expected):', (dbError as any)?.message || dbError);
    }

    // Also update auth.users metadata for premium status
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          subscription_tier: 'premium',
          subscription_status: 'active',
          is_premium: true,
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      
      if (authError) {
        console.log('Could not update auth metadata:', authError.message);
      } else {
        console.log('Successfully updated auth.users metadata with premium status');
      }
    } catch (authMetaError) {
      console.log('Auth metadata update error (non-critical):', (authMetaError as any)?.message);
    }

    console.log('Successfully simulated premium upgrade for user:', this.currentUserId);
  }

  formatPrice(subscription: Subscription): string {
    if (this.isExpoGoOrWeb) {
      return '$4.99/month after 7-day free trial';
    }
    return subscription.localizedPrice || subscription.price || '$4.99/month';
  }

  async restorePurchases(): Promise<boolean> {
    try {
      if (this.isExpoGoOrWeb) {
        // In Expo Go, provide testing options for restore flow
        return new Promise((resolve) => {
          Alert.alert(
            'Expo Go Testing Mode',
            'In production, this would restore purchases from the App Store.\n\nSimulate restoring premium status?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false)
              },
              {
                text: 'Simulate Restore',
                onPress: async () => {
                  try {
                    await this.simulatePremiumUpgrade();
                    Alert.alert('Success', 'Premium status restored (simulation)');
                    resolve(true);
                  } catch (error) {
                    console.error('Error simulating restore:', error);
                    Alert.alert('Error', 'Failed to simulate restore');
                    resolve(false);
                  }
                }
              }
            ]
          );
        });
      }
      const purchases = await iapWrapper.getAvailablePurchases();
      // Find latest iOS receipt among matching product id
      const latest = purchases
        .filter(p => p.productId === this.PREMIUM_SKU)
        .sort((a, b) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0))[0];

      if (latest?.transactionReceipt) {
        const verified = await this.verifyAndApplyEntitlement(latest.transactionReceipt);
        if (verified) Alert.alert('Success', 'Your purchases have been restored');
        else Alert.alert('No Active Subscription', 'No active subscription found');
        return verified;
      }
      Alert.alert('No Purchases', 'No previous purchases found');
      return false;
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again later.');
      return false;
    }
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    try {
      if (this.isExpoGoOrWeb) {
        // In Expo Go / Web, default to free tier
        return { tier: 'free', status: 'active', isActive: false };
      }
      // Fetch latest available purchases and verify
      const purchases = await iapWrapper.getAvailablePurchases();
      const latest = purchases
        .filter(p => p.productId === this.PREMIUM_SKU)
        .sort((a, b) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0))[0];
      if (latest?.transactionReceipt) {
        const entitlement = await this.verifyReceipt(latest.transactionReceipt);
        return this.entitlementToSubscriptionInfo(entitlement);
      }
      return { tier: 'free', status: 'active', isActive: false };
    } catch (error) {
      console.error('Error getting subscription info:', error);
      return {
        tier: 'free',
        status: 'active',
        isActive: false,
      };
    }
  }

  private entitlementToSubscriptionInfo(entitlement: any): SubscriptionInfo {
    if (entitlement?.isActive) {
      return {
        tier: 'premium',
        status: 'active',
        isActive: true,
        productIdentifier: entitlement.productId,
        expiresAt: entitlement.expiresAt ? new Date(entitlement.expiresAt) : undefined,
        originalPurchaseDate: entitlement.originalPurchaseDate ? new Date(entitlement.originalPurchaseDate) : undefined,
      };
    }
    return { tier: 'free', status: 'active', isActive: false };
  }

  async syncSubscriptionStatus(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      if (this.isExpoGoOrWeb) return;
      const subInfo = await this.getSubscriptionInfo();

      // Update user profile with subscription info
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          subscription_tier: subInfo.tier,
          subscription_status: subInfo.status,
          subscription_expires_at: subInfo.expiresAt?.toISOString() || null,
          product_id: subInfo.productIdentifier || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.currentUserId);

      if (updateError) {
        console.error('Failed to update subscription status:', updateError);
        throw updateError;
      }

      // Log subscription event
      if (subInfo.isActive) {
        await this.logSubscriptionEvent(subInfo);
      }
    } catch (error) {
      console.error('Error syncing subscription status:', error);
      throw error;
    }
  }

  private async logSubscriptionEvent(subscriptionInfo: SubscriptionInfo): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: this.currentUserId,
          subscription_id: subscriptionInfo.productIdentifier || '',
          product_id: subscriptionInfo.productIdentifier || '',
          purchase_date: subscriptionInfo.originalPurchaseDate || new Date(),
          expires_date: subscriptionInfo.expiresAt,
          status: subscriptionInfo.status,
          tier: subscriptionInfo.tier,
          platform: Platform.OS,
          environment: __DEV__ ? 'sandbox' : 'production',
        });

      if (error) {
        console.error('Failed to log subscription event:', error);
      }
    } catch (error) {
      console.error('Error logging subscription event:', error);
    }
  }

  async checkSubscriptionStatus(): Promise<boolean> {
    const info = await this.getSubscriptionInfo();
    return info.isActive;
  }

  formatPrice(subscription: Subscription): string {
    return subscription.localizedPrice || subscription.price || '$4.99';
  }

  async cancelSubscription(): Promise<void> {
    // On iOS, users must cancel through Settings app
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Cancel Subscription',
        'To cancel your subscription, please go to Settings > [Your Name] > Subscriptions on your device.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } else {
      // On Android, we can open the management URL
      try {
        Alert.alert('Manage Subscription', 'Open the Play Store to manage your subscription.');
      } catch (error) {
        console.error('Error getting management URL:', error);
      }
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.purchaseUpdateSub?.remove();
      this.purchaseErrorSub?.remove();
      this.purchaseUpdateSub = null;
      this.purchaseErrorSub = null;
      if (this.initialized && !this.isExpoGoOrWeb) {
        await iapWrapper.endConnection();
      }
      this.initialized = false;
    } catch (e) {
      console.warn('IAP cleanup error:', e);
    }
  }

  private async verifyAndApplyEntitlement(receipt: string): Promise<boolean> {
    const entitlement = await this.verifyReceipt(receipt);
    const info = this.entitlementToSubscriptionInfo(entitlement);
    // Update DB
    if (this.currentUserId) {
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: info.tier,
          subscription_status: info.status,
          subscription_expires_at: info.expiresAt?.toISOString() || null,
          product_id: info.productIdentifier || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.currentUserId);
      if (info.isActive) {
        await this.logSubscriptionEvent(info);
      }
    }
    return info.isActive;
  }

  private async verifyReceipt(receipt: string): Promise<any> {
    try {
      const { data, error } = await (supabase as any).functions.invoke('verify_ios_receipt', {
        body: { receipt },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Receipt verification error:', err);
      return { isActive: false };
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();
