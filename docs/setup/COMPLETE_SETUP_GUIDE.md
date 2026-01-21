# Complete Setup Guide

This guide covers all setup and configuration steps for the Momentum app, including Supabase, Authentication, AI services, iOS purchases, notifications, and deep links.

## Table of Contents

1. [Supabase Setup](#supabase-setup)
2. [Authentication Setup](#authentication-setup)
3. [Gemini AI Setup](#gemini-ai-setup)
4. [iOS In-App Purchase Setup](#ios-in-app-purchase-setup)
5. [Push Notifications Setup](#push-notifications-setup)
6. [Deep Link Configuration](#deep-link-configuration)
7. [Supabase Management](#supabase-management)

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Choose a name and database password
5. Wait for the project to be created

### 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key
3. Create a `.env` file in the root directory with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Set Up the Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Run the SQL to create the tables and sample data

### 4. Test the Connection

Run the app with `npm run dev` and check if the goals load from Supabase.

### 5. Enable Row Level Security (Optional)

For production, you may want to set up proper RLS policies for user-specific data. The current setup allows public access for development.

---

## Authentication Setup

### Overview

The Momentum app includes a comprehensive email authentication system using Supabase Auth with email verification. Users must create an account and verify their email before accessing the app.

### Features Implemented

- **Email Sign Up**: Users can create accounts with email and password
- **Email Sign In**: Existing users can sign in with their credentials
- **Email Verification**: Users must verify their email before accessing the app
- **Password Reset**: Users can reset their password via email
- **Terms of Service**: Users must agree to terms before creating an account
- **Logout**: Users can sign out from the settings screen

### Supabase Configuration

The authentication system uses your existing Supabase configuration from the `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Supabase Auth Settings

In your Supabase dashboard, ensure the following settings are configured:

1. **Authentication > Settings**:
   - Enable email confirmations
   - Set site URL to your app's URL
   - Configure redirect URLs for email verification

2. **Authentication > URL Configuration**:
   - Site URL: `http://localhost:8082` (for development)
   - Redirect URLs: `http://localhost:8082/auth/callback`

### Email Templates (Optional)

You can customize email templates in Supabase:
- Go to Authentication > Email Templates
- Customize the confirmation email template
- Customize the password reset email template

### How It Works

#### First Time Users
1. User opens the app
2. Sees the authentication screen
3. Chooses "Sign Up" tab
4. Enters email and password
5. Must check "I agree to Terms of Service"
6. Clicks "Create Account"
7. Receives verification email
8. Clicks verification link in email
9. Gets redirected back to app and can now access it

#### Returning Users
1. User opens the app
2. Sees authentication screen
3. Chooses "Sign In" tab
4. Enters email and password
5. Clicks "Sign In"
6. Gets immediate access to the app

### File Structure

```
providers/
├── AuthProvider.tsx          # Authentication context and logic
components/
├── AuthScreen.tsx            # Main authentication UI
├── ProtectedRoute.tsx        # Route protection wrapper
app/
├── auth/
│   ├── callback.tsx          # Email verification callback
│   └── reset-password.tsx    # Password reset screen
└── _layout.tsx               # Updated with auth protection
```

### Troubleshooting

**Email Not Received**
- Check spam folder
- Verify Supabase email settings
- Check if email confirmation is enabled in Supabase

**Verification Link Not Working**
- Ensure redirect URLs are configured in Supabase
- Check that the callback route is properly set up
- Verify the site URL matches your app URL

**Authentication Errors**
- Check browser console for error messages
- Verify Supabase credentials in `.env` file
- Ensure Supabase project is active

---

## Gemini AI Setup

### Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

### Step 2: Set up Environment Variables

Create a `.env` file in the root of your project with:

```env
# Gemini API Configuration
EXPO_PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key_here

# Supabase Configuration (optional)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Step 3: Test the API

Run the test script to verify your API key works:

```bash
node test-gemini.js
```

### Step 4: Restart the Development Server

After setting up the `.env` file, restart your Expo development server:

```bash
npx expo start --web --port 8082
```

### Troubleshooting

- Make sure the API key is correct and active
- Ensure the `.env` file is in the root directory
- Restart the development server after changing environment variables
- Check the browser console for debug logs

### Current Status

The AI chatbot will use mock responses until a valid Gemini API key is provided. Once set up, it will use the real Gemini API for intelligent responses.

---

## iOS In-App Purchase Setup

This guide walks you through setting up iOS In-App Purchases for the Momentum app, including App Store Connect configuration and RevenueCat integration.

### App Store Connect Configuration

#### 1. Create App ID (if not already created)

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles** → **Identifiers**
3. Click **+** to create a new App ID
4. Select **App IDs** and click **Continue**
5. Select **App** and click **Continue**
6. Fill in:
   - **Description**: Momentum Goal Tracker
   - **Bundle ID**: com.yourcompany.momentum (use your actual bundle ID)
   - **Capabilities**: Ensure **In-App Purchase** is checked
7. Click **Continue** and **Register**

#### 2. Create In-App Purchase Products

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Navigate to **Monetization** → **In-App Purchases**
4. Click **+** to create new products

**Premium Monthly Subscription:**
- **Reference Name**: Premium Monthly
- **Product ID**: `com.momentum.premium.monthly`
- **Type**: Auto-Renewable Subscription
- **Subscription Duration**: 1 Month
- **Price**: $9.99 (Tier 10)
- **Subscription Group**: Premium Access

**Family Monthly Subscription (Optional):**
- **Reference Name**: Family Monthly
- **Product ID**: `com.momentum.family.monthly`
- **Type**: Auto-Renewable Subscription
- **Subscription Duration**: 1 Month
- **Price**: $14.99 (Tier 15)
- **Subscription Group**: Premium Access

#### 3. Configure Subscription Group

1. In App Store Connect, go to **Subscription Groups**
2. Create a new group called "Premium Access"
3. Add both subscriptions to this group
4. Set up **Subscription Upgrade/Downgrade** paths
5. Configure **Grace Period** (recommended: 3 days)

#### 4. Add Localization

For each product:
1. Click on the product
2. Add **Display Name** and **Description** for each language:
   - **English**: 
     - Name: "Premium Monthly"
     - Description: "Unlimited goals, AI creation, custom colors & more"

#### 5. Create Sandbox Test Accounts

1. Go to **Users and Access** → **Sandbox Testers**
2. Click **+** to create test accounts
3. Create at least 2 test accounts for testing purchases

### RevenueCat Configuration

#### 1. Create RevenueCat Account

1. Sign up at [RevenueCat](https://app.revenuecat.com)
2. Create a new project
3. Select **iOS** as your platform

#### 2. Configure App in RevenueCat

1. **App Name**: Momentum
2. **iOS Bundle ID**: com.yourcompany.momentum
3. **App Store Connect App-Specific Shared Secret**:
   - Go to App Store Connect → Your App → **Monetization** → **In-App Purchase**
   - Click **App-Specific Shared Secret** → **Generate**
   - Copy and paste into RevenueCat

#### 3. Set Up Products in RevenueCat

1. Go to **Products** in RevenueCat
2. Click **+ New Product**
3. Add your products:
   - **Identifier**: com.momentum.premium.monthly
   - **App Store Product ID**: com.momentum.premium.monthly
   - **Display Name**: Premium Monthly

#### 4. Create Entitlements

1. Go to **Entitlements**
2. Create entitlement: **premium**
3. Attach products to this entitlement

#### 5. Create Offerings

1. Go to **Offerings**
2. Create **Default** offering
3. Add packages:
   - **Monthly**: com.momentum.premium.monthly

#### 6. Get API Keys

1. Go to **API Keys**
2. Copy your **iOS Public API Key**

### Environment Configuration

#### 1. Update .env file

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_public_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_public_api_key_here
```

#### 2. Update app.json

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-purchases",
        {
          "iosApiKey": "$EXPO_PUBLIC_REVENUECAT_IOS_KEY",
          "androidApiKey": "$EXPO_PUBLIC_REVENUECAT_ANDROID_KEY"
        }
      ]
    ]
  }
}
```

### iOS Project Configuration

#### 1. Configure Capabilities in Xcode

1. Open your iOS project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **In-App Purchase**

#### 2. Update Info.plist

Add StoreKit configuration for testing:

```xml
<key>SKTestEnvironment</key>
<string>sandbox</string>
```

### Testing In-App Purchases

#### 1. Local Testing with StoreKit Configuration

1. In Xcode, create a StoreKit Configuration file
2. Add your products with the same IDs
3. Run the app with this configuration

#### 2. TestFlight Testing

1. Upload build to TestFlight
2. Add sandbox testers as TestFlight testers
3. Test purchases with sandbox accounts

#### 3. Testing Checklist

- [ ] Purchase flow completes successfully
- [ ] Receipt validation works
- [ ] Subscription status syncs with backend
- [ ] Premium features unlock after purchase
- [ ] Restore purchases works
- [ ] Subscription management (cancel) works
- [ ] Grace period handling
- [ ] Upgrade/downgrade between tiers

### Production Checklist

Before going live:

1. **App Review**:
   - [ ] Add In-App Purchase screenshot
   - [ ] Explain subscription features
   - [ ] Provide demo account (if needed)

2. **Legal Requirements**:
   - [ ] Terms of Service URL
   - [ ] Privacy Policy URL
   - [ ] Both accessible from app

3. **Subscription Information**:
   - [ ] Clear pricing display
   - [ ] Subscription terms visible
   - [ ] Cancel instructions
   - [ ] Auto-renewal disclosure

4. **Backend**:
   - [ ] Webhook endpoints configured
   - [ ] Receipt validation implemented
   - [ ] Subscription status sync

### Common Issues

**"Invalid Product IDs"**
- Ensure products are in "Ready to Submit" state
- Wait 24 hours after creating products
- Check bundle ID matches exactly

**"User Cancelled" Error**
- Normal during testing
- Check sandbox account is signed in

**Subscription Not Showing as Active**
- Check RevenueCat dashboard
- Verify receipt validation
- Ensure backend sync is working

---

## Push Notifications Setup

### What's Already Implemented

#### Complete Notification System
- **NotificationProvider**: Full notification management with permissions, settings, and scheduling
- **Settings Integration**: User-friendly notification preferences in settings
- **Task Reminders**: Automatic notifications for upcoming tasks
- **Goal Reminders**: Notifications for goal milestones and deadlines
- **Daily Motivation**: Scheduled motivational messages
- **Weekly Reports**: Progress summary notifications
- **Test Notifications**: Built-in testing functionality

#### iOS Configuration
- **App.json**: Proper notification plugin configuration
- **Background Modes**: iOS background processing enabled
- **Notification Channels**: Android notification channels configured
- **Permission Handling**: Comprehensive permission request flow

### Pre-Submission Checklist

#### 1. Environment Variables

Ensure your `.env` file includes:

```bash
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 2. Expo Project Configuration

Your `app.json` is already configured with:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#ffffff",
          "defaultChannel": "default"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "background-processing"]
      }
    }
  }
}
```

### iOS App Store Requirements

#### 1. Push Notification Capability

When creating your app in App Store Connect:
1. Go to **App Information** → **App Store Connect API**
2. Enable **Push Notifications** capability
3. Download and install the **Apple Push Notification service (APNs) certificate**

#### 2. Required Info.plist Entries

Add these to your `app.json` under `ios.infoPlist`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["background-fetch", "background-processing"],
        "NSUserNotificationsUsageDescription": "Momentum sends notifications to remind you about your goals and tasks, keeping you motivated and on track.",
        "NSCameraUsageDescription": "Allow access to camera for profile pictures",
        "NSPhotoLibraryUsageDescription": "Allow access to photo library for profile pictures"
      }
    }
  }
}
```

