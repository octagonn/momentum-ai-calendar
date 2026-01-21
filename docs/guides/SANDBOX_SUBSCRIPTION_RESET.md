# Resetting Sandbox Subscriptions (iOS)

Sandbox testers often get “already subscribed” once Apple’s sandbox server records a purchase. Use this checklist to reset the sandbox state so you can re-run the `Start Premium Now` flow.

---

## 1. Cancel/Expire on Device (fastest)

1. On the physical device running your TestFlight build:
   - Open the iOS **Settings** app (this is not inside TestFlight).
   - Tap your name at the top → scroll down to **App Store**.
   - Under **SANDBOX ACCOUNT**, tap your sandbox Apple ID → **Manage**.
2. Find **Momentum Premium** in the list.
3. Tap **Cancel Subscription** (or toggle **Auto Renew** off).  
   - Sandbox renewals cycle every 5 minutes; turning off auto renew forces expiration after the current cycle.
4. Wait ~5–10 minutes, then reopen the Momentum app and tap **Restore Purchases** (or use the new Sync button once implemented).

> Tip: If the subscription still shows “active,” sign out of the sandbox account in Settings → App Store → Sandbox Account → **Sign Out**, then sign back in.

---

## 2. Reset in App Store Connect

If the device flow doesn’t reset eligibility (e.g., you need another free trial), use App Store Connect:

1. Go to **App Store Connect** → **Users and Access** → **Sandbox Testers**.
2. Select the tester email you’re using on the device.
3. Use the actions in the right column:
   - **Reset Eligibility**: allows the tester to receive introductory offers/trials again.
   - **Clear Purchase History** (if visible): wipes past sandbox purchases.
   - **Delete Tester**: removes the tester entirely. Re-create the tester afterward and re-sign in on device.
4. After making changes, sign out/in on the device’s sandbox account to force Apple to pull the new state.

---

## 3. Force Supabase to Detect Apple Purchases

Once the Apple side is reset, make sure Supabase reflects the correct state:

1. Launch the app, log in, and open the **Premium** modal.
2. Tap **Restore Purchases** (or use the Sync button). This calls `subscriptionService.restorePurchases()` which:
   - Fetches receipts via `iapWrapper.getAvailablePurchases()`.
   - Verifies with the Supabase `verify_ios_receipt` edge function.
   - Updates `user_profiles` via the `upsert_subscription_event` RPC.
3. If Supabase still shows `free`, check console logs for receipt verification errors.
4. As a fallback, call the `verify-subscription-setup` script to ensure the RPC exists:

   ```bash
   npm run verify:subscription
   ```

---

## 4. Troubleshooting Checklist

| Symptom | Fix |
| --- | --- |
| TestFlight sheet says “You’re already subscribed” | Follow Section 1 or 2 to cancel/reset the sandbox subscription, then wait for the expiration window. |
| Restore Purchases says “No purchases found” | Make sure the tester email on device matches the one you reset; sign out of the sandbox account and back in. |
| Supabase still shows free after restore | Check console for `verify_ios_receipt` errors; ensure `APPLE_SHARED_SECRET` is set; run `npm run verify:subscription`. |
| Need to re-test free trial | Use **Reset Eligibility** on the tester in App Store Connect. |

---

## Quick Reference

- **Device path**: `Settings > App Store > Sandbox Account > Manage`
- **App Store Connect path**: `Users and Access > Sandbox Testers > <tester>`
- **Restore button**: Premium modal → **Restore Purchases**
- **Verification script**: `npm run verify:subscription`

Keep this guide handy whenever you need to reset the sandbox environment for iOS IAP testing.

