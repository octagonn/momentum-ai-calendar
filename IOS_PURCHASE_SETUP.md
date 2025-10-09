# iOS In-App Purchase Setup Guide

This guide walks you through setting up iOS In-App Purchases for the Momentum app, including App Store Connect configuration and RevenueCat integration.

## 📱 App Store Connect Configuration

### 1. Create App ID (if not already created)
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

### 2. Create In-App Purchase Products

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Navigate to **Monetization** → **In-App Purchases**
4. Click **+** to create new products

#### Premium Monthly Subscription:
- **Reference Name**: Premium Monthly
- **Product ID**: `com.momentum.premium.monthly`
- **Type**: Auto-Renewable Subscription
- **Subscription Duration**: 1 Month
- **Price**: $9.99 (Tier 10)
- **Subscription Group**: Premium Access

#### Family Monthly Subscription (Optional):
- **Reference Name**: Family Monthly
- **Product ID**: `com.momentum.family.monthly`
- **Type**: Auto-Renewable Subscription
- **Subscription Duration**: 1 Month
- **Price**: $14.99 (Tier 15)
- **Subscription Group**: Premium Access

### 3. Configure Subscription Group

1. In App Store Connect, go to **Subscription Groups**
2. Create a new group called "Premium Access"
3. Add both subscriptions to this group
4. Set up **Subscription Upgrade/Downgrade** paths
5. Configure **Grace Period** (recommended: 3 days)

### 4. Add Localization

For each product:
1. Click on the product
2. Add **Display Name** and **Description** for each language:
   - **English**: 
     - Name: "Premium Monthly"
     - Description: "Unlimited goals, AI creation, custom colors & more"

### 5. Create Sandbox Test Accounts

1. Go to **Users and Access** → **Sandbox Testers**
2. Click **+** to create test accounts
3. Create at least 2 test accounts for testing purchases

## 🔧 RevenueCat Configuration

### 1. Create RevenueCat Account

1. Sign up at [RevenueCat](https://app.revenuecat.com)
2. Create a new project
3. Select **iOS** as your platform

### 2. Configure App in RevenueCat

1. **App Name**: Momentum
2. **iOS Bundle ID**: com.yourcompany.momentum
3. **App Store Connect App-Specific Shared Secret**:
   - Go to App Store Connect → Your App → **Monetization** → **In-App Purchase**
   - Click **App-Specific Shared Secret** → **Generate**
   - Copy and paste into RevenueCat

### 3. Set Up Products in RevenueCat

1. Go to **Products** in RevenueCat
2. Click **+ New Product**
3. Add your products:
   - **Identifier**: com.momentum.premium.monthly
   - **App Store Product ID**: com.momentum.premium.monthly
   - **Display Name**: Premium Monthly

### 4. Create Entitlements

1. Go to **Entitlements**
2. Create entitlement: **premium**
3. Attach products to this entitlement

### 5. Create Offerings

1. Go to **Offerings**
2. Create **Default** offering
3. Add packages:
   - **Monthly**: com.momentum.premium.monthly

### 6. Get API Keys

1. Go to **API Keys**
2. Copy your **iOS Public API Key**

## 🔐 Environment Configuration

### 1. Update .env file

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_public_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_public_api_key_here
```

### 2. Update app.json

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

## 📲 iOS Project Configuration

### 1. Configure Capabilities in Xcode

1. Open your iOS project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Click **+ Capability**
5. Add **In-App Purchase**

### 2. Update Info.plist

Add StoreKit configuration for testing:

```xml
<key>SKTestEnvironment</key>
<string>sandbox</string>
```

## 🧪 Testing In-App Purchases

### 1. Local Testing with StoreKit Configuration

1. In Xcode, create a StoreKit Configuration file
2. Add your products with the same IDs
3. Run the app with this configuration

### 2. TestFlight Testing

1. Upload build to TestFlight
2. Add sandbox testers as TestFlight testers
3. Test purchases with sandbox accounts

### 3. Testing Checklist

- [ ] Purchase flow completes successfully
- [ ] Receipt validation works
- [ ] Subscription status syncs with backend
- [ ] Premium features unlock after purchase
- [ ] Restore purchases works
- [ ] Subscription management (cancel) works
- [ ] Grace period handling
- [ ] Upgrade/downgrade between tiers

## 🚀 Production Checklist

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

## 🐛 Common Issues

### "Invalid Product IDs"
- Ensure products are in "Ready to Submit" state
- Wait 24 hours after creating products
- Check bundle ID matches exactly

### "User Cancelled" Error
- Normal during testing
- Check sandbox account is signed in

### Subscription Not Showing as Active
- Check RevenueCat dashboard
- Verify receipt validation
- Ensure backend sync is working

## 📚 Additional Resources

- [Apple In-App Purchase Documentation](https://developer.apple.com/in-app-purchase/)
- [RevenueCat iOS Documentation](https://docs.revenuecat.com/docs/ios)
- [StoreKit Testing Guide](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)

## 🔒 Security Notes

1. Never expose private API keys
2. Validate receipts server-side
3. Use HTTPS for all API calls
4. Implement proper error handling
5. Log subscription events for auditing

---

Remember to test thoroughly in sandbox environment before submitting to App Store!