### Testing Notifications

#### 1. Development Testing

```bash
# Test on physical device (notifications don't work in simulator)
npx expo start --ios
# or
npx expo run:ios
```

#### 2. Using the App

1. **Enable Notifications**: Go to Settings → Notifications → Enable
2. **Test Notifications**: Use the "Test Notifications" button
3. **Create Tasks**: Add tasks with future due dates
4. **Verify Scheduling**: Check that notifications are scheduled

#### 3. Production Testing

1. **TestFlight**: Upload to TestFlight for beta testing
2. **Real Device**: Test on actual iOS devices
3. **Background Testing**: Test notifications when app is backgrounded

### Notification Types

1. **Task Reminders**: "📋 Task Reminder - [Task Name] - [Goal Name]"
2. **Goal Reminders**: "🎯 Goal Reminder - Don't forget about your goal: [Goal Name]"
3. **Daily Motivation**: "🌟 Good morning! Ready to tackle your goals today?"
4. **Weekly Reports**: "📊 Weekly Report - Check out your progress this week!"

### Important Notes

#### iOS Limitations
- **Background Processing**: Limited to 30 seconds
- **Notification Limits**: iOS may limit notifications if too many are sent
- **Battery Optimization**: iOS may delay notifications to save battery

#### Best Practices
- **Respect User Preferences**: Always check notification settings
- **Meaningful Content**: Make notifications valuable to users
- **Timing**: Don't send notifications too frequently
- **Testing**: Always test on real devices

