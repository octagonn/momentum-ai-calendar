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
  public readonly PREMIUM_SKU = 'com.yourapp.premium.monthly';

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
        console.log('getSubscriptions skipped in Expo Go/Web.');
        return [];
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
      if (this.isExpoGoOrWeb) {
        Alert.alert('Subscriptions Unavailable in Expo Go', 'Install a Development Build to test purchases.');
        return false;
      }
      const result = new Promise<boolean>((resolve, reject) => {
        this.pendingPurchaseResolve = resolve;
        this.pendingPurchaseReject = reject;
      });
      await iapWrapper.requestSubscription({ sku: this.PREMIUM_SKU });
      return await result;
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Purchase Failed', (error as any)?.message || 'An error occurred during purchase');
      return false;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      if (this.isExpoGoOrWeb) {
        Alert.alert('Restore Unavailable in Expo Go', 'Install a Development Build to restore purchases.');
        return false;
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
