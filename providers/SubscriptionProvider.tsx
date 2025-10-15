import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useUser } from './UserProvider';
import { subscriptionService, SubscriptionTier } from '../services/subscriptionService';
import { featureGate } from '../services/featureGate';
import { getItem, setItem } from '../lib/storage';

interface SubscriptionContextType {
  isLoading: boolean;
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
  const [showModal, setShowModal] = useState(false);
  const [modalTrigger, setModalTrigger] = useState<'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general'>('general');
  const [mockPremiumStatus, setMockPremiumStatus] = useState<boolean>(false); // For testing when DB migration is missing
  
  const isPremium = userProfile?.isPremium || mockPremiumStatus || false;
  const subscriptionTier = userProfile?.subscriptionTier || (mockPremiumStatus ? 'premium' : 'free');
  
  useEffect(() => {
    if (authUser) {
      initializeSubscription();
    } else {
      setIsLoading(false);
    }
  }, [authUser]);

  // Load persistent premium status on startup
  useEffect(() => {
    loadPersistentPremiumStatus();
  }, []);

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
      
      // Initialize subscription service
      await subscriptionService.initialize(authUser.id);
      
      // Initialize feature gate
      await featureGate.initialize(authUser.id);
      
      // Check and sync subscription status
      await checkSubscriptionStatus();
    } catch (error) {
      console.error('Error initializing subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkSubscriptionStatus = useCallback(async () => {
    if (!authUser) return;
    
    try {
      // Sync subscription status with RevenueCat
      await subscriptionService.syncSubscriptionStatus();
      
      // Refresh user profile to get updated subscription info
      await refreshUser();
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }, [authUser, refreshUser]);
  
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
    
    // If database doesn't have premium columns yet, use mock status for testing
    if (!userProfile?.isPremium) {
      console.log('SubscriptionProvider: Using mock premium status for testing');
      setMockPremiumStatus(true);
      
      // Save persistent premium status
      await savePersistentPremiumStatus(true);
      
      // Also update featureGate service to use mock premium status
      featureGate.setMockPremiumOverride(true);
    }
  };
  
  const value: SubscriptionContextType = {
    isLoading,
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
