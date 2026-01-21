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

// In-memory debug log buffer (fallback when external ingest unavailable)
const iapLocalLog: Array<{ t: number; loc: string; msg: string; data?: Record<string, any> }> = [];
function pushIapLocalLog(entry: { loc: string; msg: string; data?: Record<string, any> }) {
  try {
    iapLocalLog.push({ t: Date.now(), ...entry });
    // keep last 20
    if (iapLocalLog.length > 30) iapLocalLog.shift();
  } catch {
    // ignore
  }
}
export function getIapLocalLog(): Array<{ t: number; loc: string; msg: string; data?: Record<string, any> }> {
  return [...iapLocalLog];
}

// Minimal in-memory debug store for runtime diagnostics
export const iapDebugStore: {
  lastRequestVariant: 'nitro-request-object' | 'string' | 'sku-object' | 'requestSubscription' | 'legacy-subs' | 'none';
  lastRequestError: string;
  lastSku: string;
  lastRequestAtMs: number;
  lastListenerEventAtMs: number;
} = {
  lastRequestVariant: 'none',
  lastRequestError: '',
  lastSku: '',
  lastRequestAtMs: 0,
  lastListenerEventAtMs: 0,
};

const shouldLogIap = (() => {
  try {
    if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
    const extra =
      (Constants as any)?.expoConfig?.extra ??
      (Constants as any)?.manifestExtra ??
      {};
    if (extra?.iapDebug === true) return true;
    const envFlag =
      typeof globalThis !== 'undefined'
        ? (globalThis as any)?.process?.env?.EXPO_PUBLIC_IAP_DEBUG
        : undefined;
    if (envFlag === '1' || envFlag === 'true') return true;
  } catch {
    // ignore
  }
  return false;
})();

const logIap = (...args: any[]) => {
  if (!shouldLogIap) return;
  try {
    console.log('[iap-wrapper]', ...args);
  } catch {
    // swallow logging issues
  }
};

// Capability check for native availability (robust across export shapes / Nitro)
function hasIap(): boolean {
  try {
    // Basic JS API presence
    const hasRequest =
      (RNIap && typeof RNIap.requestSubscription === 'function') ||
      (RNIap && typeof RNIap.requestPurchase === 'function');
    if (hasRequest) return true;

    // Native module presence heuristic
    const { NativeModules } = require('react-native');
    const nativeKeys = Object.keys(NativeModules || {});
    const hasNative = nativeKeys.some((k) =>
      /IAP|Iap|RNIap|OpenIAP|NitroIap/.test(k)
    );
    return hasNative;
  } catch {
    return false;
  }
}

const hasNitroProductApi = () => {
  try {
    return Boolean(RNIap && typeof RNIap.fetchProducts === 'function');
  } catch {
    return false;
  }
};

function normalizeSubscriptionProduct(product: any, fallbackSku?: string): MockSubscription {
  if (!product) {
    return {
      productId: fallbackSku || '',
      title: '',
      description: '',
      price: '',
      localizedPrice: '',
      currency: '',
    };
  }

  const productId =
    product.productId ??
    product.productIdentifier ??
    product.sku ??
    product.id ??
    fallbackSku ??
    '';

  const title =
    product.title ??
    product.displayName ??
    product.displayNameIOS ??
    product.name ??
    '';

  const description =
    product.description ??
    product.localizedDescription ??
    '';

  const displayPrice =
    product.displayPrice ??
    product.localizedPrice ??
    product.priceString;
  const numericPrice =
    typeof product.price === 'number'
      ? product.price.toFixed(2)
      : product.price;

  const currency =
    product.currency ??
    product.currencyCode ??
    product.priceCurrencyCode ??
    '';

  return {
    productId,
    title,
    description,
    price: (numericPrice ?? displayPrice ?? '') || '',
    localizedPrice: (displayPrice ?? numericPrice ?? '') || '',
    currency: currency || '',
  };
}

export const iapEnvironment = {
  platform: Platform.OS,
  appOwnership: (Constants as any)?.appOwnership,
  isWeb,
  isIapAvailable: hasIap(),
};

