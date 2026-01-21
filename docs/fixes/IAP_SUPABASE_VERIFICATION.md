# IAP Supabase Verification Checklist (iap-61a0c6)

Use this checklist after landing the in-app purchase fixes to make sure the backend continues to honor the receipt-validation contract.

## 1. Validate database primitives

1. Open Supabase SQL Editor (or the MCP Supabase integration) and run `scripts/verify-subscription-rpc.sql`.
2. Confirm the `upsert_subscription_event` function exists in the `public` schema and is `SECURITY DEFINER`.
3. Ensure the `subscription_tier` and `subscription_status` enums include `premium`, `family`, `active`, `trialing`, etc.
4. Verify `user_profiles` still exposes the required columns (`subscription_tier`, `subscription_status`, `subscription_expires_at`, `product_id`, `subscription_id`).
5. Confirm the `subscriptions` table exists so entitlement history can be logged.

If any checks fail, re-run the matching migrations from `supabase/migrations/` (see `20251008000000_add_premium_subscriptions.sql` and `20251030093000_subscription_effective_and_upsert.sql`) and retry the query.

## 2. Automated sanity check

```bash
node scripts/verify-subscription-setup.js
```

The script uses the Supabase anon key from `.env` to hit the RPC and required tables directly. A `functions must be invoked by authenticated user` error still confirms the RPC exists—anything mentioning “does not exist” means the migration needs to be re-applied.

## 3. Edge function configuration

1. In Supabase Dashboard → Edge Functions, open `verify_ios_receipt`.
2. Ensure the function is deployed and the `APPLE_SHARED_SECRET` environment variable is populated for every environment (Preview and Production).
3. Re-run the function locally if secrets changed: `supabase functions serve verify_ios_receipt --env-file supabase/.env`.

## 4. Final data validation

1. Trigger a sandbox purchase and let `subscriptionService.verifyAndApplyEntitlement` write to Supabase.
2. In `user_profiles`, confirm `subscription_tier`, `subscription_status`, and `subscription_expires_at` reflect the sandbox state.
3. Check the `subscriptions` table for the matching row to make sure history persists.

Document any drift or failures in `docs/fixes/SUBSCRIPTION_UPDATE_FIX.md` before shipping the next TestFlight build.

