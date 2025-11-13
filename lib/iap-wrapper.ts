import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Mock types for when IAP is not available
export interface MockSubscription {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
}

export interface MockPurchase {
  productId: string;
  transactionReceipt?: string;
  transactionDate: string;
}

export type MockPurchaseUpdatedListener = (purchase: MockPurchase) => void;
export type MockPurchaseErrorListener = (error: any) => void;

// Decide availability based on actual native module presence, not appOwnership
const isWeb = Platform.OS === 'web';
let RNIap: any = null;
try {
  if (!isWeb) {
    // Will fail inside Expo Go (no native module), succeed on TestFlight/App Store
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNIap = require('react-native-iap');
  }
} catch (error) {
  console.warn('react-native-iap not available (likely Expo Go / missing native module):', error);
}

// Normalize default vs named export shapes
RNIap = (RNIap && RNIap.default) ? RNIap.default : RNIap;

// Capability check for native availability
function hasIap(): boolean {
  return !!RNIap
    && typeof RNIap.initConnection === 'function'
    && typeof RNIap.getSubscriptions === 'function'
    && typeof RNIap.requestSubscription === 'function'
    && typeof RNIap.getAvailablePurchases === 'function'
    && typeof RNIap.finishTransaction === 'function'
    && typeof RNIap.purchaseUpdatedListener === 'function'
    && typeof RNIap.purchaseErrorListener === 'function';
}

export const iapEnvironment = {
  platform: Platform.OS,
  appOwnership: (Constants as any)?.appOwnership,
  isWeb,
  isIapAvailable: hasIap(),
};

// Create a wrapper that provides the same interface
export const iapWrapper = {
  // Connection methods
  async initConnection() {
    if (!hasIap() || isWeb) {
      console.log('IAP initConnection skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.initConnection();
  },

  async endConnection() {
    if (!hasIap() || isWeb) {
      console.log('IAP endConnection skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.endConnection();
  },

  async flushFailedPurchasesCachedAsPendingAndroid() {
    if (!hasIap() || isWeb) {
      console.log('IAP flushFailedPurchasesCachedAsPendingAndroid skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
  },

  // Subscription methods
  async getSubscriptions(options: { skus: string[] }) {
    if (!hasIap() || isWeb) {
      console.log('IAP getSubscriptions skipped (IAP unavailable or web)');
      return [];
    }
    return RNIap.getSubscriptions(options);
  },

  async requestSubscription(options: { sku: string }) {
    console.log('IAP requestSubscription with', options, 'env:', iapEnvironment);
    if (!hasIap() || isWeb) {
      throw new Error('IAP_NOT_AVAILABLE');
    }
    try {
      return RNIap.requestSubscription(options);
    } catch (error) {
      console.error('IAP requestSubscription error:', error);
      throw error;
    }
  },

  async getAvailablePurchases() {
    if (!hasIap() || isWeb) {
      console.log('IAP getAvailablePurchases skipped (IAP unavailable or web)');
      return [];
    }
    return RNIap.getAvailablePurchases();
  },

  async finishTransaction(options: { purchase: any; isConsumable: boolean }) {
    if (!hasIap() || isWeb) {
      console.log('IAP finishTransaction skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.finishTransaction(options);
  },

  // Listener methods
  purchaseUpdatedListener(callback: MockPurchaseUpdatedListener) {
    if (!hasIap() || isWeb) {
      console.log('IAP purchaseUpdatedListener skipped (IAP unavailable or web)');
      return { remove: () => {} };
    }
    try {
      return RNIap.purchaseUpdatedListener(callback);
    } catch (error) {
      console.error('IAP purchaseUpdatedListener error:', error);
      return { remove: () => {} };
    }
  },

  purchaseErrorListener(callback: MockPurchaseErrorListener) {
    if (!hasIap() || isWeb) {
      console.log('IAP purchaseErrorListener skipped (IAP unavailable or web)');
      return { remove: () => {} };
    }
    try {
      return RNIap.purchaseErrorListener(callback);
    } catch (error) {
      console.error('IAP purchaseErrorListener error:', error);
      return { remove: () => {} };
    }
  },
};

// Export types
export type Subscription = MockSubscription;
export type Purchase = MockPurchase;
export type PurchaseUpdatedListener = MockPurchaseUpdatedListener;
export type PurchaseErrorListener = MockPurchaseErrorListener;
export const isIapAvailable: boolean = hasIap();