// Create a wrapper that provides the same interface
export const iapWrapper = {
  // Expose availability as a function to avoid stale snapshots
  isAvailable() {
    return !isWeb && hasIap();
  },
  // Connection methods
  async initConnection() {
    if (isWeb) {
      console.log('IAP initConnection skipped (web)');
      return;
    }
    if (RNIap && typeof RNIap.initConnection === 'function') {
      return RNIap.initConnection();
    }
    console.log('IAP initConnection not available on RNIap');
    return;
  },

  async endConnection() {
    if (isWeb) {
      console.log('IAP endConnection skipped (web)');
      return;
    }
    if (RNIap && typeof RNIap.endConnection === 'function') {
      return RNIap.endConnection();
    }
    return;
  },

  async flushFailedPurchasesCachedAsPendingAndroid() {
    if (isWeb) {
      return;
    }
    return RNIap?.flushFailedPurchasesCachedAsPendingAndroid?.();
  },

  // Subscription methods
  async getSubscriptions(options: { skus: string[] }) {
    try {
      if (isWeb) {
        return [];
      }
      if (!RNIap) {
        return [];
      }

      const skus = Array.isArray(options?.skus) ? options.skus : [];
      if (!skus.length) {
        return [];
      }
      const fallbackSku = skus[0];
      logIap('getSubscriptions start', { skusCount: skus.length });

      if (hasNitroProductApi()) {
        try {
          const products = await RNIap.fetchProducts({ skus, type: 'subs' });
          if (Array.isArray(products)) {
            logIap('getSubscriptions fetched via fetchProducts', { count: products.length });
            return products.map((item: any) =>
              normalizeSubscriptionProduct(item, fallbackSku)
            );
          }
        } catch (nitroError) {
          console.error('IAP fetchProducts error:', nitroError);
        }
      }

      if (typeof RNIap.getSubscriptions === 'function') {
        const legacy = await RNIap.getSubscriptions({ skus });
        if (Array.isArray(legacy)) {
          logIap('getSubscriptions fetched via getSubscriptions', { count: legacy.length });
          return legacy.map((item: any) =>
            normalizeSubscriptionProduct(item, fallbackSku)
          );
        }
        return [];
      }

      // In some Nitro setups the API may be available post-init only; return empty to avoid crashing
      return [];
    } catch (e) {
      console.error('IAP getSubscriptions error:', e);
      return [];
    }
  },

  async requestSubscription(options: { sku: string }) {
    const sku = (options as any)?.sku;
    logIap('requestSubscription start', { sku, env: iapEnvironment });

    try {
      iapDebugStore.lastSku = sku || '';
      iapDebugStore.lastRequestVariant = 'none';
      iapDebugStore.lastRequestError = '';
      iapDebugStore.lastRequestAtMs = Date.now();

      pushIapLocalLog({
        loc: 'iap-wrapper:requestSubscription',
        msg: 'entry',
        data: {
          sku,
          platform: Platform.OS,
          hasReqSub: typeof (RNIap as any)?.requestSubscription === 'function',
          hasReqPurchase: typeof (RNIap as any)?.requestPurchase === 'function',
          hasFetchProducts: typeof (RNIap as any)?.fetchProducts === 'function',
          nativeAvailable: hasIap()
        }
      });

      if (isWeb) {
        throw new Error('IAP_NOT_AVAILABLE');
      }
      if (typeof sku !== 'string' || !sku.trim()) {
        throw new Error('IAP_MISSING_PRODUCT_ID');
      }
      if (!RNIap) {
        logIap('requestSubscription aborted: RNIap native module missing');
        throw new Error('IAP_NATIVE_MODULE_UNAVAILABLE');
      }
      if (!iapWrapper.isAvailable()) {
        logIap('requestSubscription aborted: IAP not available');
        throw new Error('IAP_NOT_AVAILABLE');
      }

      // Use the correct API format for react-native-iap v14 with Nitro modules.
      // For subscriptions, the format is: { type: 'subs', request: { ios: { sku } } }
      // The listeners (purchaseUpdatedListener/purchaseErrorListener) handle the response.

      if (typeof RNIap.requestPurchase === 'function') {
        iapDebugStore.lastRequestVariant = 'sku-object';
        logIap('requestSubscription: calling requestPurchase with Nitro format', { sku });
        pushIapLocalLog({
          loc: 'iap-wrapper:requestSubscription',
          msg: 'calling requestPurchase (Nitro format)',
          data: { sku, variant: 'sku-object' }
        });

        // Correct format for react-native-iap v14 Nitro modules on iOS
        // This is the format documented at react-native-iap.hyo.dev
        await (RNIap.requestPurchase as any)({
          request: {
            ios: {
              sku,
            },
          },
        });

        pushIapLocalLog({
          loc: 'iap-wrapper:requestSubscription',
          msg: 'requestPurchase returned (StoreKit sheet should be showing)',
          data: { sku }
        });

        return;
      }

      // Fallback: try legacy requestSubscription if requestPurchase doesn't exist
      if (typeof RNIap.requestSubscription === 'function') {
        iapDebugStore.lastRequestVariant = 'requestSubscription';
        logIap('requestSubscription: calling legacy requestSubscription', { sku });
        pushIapLocalLog({
          loc: 'iap-wrapper:requestSubscription',
          msg: 'calling legacy requestSubscription',
          data: { sku, variant: 'requestSubscription' }
        });

        await (RNIap.requestSubscription as any)({ sku });

        pushIapLocalLog({
          loc: 'iap-wrapper:requestSubscription',
          msg: 'requestSubscription returned',
          data: { sku }
        });

        return;
      }

      throw new Error('IAP_NO_PURCHASE_API_AVAILABLE');
    } catch (error) {
      iapDebugStore.lastRequestError = (error as any)?.message || String(error);
      console.error('IAP requestSubscription error:', error);
      pushIapLocalLog({
        loc: 'iap-wrapper:requestSubscription',
        msg: 'error',
        data: { sku, error: (error as any)?.message || String(error) }
      });
      throw error;
    }
  },

  async getAvailablePurchases() {
    if (isWeb) {
      return [];
    }
    if (RNIap && typeof RNIap.getAvailablePurchases === 'function') {
      return RNIap.getAvailablePurchases();
    }
    return [];
  },

  async finishTransaction(options: { purchase: any; isConsumable: boolean }) {
    if (isWeb) {
      return;
    }
    if (RNIap && typeof RNIap.finishTransaction === 'function') {
      return RNIap.finishTransaction(options);
    }
    return;
  },

  // Listener methods
  purchaseUpdatedListener(callback: MockPurchaseUpdatedListener) {
    if (isWeb) return { remove: () => {} };
    try {
      if (RNIap && typeof RNIap.purchaseUpdatedListener === 'function') {
        return RNIap.purchaseUpdatedListener((purchase: MockPurchase) => {
          logIap('purchaseUpdatedListener fired', {
            productId: purchase?.productId,
            hasReceipt: !!purchase?.transactionReceipt,
          });
          iapDebugStore.lastListenerEventAtMs = Date.now();
          callback(purchase);
        });
      }
    } catch (error) {
      console.error('IAP purchaseUpdatedListener error:', error);
    }
    return { remove: () => {} };
  },

  purchaseErrorListener(callback: MockPurchaseErrorListener) {
    if (isWeb) return { remove: () => {} };
    try {
      if (RNIap && typeof RNIap.purchaseErrorListener === 'function') {
          return RNIap.purchaseErrorListener((error: any) => {
            logIap('purchaseErrorListener fired', {
              code: error?.code,
              message: error?.message,
            });
            iapDebugStore.lastListenerEventAtMs = Date.now();
            callback(error);
          });
      }
    } catch (error) {
      console.error('IAP purchaseErrorListener error:', error);
    }
    return { remove: () => {} };
  },
};

// Export types
export type Subscription = MockSubscription;
export type Purchase = MockPurchase;
export type PurchaseUpdatedListener = MockPurchaseUpdatedListener;
export type PurchaseErrorListener = MockPurchaseErrorListener;
export const isIapAvailable: boolean = hasIap();
