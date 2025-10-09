import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { useUser } from './UserProvider';
import { subscriptionService, SubscriptionTier } from '../services/subscriptionService';
import { featureGate } from '../services/featureGate';
import PremiumUpgradeModal from '../app/components/PremiumUpgradeModal';

interface SubscriptionContextType {
  isLoading: boolean;
  isPremium: boolean;
  subscriptionTier: SubscriptionTier;
  showUpgradeModal: (trigger?: 'goal_limit' | 'ai_goal' | 'color_picker' | 'analytics' | 'general') => void;
  checkSubscriptionStatus: () => Promise<void>;
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
  
  const isPremium = userProfile?.isPremium || false;
  const subscriptionTier = userProfile?.subscriptionTier || 'free';
  
  useEffect(() => {
    if (authUser) {
      initializeSubscription();
    } else {
      setIsLoading(false);
    }
  }, [authUser]);

  // Cleanup modal state when user changes
  useEffect(() => {
    if (!authUser) {
      setShowModal(false);
    }
  }, [authUser]);
  
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
    
    // In Expo Go, just show an alert instead of the modal to prevent navigation issues
    if (__DEV__) {
      console.log('SubscriptionProvider: Skipping modal in development mode to prevent navigation issues');
      return;
    }
    
    setModalTrigger(trigger);
    setShowModal(true);
    
    // Auto-close modal after 30 seconds to prevent getting stuck
    setTimeout(() => {
      console.log('SubscriptionProvider: Auto-closing modal after timeout');
      setShowModal(false);
    }, 30000);
  }, []);
  
  const handleUpgradeSuccess = async () => {
    // Refresh subscription status after successful upgrade
    await checkSubscriptionStatus();
  };
  
  const value: SubscriptionContextType = {
    isLoading,
    isPremium,
    subscriptionTier,
    showUpgradeModal,
    checkSubscriptionStatus,
  };
  
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
      {showModal && (
        <PremiumUpgradeModal
          visible={showModal}
          onClose={() => {
            console.log('SubscriptionProvider: PremiumUpgradeModal onClose called');
            setShowModal(false);
          }}
          onSuccess={handleUpgradeSuccess}
          trigger={modalTrigger}
        />
      )}
    </SubscriptionContext.Provider>
  );
};
