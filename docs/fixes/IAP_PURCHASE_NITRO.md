# IAP Purchase Nitro Fallback Strategy

## Problem

When using `react-native-iap` v14.x with Expo SDK 54 and Nitro modules, the App Store purchase sheet may fail to appear, causing a 60-second timeout. The diagnostics show:
- `isAvailableNow: true`
- `reqPurchase=true`, `fetchProducts=true`
- `reqSub=false` (Nitro API doesn't expose `requestSubscription`)

The Nitro-style payload `requestPurchase({ type: 'subs', request: { ios: { sku, andDangerouslyFinishTransactionAutomatically: true } } })` may silently fail without triggering purchase listeners.

## Solution

We updated `lib/iap-wrapper.ts` to try multiple request variants in sequence until one succeeds:

1. **Preferred legacy API**: `RNIap.requestSubscription({ sku })` — if the function exists
2. **Nitro payload**: `RNIap.requestPurchase({ type: 'subs', request: { ios: { sku, andDangerouslyFinishTransactionAutomatically: true } } })`
3. **Legacy subscription fallback**: `RNIap.requestSubscription({ sku })` (again, in case Nitro is partial)
4. **Simple object**: `RNIap.requestPurchase({ sku })`
5. **Simple string**: `RNIap.requestPurchase(sku)`

Each attempt is recorded in `iapDebugStore.lastRequestVariant` so the IAP Diagnostics overlay (tap the premium icon) shows which variant was used.

## Diagnostics Enhancements

The premium modal diagnostics now also show:
- **Listener availability**: `purchaseUpdatedListener` and `purchaseErrorListener` function presence
- **Timing info**: `lastRequestAtMs` and `lastListenerEventAtMs` timestamps

If `listenerAt=never` after a purchase attempt, listeners are not firing—likely a Nitro/native module mismatch.

## Timeout Error Message

The timeout error now includes diagnostic info:
```
Timed out waiting for a response from Apple. [variant=nitro-request-object, reqAt=..., listenerAt=never]
```

This helps identify whether the request was sent but listeners never fired.

## Testing

1. Bump `buildNumber` in `app.json` and create a new EAS build
2. Install via TestFlight with a sandbox tester
3. Open Settings → "Upgrade to Premium" → tap the premium icon to see diagnostics
4. Tap "Start Premium Now" and confirm the App Store sheet appears
5. After purchase (or cancel), check diagnostics again to see `executed (last)` variant and `listenerAt` timestamp

## Files Changed

- `lib/iap-wrapper.ts` — added iOS fallback variants and logging
- `services/subscriptionService.ts` — enhanced timeout error message with diagnostics
- `app/components/PremiumUpgradeModal.tsx` — extended diagnostics overlay
- `app.json` — bumped `buildNumber`

