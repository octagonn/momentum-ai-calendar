import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase-client';
import { iapWrapper, Subscription, Purchase, PurchaseUpdatedListener, PurchaseErrorListener, iapEnvironment } from '@/lib/iap-wrapper';

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
  // Treat IAP as available if native module exists; this works on TestFlight/App Store
  private readonly isWeb = Platform.OS === 'web';
  private purchaseUpdateSub: { remove: () => void } | null = null;
  private purchaseErrorSub: { remove: () => void } | null = null;
  private pendingPurchaseResolve: ((value: boolean) => void) | null = null;
  private pendingPurchaseReject: ((reason?: any) => void) | null = null;
  private purchaseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Default SKU configured in App Store Connect (7-day trial handled by Apple config)
  public readonly PREMIUM_SKU = 'com.momentumaicalendar.premium.monthly';
  // Allow multiple SKUs via env (comma-separated), fallback to default
  private readonly productSkus: string[] = (() => {
    try {
      // Read from Expo env if available
      const raw = (Constants?.expoConfig?.extra?.iosPremiumSkus
        || (Constants as any)?.manifestExtra?.iosPremiumSkus
        || (process as any)?.env?.EXPO_PUBLIC_IOS_PREMIUM_SKUS
        || '').toString();
      const list = raw.split(',').map((s: string) => s.trim()).filter(Boolean);
      const unique = Array.from(new Set([this.PREMIUM_SKU, ...list]));
      return unique;
    } catch {
      return [this.PREMIUM_SKU];
    }
  })();

  private constructor() {}

  private clearPurchaseTimeout(): void {
    if (this.purchaseTimeoutId) {
      clearTimeout(this.purchaseTimeoutId);
      this.purchaseTimeoutId = null;
    }
  }

  private resetPendingPurchaseHandlers(): void {
    this.pendingPurchaseResolve = null;
    this.pendingPurchaseReject = null;
  }

  private dropPendingPurchaseState(): void {
    this.resetPendingPurchaseHandlers();
    this.clearPurchaseTimeout();
  }

  private resolvePendingPurchase(value: boolean): void {
    if (this.pendingPurchaseResolve) {
      this.pendingPurchaseResolve(value);
    }
    this.resetPendingPurchaseHandlers();
    this.clearPurchaseTimeout();
  }

  private rejectPendingPurchase(error: any): void {
    if (this.pendingPurchaseReject) {
      this.pendingPurchaseReject(error);
    }
    this.resetPendingPurchaseHandlers();
    this.clearPurchaseTimeout();
  }

  public static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  async initialize(userId: string): Promise<void> {
    if (this.initialized && this.currentUserId === userId) {
      console.log('SubscriptionService: Already initialized for user:', userId);
      return;
    }

    try {
      console.log('SubscriptionService: Initializing for user:', userId);
      console.log('SubscriptionService: IAP available:', iapWrapper.isAvailable(), 'isWeb:', this.isWeb);

      console.log('SubscriptionService: Initializing IAP connection...');
      await iapWrapper.initConnection();
      await iapWrapper.flushFailedPurchasesCachedAsPendingAndroid();

      this.currentUserId = userId;
      this.initialized = true;

      // Set up listeners once
      console.log('SubscriptionService: Setting up purchase listeners...');
      this.setupPurchaseListeners();

      // Check purchase history on app load (like video shows)
      console.log('SubscriptionService: Checking purchase history on app load...');
      await this.checkPurchaseHistoryOnLoad();

      // Sync subscription status with backend
      console.log('SubscriptionService: Syncing subscription status...');
      await this.syncSubscriptionStatus();
      
      console.log('SubscriptionService: Initialization complete');
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
      if (iapWrapper.isAvailable()) throw error;
    }
  }

  private setupPurchaseListeners(): void {
    if (this.purchaseUpdateSub || this.purchaseErrorSub) return;

    this.purchaseUpdateSub = iapWrapper.purchaseUpdatedListener(async (purchase) => {
      try {
        console.log('SubscriptionService: Purchase updated listener triggered', {
          productId: purchase.productId,
          transactionDate: purchase.transactionDate,
          hasReceipt: !!purchase.transactionReceipt,
        });
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7db76500-e7e9-4667-9c7b-923150602078',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sessionId:'debug-session',
            runId:'run1',
            hypothesisId:'H5',
            location:'subscriptionService.ts:purchaseUpdatedListener',
            message:'purchaseUpdatedListener fired',
            data:{
              productId: purchase.productId,
              hasReceipt: !!purchase.transactionReceipt
            },
            timestamp:Date.now()
          })
        }).catch(()=>{});
        // #endregion
        try {
          const { getIapLocalLog } = await import('@/lib/iap-wrapper');
          const logs = getIapLocalLog();
          logs.push({
            t: Date.now(),
            loc: 'subscriptionService:purchaseUpdatedListener',
            msg: 'listener fired',
            data: { productId: purchase.productId, hasReceipt: !!purchase.transactionReceipt }
          });
        } catch {}
        this.clearPurchaseTimeout();
        // iOS receipt
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          console.log('SubscriptionService: Verifying receipt from purchase update...');
          const verified = await this.verifyAndApplyEntitlement(receipt);
          console.log('SubscriptionService: Receipt verification result:', verified);
          try {
            await iapWrapper.finishTransaction({ purchase, isConsumable: false });
            console.log('SubscriptionService: Transaction finished successfully');
          } catch (e) {
            console.warn('SubscriptionService: finishTransaction error:', e);
          }
          this.resolvePendingPurchase(verified);
        } else {
          console.warn('SubscriptionService: Purchase update received but no receipt found');
          this.rejectPendingPurchase(
            new Error('Apple reported a purchase but did not include a receipt. Please try again.')
          );
        }
      } catch (err) {
        console.error('SubscriptionService: Error processing purchase:', err);
        this.rejectPendingPurchase(err);
      }
    });

    this.purchaseErrorSub = iapWrapper.purchaseErrorListener((err) => {
      console.error('SubscriptionService: IAP error received:', {
        code: (err as any)?.code,
        message: (err as any)?.message,
        error: err,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7db76500-e7e9-4667-9c7b-923150602078',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'run1',
          hypothesisId:'H6',
          location:'subscriptionService.ts:purchaseErrorListener',
          message:'purchaseErrorListener fired',
          data:{
            code:(err as any)?.code,
            message:(err as any)?.message
          },
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion
      try {
        const { getIapLocalLog } = require('@/lib/iap-wrapper');
        const logs = getIapLocalLog();
        logs.push({
          t: Date.now(),
          loc: 'subscriptionService:purchaseErrorListener',
          msg: 'error listener fired',
          data: { code: (err as any)?.code, message: (err as any)?.message }
        });
      } catch {}
      // Handle error code 2 (user cancelled) silently - don't show error alert
      const errorCode = (err as any)?.code;
      if (errorCode === 2 || errorCode === 'E_USER_CANCELLED') {
        console.log('SubscriptionService: Purchase cancelled by user (error code 2) - handling silently');
        // Still reject the promise but don't show error to user
        this.rejectPendingPurchase(err);
        return;
      }
      
      // For other errors, reject normally
      this.rejectPendingPurchase(err);
    });
  }

  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const subs = await iapWrapper.getSubscriptions({ skus: this.productSkus });
      return subs;
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  async purchaseSubscription(sku?: string): Promise<boolean> {
    try {
      console.log('Purchase attempt - iap env:', iapEnvironment);

      if (!this.canUseNativeIap()) {
        throw new Error(
          'In-App Purchases are unavailable in this build. Please install the latest TestFlight or App Store version.'
        );
      }
      
      const targetSku = sku && this.productSkus.includes(sku) ? sku : this.productSkus[0];
      console.log('Attempting real purchase with SKU:', targetSku);
      console.log('Available SKUs:', this.productSkus);
      
      if (!targetSku) {
        throw new Error('No valid subscription SKU found');
      }

      // If Apple already has an active subscription for this SKU, treat it as success
      const alreadyActive = await this.checkAppleForExistingSubscription(targetSku);
      if (alreadyActive) {
        console.log(
          'SubscriptionService: Existing active Apple subscription detected before purchase; skipping requestSubscription'
        );
        return true;
      }
      
      // Clear any previous pending purchase state
      this.dropPendingPurchaseState();

      const result = new Promise<boolean>((resolve, reject) => {
        this.pendingPurchaseResolve = resolve;
        this.pendingPurchaseReject = reject;
      });

      // Set a timeout so the UI can't spin forever if StoreKit never calls back
      const timeoutMs = 60000;
      this.purchaseTimeoutId = setTimeout(async () => {
        // Gather diagnostic info for debugging
        let diagInfo = '';
        try {
          const { iapDebugStore } = await import('@/lib/iap-wrapper');
          const reqAt = iapDebugStore?.lastRequestAtMs || 0;
          const listenerAt = iapDebugStore?.lastListenerEventAtMs || 0;
          const variant = iapDebugStore?.lastRequestVariant || 'none';
          const lastErr = iapDebugStore?.lastRequestError || '';
          diagInfo = ` [variant=${variant}, reqAt=${reqAt}, listenerAt=${listenerAt}${lastErr ? `, err=${lastErr}` : ''}]`;
        } catch {}
        console.warn(
          `SubscriptionService: Purchase timed out after ${timeoutMs}ms waiting for StoreKit response${diagInfo}`
        );
        this.rejectPendingPurchase(
          new Error(
            `Timed out waiting for a response from Apple. Please check your connection and try again.${diagInfo}`
          )
        );
      }, timeoutMs);

      console.log('Calling iapWrapper.requestSubscription...');
      await iapWrapper.requestSubscription({ sku: targetSku });
      console.log('Purchase request sent, waiting for result...');
      const outcome = await result;
      return outcome;
    } catch (error) {
      this.dropPendingPurchaseState();
      console.error('Purchase error:', error);
      // Rethrow so the UI can present a specific error message (e.g., server misconfiguration)
      throw error;
    } finally {
      this.dropPendingPurchaseState();
    }
  }

  /**
   * Before starting a new purchase, ask Apple if there is already an active subscription
   * for this SKU. If so, we verify and apply the entitlement and skip the purchase sheet.
   */
  private async checkAppleForExistingSubscription(targetSku: string): Promise<boolean> {
    if (!this.canUseNativeIap()) return false;

    try {
      console.log(
        'SubscriptionService: Checking Apple for existing subscription before purchase for SKU:',
        targetSku
      );
      const purchases = await iapWrapper.getAvailablePurchases();
      console.log(
        'SubscriptionService: Pre-purchase available purchases from Apple:',
        purchases.length
      );

      const matching = purchases
        .filter((p: any) => p.productId === targetSku)
        .sort(
          (a: any, b: any) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0)
        );
      const latest = matching[0];

      if (!latest?.transactionReceipt) {
        console.log(
          'SubscriptionService: No receipt found for matching Apple subscription before purchase'
        );
        return false;
      }

      console.log(
        'SubscriptionService: Verifying existing Apple receipt before purchase to determine entitlement...'
      );
      const entitlement = await this.verifyReceipt(latest.transactionReceipt);
      console.log('SubscriptionService: Pre-purchase entitlement from Apple:', {
        isActive: entitlement?.isActive,
        productId: entitlement?.productId,
        expiresAt: entitlement?.expiresAt,
        status: entitlement?.status,
      });

      if (entitlement?.isActive) {
        console.log(
          'SubscriptionService: Apple reports an active subscription; applying entitlement without new purchase'
        );
        const applied = await this.verifyAndApplyEntitlement(latest.transactionReceipt);
        if (applied) {
          console.log('SubscriptionService: Preflight active subscription applied; returning success without opening StoreKit.');
          return true;
        }
        console.warn(
          'SubscriptionService: verifyAndApplyEntitlement returned false even though Apple reported an active subscription'
        );
        return false;
      }

      console.log(
        'SubscriptionService: Existing Apple subscription is not active (expired/cancelled); proceeding with purchase'
      );
      return false;
    } catch (error) {
      console.error(
        'SubscriptionService: Error checking existing Apple subscription before purchase (allowing purchase to proceed):',
        error
      );
      // Do not block purchase if this pre-check fails
      return false;
    }
  }

  canUseNativeIap(): boolean {
    return !this.isWeb && iapWrapper.isAvailable();
  }

  async resyncPurchaseHistory(): Promise<void> {
    await this.checkPurchaseHistoryOnLoad();
  }

  private async simulatePremiumUpgrade(): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user ID available');
    }

    // Persist a 7-day trial using server-side RPC to ensure DB state survives reloads
    try {
      const supa = supabase as any;
      const { error: rpcError } = await supa.rpc('start_premium_trial', { p_days: 7 });
      if (rpcError) {
        console.warn('start_premium_trial RPC failed, falling back to direct profile update:', rpcError?.message || rpcError);
        // Fallback: direct update (older schemas). Keep trial semantics (trialing + end date)
        const { error } = await supa
          .from('user_profiles')
          .update({
            subscription_tier: 'premium',
            subscription_status: 'trialing',
            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', this.currentUserId);
        if (error) {
          console.log('Database update error (expected in some local setups):', error.message);
        }
      }
    } catch (dbError) {
      console.log('Simulating premium upgrade (RPC/direct DB update not available):', (dbError as any)?.message || dbError);
    }

    // Also update auth.users metadata for premium status
    try {
      const supa = supabase as any;
      const { error: authError } = await supa.auth.updateUser({
        data: {
          subscription_tier: 'premium',
          subscription_status: 'trialing',
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

    // Hint: in Expo Go, some components rely on the in-memory featureGate too.
    // Try to trigger a profile refresh by invoking a lightweight update.
    try {
      const supa = supabase as any;
      await supa.from('user_profiles').update({ updated_at: new Date().toISOString() }).eq('id', this.currentUserId);
    } catch {}
  }

  async restorePurchases(): Promise<boolean> {
    try {
      console.log('SubscriptionService: restorePurchases invoked');
      if (!iapWrapper.isAvailable() || this.isWeb) {
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
      console.log('SubscriptionService: restorePurchases found purchases:', purchases.length);
      // Find latest iOS receipt among matching product id
      const matchingPurchases = purchases.filter((p: any) =>
        this.productSkus.includes(p.productId)
      );
      const latest = matchingPurchases
        .sort((a: any, b: any) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0))[0];

      if (!latest) {
        console.log('SubscriptionService: restorePurchases - no matching products found');
        Alert.alert(
          'No Purchases Found',
          'Apple did not return any Momentum Premium purchases for this sandbox account.'
        );
        await this.clearSubscriptionStatus();
        return false;
      }

      if (latest?.transactionReceipt) {
        try {
          const verified = await this.verifyAndApplyEntitlement(latest.transactionReceipt);
          // DB is the source of truth; verified indicates DB updated to premium
          if (verified) {
            Alert.alert('Success', 'Your purchases have been restored');
          } else {
            Alert.alert(
              'No Active Subscription',
              'Apple returned a receipt, but it is expired or cancelled. Please check your subscription status in the Settings app.'
            );
          }
          return verified;
        } catch (verificationError) {
          console.error('SubscriptionService: restorePurchases verification failed:', verificationError);
          Alert.alert('Restore Failed', this.getRestoreErrorMessage(verificationError));
          return false;
        }
      }
      Alert.alert(
        'No Receipt',
        'Apple returned a purchase but without a receipt. Please try again in a moment.'
      );
      await this.clearSubscriptionStatus();
      return false;
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Restore Failed', this.getRestoreErrorMessage(error));
      return false;
    }
  }

  private getRestoreErrorMessage(error: any): string {
    if (!error) return 'Unable to restore purchases. Please try again later.';
    if (typeof error === 'string') return error;
    if (typeof error?.message === 'string') return error.message;
    if (error?.code === 'E_NETWORK_ERROR') {
      return 'Network error while contacting Apple. Please check your connection and try again.';
    }
    return 'Unable to restore purchases. Please try again later.';
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo> {
    try {
      if (!iapWrapper.isAvailable() || this.isWeb) {
        // In Expo Go / Web, default to free tier
        return { tier: 'free', status: 'expired', isActive: false };
      }
      // Fetch latest available purchases and verify
      const purchases = await iapWrapper.getAvailablePurchases();
      const latest = purchases
        .filter((p: any) => this.productSkus.includes(p.productId))
        .sort((a: any, b: any) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0))[0];
      if (latest?.transactionReceipt) {
        const entitlement = await this.verifyReceipt(latest.transactionReceipt);
        return this.entitlementToSubscriptionInfo(entitlement);
      }
      return { tier: 'free', status: 'expired', isActive: false };
    } catch (error) {
      console.error('Error getting subscription info:', error);
      return {
        tier: 'free',
        status: 'expired',
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
    // Non-active entitlement maps to non-active state
    return { tier: 'free', status: 'expired', isActive: false };
  }

  async syncSubscriptionStatus(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      if (!this.canUseNativeIap()) {
        console.log('SubscriptionService: Native IAP unavailable, skipping sync');
        return;
      }

      const purchases = await iapWrapper.getAvailablePurchases();
      const latest = purchases
        .filter((p: any) => this.productSkus.includes(p.productId))
        .sort((a: any, b: any) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0))[0];

      if (latest?.transactionReceipt) {
        console.log('SubscriptionService: syncSubscriptionStatus verifying latest receipt from Apple');
        await this.verifyAndApplyEntitlement(latest.transactionReceipt);
      } else {
        console.log('SubscriptionService: syncSubscriptionStatus - no receipts returned, clearing entitlement');
        await this.clearSubscriptionStatus();
      }
    } catch (error) {
      console.error('SubscriptionService: Error syncing subscription status:', error);
      throw error;
    }
  }

  private async clearSubscriptionStatus(): Promise<void> {
    if (!this.currentUserId) return;
    try {
      const supa = supabase as any;
      const payload = {
        p_status: 'expired',
        p_tier: 'free',
        p_product_id: null,
        p_expires_at: null,
        p_subscription_id: null,
        p_platform: Platform.OS,
        p_environment: __DEV__ ? 'sandbox' : 'production',
      };

      const { error: rpcError } = await supa.rpc('upsert_subscription_event', payload);

      if (rpcError) {
        console.error('SubscriptionService: clearSubscriptionStatus RPC failed, attempting direct update:', rpcError);
        const { error: updateError } = await supa
          .from('user_profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'expired',
            subscription_expires_at: null,
            product_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', this.currentUserId);

        if (updateError) {
          console.error('SubscriptionService: clearSubscriptionStatus direct update failed:', updateError);
        }
      } else {
        console.log('SubscriptionService: clearSubscriptionStatus applied via RPC');
      }
    } catch (error) {
      console.error('SubscriptionService: Error clearing subscription status:', error);
    }
  }

  private async logSubscriptionEvent(subscriptionInfo: SubscriptionInfo): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const supa = supabase as any;
      const { error } = await supa
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

  /**
   * Check purchase history on app load (like video shows)
   * This validates existing purchases and updates subscription status
   */
  private async checkPurchaseHistoryOnLoad(): Promise<void> {
    if (!iapWrapper.isAvailable() || this.isWeb) {
      console.log('SubscriptionService: Skipping purchase history check (IAP not available or web)');
      return;
    }

    const maxAttempts = 3;
    let processed = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(
          `SubscriptionService: Checking purchase history (attempt ${attempt}/${maxAttempts})...`
        );
        const purchases = await iapWrapper.getAvailablePurchases();
        console.log('SubscriptionService: Found purchases:', purchases.length);

        if (purchases.length === 0) {
          if (attempt === maxAttempts) {
            console.log('SubscriptionService: No purchases found in history');
          }
          break;
        }

        // Find latest purchase matching our product SKUs
        const matchingPurchases = purchases.filter((p: any) =>
          this.productSkus.includes(p.productId)
        );

        if (matchingPurchases.length === 0) {
          if (attempt === maxAttempts) {
            console.log(
              'SubscriptionService: No matching purchases found for product SKUs:',
              this.productSkus
            );
          }
          break;
        }

        // Sort by transaction date (newest first)
        const latest = matchingPurchases.sort(
          (a: any, b: any) => (Number(b.transactionDate) || 0) - (Number(a.transactionDate) || 0)
        )[0];

        console.log('SubscriptionService: Latest purchase found:', {
          productId: latest.productId,
          transactionDate: latest.transactionDate,
          hasReceipt: !!latest.transactionReceipt,
        });

        if (!latest?.transactionReceipt) {
          console.warn('SubscriptionService: Latest purchase found but no receipt available');
          continue;
        }

        console.log('SubscriptionService: Validating receipt from purchase history...');
        const entitlement = await this.verifyReceipt(latest.transactionReceipt);
        console.log('SubscriptionService: Receipt validation result:', {
          isActive: entitlement?.isActive,
          productId: entitlement?.productId,
          expiresAt: entitlement?.expiresAt,
          status: entitlement?.status,
        });

        if (entitlement?.isActive) {
          console.log('SubscriptionService: Active subscription found in purchase history');
          await this.verifyAndApplyEntitlement(latest.transactionReceipt);
          processed = true;
          break;
        } else {
          console.log('SubscriptionService: Subscription found but not active (expired or invalid)');
          processed = true;
          break;
        }
      } catch (error) {
        console.error(
          `SubscriptionService: Error checking purchase history (attempt ${attempt}):`,
          error
        );
        if (attempt < maxAttempts) {
          console.log('SubscriptionService: Retrying purchase history check after delay...');
          await this.delay(1000 * attempt);
        }
      }
    }

    if (!processed) {
      console.log('SubscriptionService: Purchase history check completed with no actionable receipts');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    try {
      this.purchaseUpdateSub?.remove?.();
      this.purchaseErrorSub?.remove?.();
      this.purchaseUpdateSub = null;
      this.purchaseErrorSub = null;
      if (this.initialized && iapWrapper.isAvailable() && !this.isWeb) {
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
    
    console.log('SubscriptionService: verifyAndApplyEntitlement - entitlement info:', {
      isActive: info.isActive,
      tier: info.tier,
      status: info.status,
      productId: info.productIdentifier,
      expiresAt: info.expiresAt,
    });
    
    // Update DB using RPC function (SECURITY DEFINER bypasses RLS)
    if (this.currentUserId) {
      try {
        const supa = supabase as any;
        
        // Use the RPC function which is SECURITY DEFINER and handles both subscriptions table and user_profiles
        const { error: rpcError } = await supa.rpc('upsert_subscription_event', {
          p_status: info.status,
          p_tier: info.tier,
          p_product_id: info.productIdentifier || null,
          p_expires_at: info.expiresAt?.toISOString() || null,
          p_subscription_id: null, // Can be set if we have transaction ID
          p_platform: Platform.OS,
          p_environment: __DEV__ ? 'sandbox' : 'production',
        });
        
        if (rpcError) {
          console.error('SubscriptionService: RPC upsert_subscription_event failed:', {
            error: rpcError,
            message: rpcError.message,
            code: rpcError.code,
            details: rpcError.details,
            hint: rpcError.hint,
          });
          
          // Fallback to direct update if RPC fails (for backwards compatibility)
          console.log('SubscriptionService: Attempting fallback direct update...');
          const { error: updateError } = await supa
            .from('user_profiles')
            .update({
              subscription_tier: info.tier,
              subscription_status: info.status,
              subscription_expires_at: info.expiresAt?.toISOString() || null,
              product_id: info.productIdentifier || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', this.currentUserId);
          
          if (updateError) {
            console.error('SubscriptionService: Direct update also failed:', {
              error: updateError,
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
            });
            throw new Error(`Failed to update subscription status: ${updateError.message}`);
          } else {
            console.log('SubscriptionService: Fallback direct update succeeded');
          }
        } else {
          console.log('SubscriptionService: RPC upsert_subscription_event succeeded');
        }
        
        // Log subscription event separately (RPC already inserts into subscriptions table, but we can log additional details)
        if (info.isActive) {
          try {
            await this.logSubscriptionEvent(info);
          } catch (logError) {
            console.warn('SubscriptionService: Failed to log subscription event (non-critical):', logError);
            // Don't throw - logging is non-critical
          }
        }
      } catch (error) {
        console.error('SubscriptionService: Error in verifyAndApplyEntitlement:', error);
        throw error;
      }
    } else {
      console.warn('SubscriptionService: No currentUserId available, cannot update subscription status');
    }
    
    return info.isActive;
  }

  private async verifyReceipt(receipt: string): Promise<any> {
    try {
      console.log('SubscriptionService: Sending receipt to Edge Function for validation...');
      console.log('SubscriptionService: Receipt length:', receipt?.length || 0);
      
      const { data, error } = await (supabase as any).functions.invoke('verify_ios_receipt', {
        body: { receipt },
      });
      
      if (error) {
        console.error('SubscriptionService: Edge Function invocation error:', {
          message: error.message,
          status: error.status,
          error,
        });
        throw error;
      }
      
      // If the edge function returns an error payload, surface it to the caller
      if (data && typeof data === 'object' && (data as any).error) {
        console.error('SubscriptionService: Edge Function returned error:', (data as any).error);
        throw new Error((data as any).error);
      }
      
      console.log('SubscriptionService: Receipt validation successful:', {
        isActive: data?.isActive,
        productId: data?.productId,
        status: data?.status,
        environment: data?.environment,
      });
      
      return data;
    } catch (err) {
      console.error('SubscriptionService: Receipt verification error:', {
        error: err,
        message: (err as any)?.message,
        status: (err as any)?.status,
      });
      // Bubble errors so UI can display actionable messaging
      throw err;
    }
  }
}

export const subscriptionService = SubscriptionService.getInstance();
