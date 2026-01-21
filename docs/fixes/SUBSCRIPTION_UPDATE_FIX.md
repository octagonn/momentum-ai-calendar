# Subscription Status Update Fix

## Problem
After completing a subscription purchase, the subscription status was not being updated in Supabase, preventing the app from recognizing premium status.

## Root Cause
The code was attempting direct database updates to `user_profiles` table, which may have been blocked by Row Level Security (RLS) policies.

## Solution
Updated the subscription service to use the `upsert_subscription_event` RPC function, which is marked as `SECURITY DEFINER` and can bypass RLS policies.

## Changes Made

### 1. Updated `verifyAndApplyEntitlement` method
- Now uses `upsert_subscription_event` RPC function instead of direct update
- Added comprehensive error handling with fallback
- Added detailed logging for debugging

### 2. Updated `checkPurchaseHistoryOnLoad` method
- Uses RPC function for consistency
- Added error handling

### 3. Updated `syncSubscriptionStatus` method
- Uses RPC function instead of direct update
- Added error handling with fallback

## Verification Steps

### Step 1: Verify RPC Function Exists

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query**
5. Copy and paste the contents of `scripts/verify-subscription-rpc.sql`
6. Click **Run** (or press Ctrl+Enter)

**Expected Result**: You should see:
- `upsert_subscription_event` function listed with `SECURITY DEFINER`
- Subscription enums (`subscription_tier`, `subscription_status`) with their values
- All subscription columns in `user_profiles` table
- `subscriptions` table exists

### Step 2: Apply Migration (If Function Doesn't Exist)

If the verification shows the function doesn't exist:

1. In Supabase SQL Editor, create a new query
2. Copy the entire contents of `supabase/migrations/20251030093000_subscription_effective_and_upsert.sql`
3. Run the query

This will create:
- `get_effective_subscription` function
- `start_premium_trial` function
- `upsert_subscription_event` function (the one we need)

### Step 3: Test the Purchase Flow

1. Make a test purchase in your app
2. Check the console logs for:
   - `SubscriptionService: RPC upsert_subscription_event succeeded`
   - Or any error messages if it fails

3. Verify in Supabase:
   - Go to **Table Editor** → `user_profiles`
   - Find your user
   - Check that `subscription_tier` = `premium` and `subscription_status` = `active` or `trialing`

## Troubleshooting

### Error: "function upsert_subscription_event does not exist"
**Solution**: Apply the migration (Step 2 above)

### Error: "Not authenticated" when calling RPC
**Solution**: Ensure the user is logged in before making purchases

### RPC succeeds but status doesn't update
**Solution**: 
1. Check RLS policies on `user_profiles` table
2. Verify the user ID matches `auth.uid()` in the RPC function
3. Check console logs for detailed error messages

### Still seeing old behavior
**Solution**: 
1. Clear app cache and restart
2. Check that you're using the latest code with RPC calls
3. Verify the migration has been applied

## Code Location

The updated code is in:
- `services/subscriptionService.ts` - Lines 552-635 (`verifyAndApplyEntitlement`)
- `services/subscriptionService.ts` - Lines 354-414 (`syncSubscriptionStatus`)
- `services/subscriptionService.ts` - Lines 498-526 (`checkPurchaseHistoryOnLoad`)

## Related Files

- Migration: `supabase/migrations/20251030093000_subscription_effective_and_upsert.sql`
- Verification Script: `scripts/verify-subscription-rpc.sql`