---

## Deep Link Configuration

This guide will help you configure Supabase to send email verification links that open your Momentum app instead of a web browser.

### What We've Done

1. **Updated app.json** - Changed scheme from `myapp` to `momentum`
2. **Added iOS Universal Links** - Configured associated domains for `rork.com`
3. **Added Android Intent Filters** - Set up deep link handling for Android
4. **Updated Auth Callback** - Modified `/app/auth/callback.tsx` to handle URL parameters
5. **Added Deep Link Listener** - Added global URL handling in `/app/_layout.tsx`

### What You Need to Do in Supabase

#### Step 1: Configure Redirect URLs

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication → URL Configuration**
3. Under **Redirect URLs**, add these URLs:

   ```
   momentum://auth/callback
   https://rork.com/auth/callback
   ```

   - The first URL (`momentum://`) is for your mobile app
   - The second URL (`https://rork.com/`) is a fallback for web browsers

4. Click **Save**

#### Step 2: Update Email Templates

You need to update your email templates to use the deep link redirect.

**For Confirm Email Template:**

1. Go to **Authentication → Email Templates**
2. Select **Confirm signup**
3. Find the confirmation link in the template (looks like this):

   ```html
   <a href="{{ .ConfirmationURL }}">Confirm your email</a>
   ```

