import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthProvider';
import { useUser } from './UserProvider';
import { subscriptionService, SubscriptionTier } from '../services/subscriptionService';
import { featureGate } from '../services/featureGate';
import { getItem, setItem } from '../lib/storage';

interface SubscriptionContextType {
  isLoading: boolean;
  isCheckingPurchases: boolean;
  isPremium: boolean;
  subscriptionTier: SubscriptionTier;
  showUpgradeModal: (trigger?: 'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general') => void;
  checkSubscriptionStatus: () => Promise<void>;
  // Modal state for centralized management
  upgradeModalVisible: boolean;
  upgradeModalTrigger: 'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general';
  closeUpgradeModal: () => void;
  handleUpgradeSuccess: () => Promise<void>;
  // Testing utilities
  resetPremiumStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user: authUser } = useAuth();
  const { user: userProfile, refreshUser } = useUser();
  
  const [isLoading, setIsLoading] = useState(true);
  const [autoRestoreAttempted, setAutoRestoreAttempted] = useState(false);
  const [isCheckingPurchases, setIsCheckingPurchases] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTrigger, setModalTrigger] = useState<'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general'>('general');
  const [mockPremiumStatus, setMockPremiumStatus] = useState<boolean>(false); // For testing when DB migration is missing
  
  // Compute premium with admin override: if admin_premium_until is in future or infinity and tier is premium/family
  const adminOverrideActive = (() => {
    const until = (userProfile as any)?.admin_premium_until as string | undefined;
    const tier = (userProfile as any)?.admin_premium_tier as 'free' | 'premium' | 'family' | undefined;
    if (!until || !tier) return false;
    if (!(tier === 'premium' || tier === 'family')) return false;
    if (until.toLowerCase() === 'infinity') return true;
    const ts = Date.parse(until);
    return !isNaN(ts) && ts > Date.now();
  })();

  // Use paid plan if tier is premium/family AND status is active or trialing
  const hasActivePaidPlan = (
    (userProfile?.subscriptionTier === 'premium' || userProfile?.subscriptionTier === 'family') &&
    (userProfile?.subscriptionStatus === 'active' || userProfile?.subscriptionStatus === 'trialing')
  );

  // Source of truth: database values from userProfile. Admin override augments DB.
  // In Expo Go/testing, allow mockPremiumStatus to reflect simulated purchases in UI.
  const isPremium = adminOverrideActive || hasActivePaidPlan || mockPremiumStatus || false;
  const subscriptionTier = adminOverrideActive
    ? (((userProfile as any)?.admin_premium_tier as SubscriptionTier) || 'premium')
    : (mockPremiumStatus ? 'premium' : (userProfile?.subscriptionTier || 'free'));

  // Note: We no longer auto-clear mock premium when DB shows free. This ensures
  // simulated purchases and manual testing can enable Premium reliably in Expo Go.
  // Use resetPremiumStatus() to clear the mock flag when needed.
  
  // Define before any effects that reference it to avoid TDZ on web
  const checkSubscriptionStatus = useCallback(async () => {
    if (!authUser) return;
    
    try {
      setIsCheckingPurchases(true);
      console.log('SubscriptionProvider: Checking subscription status...');
      
      // Sync subscription status with RevenueCat
      await subscriptionService.syncSubscriptionStatus();
      
      // Refresh user profile to get updated subscription info
      await refreshUser();
      
      console.log('SubscriptionProvider: Subscription status check complete');
    } catch (error) {
      console.error('SubscriptionProvider: Error checking subscription status:', error);
    } finally {
      setIsCheckingPurchases(false);
    }
  }, [authUser, refreshUser]);
  
  useEffect(() => {
    if (authUser) {
      setAutoRestoreAttempted(false);
      initializeSubscription();
    } else {
      setAutoRestoreAttempted(false);
      setIsLoading(false);
    }
  }, [authUser]);

  // Show upgrade modal once after first login (only for non-premium users)
  useEffect(() => {
    const maybeShowFirstLoginPrompt = async () => {
      if (!authUser) return;
      if (isPremium) return;
      try {
        const key = `upgrade_prompt_shown:${authUser.id}`;
        const shown = await getItem(key);
        if (shown !== 'true') {
          showUpgradeModal('general');
          await setItem(key, 'true');
        }
      } catch (e) {
        // ignore
      }
    };
    maybeShowFirstLoginPrompt();
  }, [authUser, isPremium, showUpgradeModal]);

  // Re-verify receipt on foreground to reflect App Store changes (renewal/expiry)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && authUser) {
        checkSubscriptionStatus();
      }
    });
    return () => sub.remove();
  }, [authUser, checkSubscriptionStatus]);

  // Automatically attempt to restore purchases if Supabase shows free but Apple might have an active subscription
  useEffect(() => {
    if (!authUser) return;
    if (autoRestoreAttempted) return;
    if (isPremium) return;
    if (mockPremiumStatus) return;
    if (Platform.OS !== 'ios') return;
    if (!subscriptionService.canUseNativeIap()) return;

    let cancelled = false;

    const attemptAutoRestore = async () => {
      try {
        console.log('SubscriptionProvider: Attempting automatic restore due to mismatch...');
        setIsCheckingPurchases(true);
        await subscriptionService.resyncPurchaseHistory();
        await refreshUser();
      } catch (error) {
        console.error('SubscriptionProvider: Automatic restore failed:', error);
      } finally {
        if (!cancelled) {
          setIsCheckingPurchases(false);
          setAutoRestoreAttempted(true);
        }
      }
    };

    attemptAutoRestore();

    return () => {
      cancelled = true;
    };
  }, [
    authUser,
    autoRestoreAttempted,
    isPremium,
    mockPremiumStatus,
    refreshUser,
  ]);

  // In dev, we previously supported a mock premium. We no longer auto-load
  // mock state so DB remains the single source of truth. Uncomment for testing only.
  // useEffect(() => { loadPersistentPremiumStatus(); }, []);

  // Cleanup modal state when user changes
  useEffect(() => {
    if (!authUser) {
      setShowModal(false);
    }
  }, [authUser]);
  
  const loadPersistentPremiumStatus = async () => {
    try {
      const stored = await getItem('mock_premium_status');
      if (stored === 'true') {
        console.log('SubscriptionProvider: Loading persistent premium status');
        setMockPremiumStatus(true);
        featureGate.setMockPremiumOverride(true);
      }
    } catch (error) {
      console.error('Error loading persistent premium status:', error);
    }
  };

  const savePersistentPremiumStatus = async (isPremium: boolean) => {
    try {
      await setItem('mock_premium_status', isPremium.toString());
      console.log('SubscriptionProvider: Saved persistent premium status:', isPremium);
    } catch (error) {
      console.error('Error saving persistent premium status:', error);
    }
  };

  const initializeSubscription = async () => {
    if (!authUser) return;
    
    try {
      setIsLoading(true);
      setIsCheckingPurchases(true);
      console.log('SubscriptionProvider: Initializing subscription service...');
      
      // Initialize subscription service (this will check purchase history internally)
      await subscriptionService.initialize(authUser.id);
      
      // Initialize feature gate
      await featureGate.initialize(authUser.id);
      
      // Check and sync subscription status
      await checkSubscriptionStatus();
      
      console.log('SubscriptionProvider: Subscription initialization complete');
    } catch (error) {
      console.error('SubscriptionProvider: Error initializing subscription:', error);
    } finally {
      setIsLoading(false);
      setIsCheckingPurchases(false);
    }
  };
  
  const showUpgradeModal = useCallback((
    trigger: 'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general' = 'general'
  ) => {
    console.log('SubscriptionProvider: showUpgradeModal called with trigger:', trigger);
    
    // Prevent multiple modals from opening
    if (showModal) {
      console.log('SubscriptionProvider: Modal already open, updating trigger only');
      setModalTrigger(trigger);
      return;
    }
    
    setModalTrigger(trigger);
    setShowModal(true);
  }, [showModal]);
  
  const closeUpgradeModal = useCallback(() => {
    console.log('SubscriptionProvider: closeUpgradeModal called');
    setShowModal(false);
  }, []);

  const resetPremiumStatus = useCallback(async () => {
    console.log('SubscriptionProvider: Resetting premium status for testing');
    setMockPremiumStatus(false);
    featureGate.setMockPremiumOverride(false);
    await savePersistentPremiumStatus(false);
  }, []);
  
  const handleUpgradeSuccess = async () => {
    // First try to refresh subscription status from database
    await checkSubscriptionStatus();

    const nativeIapAvailable = subscriptionService.canUseNativeIap();
    const appOwnership = (Constants as any)?.appOwnership;
    const allowMockPremium =
      !nativeIapAvailable && (appOwnership === 'expo' || Platform.OS === 'web');

    if (nativeIapAvailable) {
      console.log('SubscriptionProvider: Native IAP available; ensuring mock premium is disabled after upgrade.');
      await resetPremiumStatus();
      return;
    }

    if (!allowMockPremium) {
      console.log('SubscriptionProvider: Native IAP unavailable but mock premium is disabled for this build.');
      return;
    }

    console.log('SubscriptionProvider: Using mock premium status (Expo Go / dev only)');
    setMockPremiumStatus(true);
    await savePersistentPremiumStatus(true);
    featureGate.setMockPremiumOverride(true);
  };
  
  const value: SubscriptionContextType = {
    isLoading,
    isCheckingPurchases,
    isPremium,
    subscriptionTier,
    showUpgradeModal,
    checkSubscriptionStatus,
    // Modal state for centralized management
    upgradeModalVisible: showModal,
    upgradeModalTrigger: modalTrigger,
    closeUpgradeModal,
    handleUpgradeSuccess,
    // Testing utilities
    resetPremiumStatus,
  };
  
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      {/* PremiumUpgradeModal moved to app layout to prevent modal stacking issues */}
    </SubscriptionContext.Provider>
  );
};
