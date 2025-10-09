import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if we're in Expo Go or web
const isExpoGoOrWeb = Platform.OS === 'web' || (Constants?.appOwnership === 'expo');

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

// Conditional IAP module
let RNIap: any = null;

// Only load react-native-iap if not in Expo Go
if (!isExpoGoOrWeb) {
  try {
    RNIap = require('react-native-iap');
  } catch (error) {
    console.warn('react-native-iap not available:', error);
  }
}

// Create a wrapper that provides the same interface
export const iapWrapper = {
  // Connection methods
  async initConnection() {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP initConnection skipped in Expo Go/Web');
      return;
    }
    return RNIap.initConnection();
  },

  async endConnection() {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP endConnection skipped in Expo Go/Web');
      return;
    }
    return RNIap.endConnection();
  },

  async flushFailedPurchasesCachedAsPendingAndroid() {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP flushFailedPurchasesCachedAsPendingAndroid skipped in Expo Go/Web');
      return;
    }
    return RNIap.flushFailedPurchasesCachedAsPendingAndroid?.();
  },

  // Subscription methods
  async getSubscriptions(options: { skus: string[] }) {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP getSubscriptions skipped in Expo Go/Web');
      return [];
    }
    return RNIap.getSubscriptions(options);
  },

  async requestSubscription(options: { sku: string }) {
    if (isExpoGoOrWeb || !RNIap) {
      throw new Error('IAP not available in Expo Go/Web');
    }
    return RNIap.requestSubscription(options);
  },

  async getAvailablePurchases() {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP getAvailablePurchases skipped in Expo Go/Web');
      return [];
    }
    return RNIap.getAvailablePurchases();
  },

  async finishTransaction(options: { purchase: any; isConsumable: boolean }) {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP finishTransaction skipped in Expo Go/Web');
      return;
    }
    return RNIap.finishTransaction(options);
  },

  // Listener methods
  purchaseUpdatedListener(callback: MockPurchaseUpdatedListener) {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP purchaseUpdatedListener skipped in Expo Go/Web');
      return { remove: () => {} };
    }
    return RNIap.purchaseUpdatedListener(callback);
  },

  purchaseErrorListener(callback: MockPurchaseErrorListener) {
    if (isExpoGoOrWeb || !RNIap) {
      console.log('IAP purchaseErrorListener skipped in Expo Go/Web');
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
