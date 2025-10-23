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

export const iapEnvironment = {
  platform: Platform.OS,
  appOwnership: (Constants as any)?.appOwnership,
  isWeb,
  isIapAvailable: !!RNIap,
};

// Create a wrapper that provides the same interface
export const iapWrapper = {
  // Connection methods
  async initConnection() {
    if (!RNIap || isWeb) {
      console.log('IAP initConnection skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.initConnection();
  },

  async endConnection() {
    if (!RNIap || isWeb) {
      console.log('IAP endConnection skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.endConnection();
  },

  async flushFailedPurchasesCachedAsPendingAndroid() {
    if (!RNIap || isWeb) {
      console.log('IAP flushFailedPurchasesCachedAsPendingAndroid skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
  },

  // Subscription methods
  async getSubscriptions(options: { skus: string[] }) {
    if (!RNIap || isWeb) {
      console.log('IAP getSubscriptions skipped (IAP unavailable or web)');
      return [];
    }
    return RNIap.getSubscriptions(options);
  },

  async requestSubscription(options: { sku: string }) {
    console.log('IAP requestSubscription with', options, 'env:', iapEnvironment);
    if (!RNIap || isWeb) {
      throw new Error('IAP_NOT_AVAILABLE');
    }
    return RNIap.requestSubscription(options);
  },

  async getAvailablePurchases() {
    if (!RNIap || isWeb) {
      console.log('IAP getAvailablePurchases skipped (IAP unavailable or web)');
      return [];
    }
    return RNIap.getAvailablePurchases();
  },

  async finishTransaction(options: { purchase: any; isConsumable: boolean }) {
    if (!RNIap || isWeb) {
      console.log('IAP finishTransaction skipped (IAP unavailable or web)');
      return;
    }
    return RNIap.finishTransaction(options);
  },

  // Listener methods
  purchaseUpdatedListener(callback: MockPurchaseUpdatedListener) {
    if (!RNIap || isWeb) {
      console.log('IAP purchaseUpdatedListener skipped (IAP unavailable or web)');
      return { remove: () => {} };
    }
    return RNIap.purchaseUpdatedListener(callback);
  },

  purchaseErrorListener(callback: MockPurchaseErrorListener) {
    if (!RNIap || isWeb) {
      console.log('IAP purchaseErrorListener skipped (IAP unavailable or web)');
      return { remove: () => {} };
    }
    return RNIap.purchaseErrorListener(callback);
  },
};

// Export types
export type Subscription = MockSubscription;
export type Purchase = MockPurchase;
export type PurchaseUpdatedListener = MockPurchaseUpdatedListener;
export type PurchaseErrorListener = MockPurchaseErrorListener;
export const isIapAvailable: boolean = !!RNIap;
