# Upgrade to Pro - Testing Guide

This guide explains how to test the "Upgrade to Pro" functionality in both development (Expo Go) and production environments.

## Overview

The upgrade system works differently in development vs production:

- **Development (Expo Go)**: Shows full upgrade UI with mock purchase flow for testing
- **Production (Development Build)**: Processes real App Store purchases

## Testing in Expo Go

### 1. Access the Upgrade Button
1. Open the app in Expo Go
2. Navigate to **Settings** tab
3. Look for the "Momentum Pro" card
4. Tap **"Upgrade to Pro - $4.99/month"**

### 2. Expected Behavior
- ✅ The upgrade modal should open (no longer disabled in development)
- ✅ Shows premium features list: Unlimited Goals, AI Goal Creation, Custom Colors, Advanced Analytics
- ✅ Shows mock subscription: "Momentum Premium - $4.99/month after 7-day free trial"
- ✅ "Start Premium Now" button is enabled

### 3. Testing Purchase Flow
1. Tap **"Start Premium Now"**
2. You'll see an alert: **"Expo Go Testing Mode"**
   - Explains this is a test purchase flow
   - Option to "Cancel" or "Simulate Purchase"
3. Tap **"Simulate Purchase"**
4. The app will:
   - Update your profile to premium in Supabase
   - Show success message
   - Close the modal
   - Refresh the settings page showing premium status

### 4. Testing Restore Flow
1. In the upgrade modal, tap **"Restore Purchases"**
2. You'll see another test dialog
3. Tap **"Simulate Restore"**
4. Same premium upgrade simulation occurs

### 5. Verifying Premium Status
After successful simulation:
- Settings page should show **"Premium Member"** card instead of upgrade card
- Premium features become available throughout the app
- Database shows `is_premium: true` for your user

## Testing in Production (Development Build)

### Prerequisites
1. App Store Connect setup with subscription product: `com.yourapp.premium.monthly`
2. Development Build (not Expo Go)
3. Test user configured in App Store Connect
4. Signed in with test Apple ID on device

### Expected Behavior
- Real App Store purchase flow
- 7-day free trial (configured in App Store Connect)
- Real subscription management
- Receipt validation through Supabase Edge Function

## Database Schema

The premium upgrade updates these fields in `user_profiles`:
```sql
- is_premium: boolean (computed via is_user_premium function)
- subscription_tier: 'free' | 'premium' | 'family'
- subscription_status: 'active' | 'expired' | 'cancelled' | 'trialing'
- trial_ends_at: timestamptz (7 days from upgrade)
- subscription_expires_at: timestamptz
```

## Debugging Tips

### Check Console Logs
Look for these log messages:
- `"SubscriptionProvider: showUpgradeModal called with trigger: general"`
- `"getSubscriptions: Providing mock subscriptions for Expo Go/Web testing"`
- `"Simulating successful purchase in Expo Go"`
- `"Successfully simulated premium upgrade for user: [uuid]"`

### Verify Database Changes
After simulation, check Supabase dashboard:
1. Go to Table Editor > user_profiles
2. Find your user row
3. Verify premium fields are updated

### Reset Premium Status
To test the flow again, manually update your user in Supabase:
```sql
UPDATE user_profiles 
SET is_premium = false, 
    subscription_tier = 'free',
    subscription_status = 'expired',
    trial_ends_at = NULL
WHERE id = 'your-user-id';
```

## Common Issues

### Modal Not Showing
- Ensure you're using the latest code (modal no longer disabled in dev)
- Check console for error messages

### Purchase Simulation Fails
- Check network connection
- Verify user is authenticated
- Check Supabase connection

### Premium Status Not Updating
- Check if `is_user_premium` function exists in Supabase
- Verify database permissions
- Check if migration ran successfully

## Production Deployment Checklist

- [ ] App Store Connect subscription configured
- [ ] Receipt verification Edge Function deployed
- [ ] RLS policies properly configured
- [ ] Test with App Store Connect sandbox
- [ ] Verify subscription cancellation flow
- [ ] Test subscription restoration

## Support

For issues with this upgrade system:
1. Check console logs first
2. Verify database schema matches migration
3. Test in both Expo Go and Development Build
4. Ensure all environment variables are set correctly