4. Replace it with:

   ```html
   <a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Confirm your email</a>
   ```

**For Magic Link Template:**

1. Select **Magic Link**
2. Find the magic link (looks like this):

   ```html
   <a href="{{ .ConfirmationURL }}">Log in</a>
   ```

3. Replace it with:

   ```html
   <a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Log in</a>
   ```

**For Password Recovery Template:**

1. Select **Reset Password**
2. Find the reset link (looks like this):

   ```html
   <a href="{{ .ConfirmationURL }}">Reset password</a>
   ```

3. Replace it with:

   ```html
   <a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Reset password</a>
   ```

4. Click **Save** for each template

#### Step 3: Configure PKCE Flow (Recommended)

For better security with mobile apps, enable PKCE:

1. Go to **Authentication → Settings**
2. Find **PKCE Flow** settings
3. Enable **PKCE** for your project
4. This will make Supabase send `access_token` and `refresh_token` in the URL

### How It Works

#### Before (Old Behavior):
1. User clicks email verification link
2. Opens in Safari/Chrome browser
3. User has to manually return to app
4. Session might not transfer properly

#### After (New Behavior):
1. User clicks email verification link
2. iOS/Android intercepts the `momentum://` URL
3. App opens automatically
4. Session is created instantly
5. User is logged in and redirected to home screen

### Testing

#### Test on iOS Simulator/Device:

1. Sign up with a new email
2. Check the email (use a real email or check Supabase logs)
3. Click the verification link
4. The app should open automatically
5. You should see "Verifying your email..." then be redirected to home

#### Test on Android Emulator/Device:

Same steps as iOS - Android will handle `momentum://` URLs automatically once the app is installed.

### Troubleshooting

**Issue: Link opens browser instead of app**

**Solution:** 
- Make sure you've rebuilt the app after updating `app.json`
- Run: `npx expo prebuild --clean` then rebuild
- For iOS: The scheme needs to be registered in the native build

**Issue: App opens but shows "No session found"**

