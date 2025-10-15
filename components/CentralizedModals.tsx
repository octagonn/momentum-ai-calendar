import React from 'react';
import { useSubscription } from '../providers/SubscriptionProvider';
import PremiumUpgradeModal from '../app/components/PremiumUpgradeModal';

/**
 * CentralizedModals - Renders all app-level modals to prevent modal stacking issues
 * This component should be rendered at the root level after all providers
 */
export default function CentralizedModals() {
  const { 
    upgradeModalVisible, 
    upgradeModalTrigger, 
    closeUpgradeModal, 
    handleUpgradeSuccess 
  } = useSubscription();

  return (
    <>
      {upgradeModalVisible && (
        <PremiumUpgradeModal
          visible={upgradeModalVisible}
          onClose={() => {
            console.log('CentralizedModals: PremiumUpgradeModal closing');
            closeUpgradeModal();
          }}
          onSuccess={async () => {
            console.log('CentralizedModals: PremiumUpgradeModal success');
            await handleUpgradeSuccess();
            closeUpgradeModal();
          }}
          trigger={upgradeModalTrigger}
        />
      )}
    </>
  );
}