**Solution:**
- Check Supabase logs to see if `access_token` and `refresh_token` are in the URL
- Verify PKCE is enabled
- Check browser console for the actual redirect URL

**Issue: "Invalid redirect URL" error**

**Solution:**
- Make sure you added `momentum://auth/callback` to Redirect URLs in Supabase
- URLs are case-sensitive and must match exactly

**Issue: Works in dev but not in production**

**Solution:**
- For iOS: Add the app to Apple's Associated Domains
- For Android: Verify `intentFilters` in `app.json` are correct
- Rebuild the production app with: `eas build`

### Next Steps

1. ✅ Complete Supabase configuration (Steps 1-3 above)
2. ✅ Rebuild your app: `npx expo prebuild --clean`
3. ✅ Test with a real email on a physical device
4. ✅ Verify deep links work in both cold start (app closed) and warm start (app open)
5. ✅ Update any other email templates you use (invite emails, etc.)

---

## Supabase Management

### Overview

A comprehensive Supabase management system that provides both UI and CLI interfaces for managing your Supabase project.

### Features Implemented

#### CLI Management Script
- **Database Statistics**: Get real-time stats on goals, tasks, and users
- **Health Checks**: Monitor database connectivity and performance
- **Data Export**: Export all data for backup or analysis
- **Data Cleanup**: Remove old completed tasks to optimize performance
- **Schema Inspection**: Check table structure and data integrity

#### UI Dashboard
- **Real-time Statistics**: Visual dashboard with live data
- **User Management**: View and manage user accounts
- **System Health**: Monitor database health and connectivity
- **Management Actions**: Cleanup, export, and maintenance tools
- **Connection Info**: Verify Supabase configuration

### Available Commands

#### CLI Commands

```bash
# Get database statistics
npm run supabase:stats

# Check database health
npm run supabase:health

# Export all data
npm run supabase:export

# Clean up old data (30 days)
npm run supabase:cleanup

# Check database schema
npm run supabase:schema

# Run all checks
npm run supabase:all
```

#### UI Dashboard

1. Open the app
2. Go to Settings tab
3. Scroll to "Database Management" section
4. Click "Supabase Dashboard"
5. Access all management features through the UI

### How to Use

#### 1. CLI Management

The CLI script provides direct access to your Supabase database:

```bash
# Check if everything is working
npm run supabase:all

# Get current statistics
npm run supabase:stats

# Export data for backup
npm run supabase:export
```

#### 2. UI Dashboard

The dashboard provides a visual interface for management:

1. **Statistics View**: See real-time counts of users, goals, and tasks
2. **Health Monitor**: Check database connectivity and performance
3. **User Management**: View user accounts and activity
4. **Maintenance Tools**: Cleanup old data and export information

### Database Operations

#### Export Data

```bash
npm run supabase:export
```

This exports all goals and tasks to the console for backup or analysis.

#### Cleanup Old Data

```bash
npm run supabase:cleanup
```

Removes completed tasks older than 30 days to optimize performance.

#### Health Check

```bash
npm run supabase:health
```

Verifies database connectivity and basic operations.

### Performance Optimization

#### Regular Maintenance

Run these commands regularly:

```bash
# Weekly health check
npm run supabase:health

# Monthly cleanup
npm run supabase:cleanup

# Quarterly export
npm run supabase:export
```

### Troubleshooting

**Health Check Fails**
- Verify Supabase URL is correct in `.env`
- Check API key has proper permissions
- Ensure database is accessible and not paused

**Export Issues**
- Check database connectivity
- Verify table permissions
- Ensure sufficient memory for large datasets

**Cleanup Issues**
- Check table structure
- Verify date fields exist
- Ensure proper permissions

---

## Quick Reference

### Environment Variables Summary

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Gemini AI
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# RevenueCat (iOS Purchases)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_public_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_public_api_key_here

# Expo
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

### Common Setup Order

1. Supabase project creation and schema setup
2. Authentication configuration
3. Gemini API key setup
4. Deep link configuration
5. iOS purchase setup (if monetizing)
6. Notification configuration
7. Testing and verification

---

**Last Updated**: Current build
**Status**: ✅ All setup guides consolidated

