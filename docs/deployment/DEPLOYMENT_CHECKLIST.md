# 🚀 App Store Deployment Checklist

Use this checklist to deploy **Momentum iOS App** to the App Store.

## Pre-Deployment Setup

### Apple Developer Requirements
- [ ] Active Apple Developer Account ($99/year)
  - Sign up: https://developer.apple.com/programs/
- [ ] Access to App Store Connect
  - Login: https://appstoreconnect.apple.com/

### Expo Setup
- [ ] Create Expo account at https://expo.dev/
- [ ] Login to EAS CLI: `npm run eas:login`

## App Store Connect Setup

### Create App Listing
- [ ] Go to App Store Connect → My Apps → Add New App
- [ ] Enter App Information:
  - **Bundle ID**: `com.momentumaicalendar.app` ✅ (already configured)
  - **App Name**: Choose your app name (e.g., "Momentum" or "Momentum Goals")
  - **Primary Language**: English (or your choice)
  - **SKU**: Create unique identifier (e.g., `MOMENTUM-AI-CALENDAR-IOS`)

### Required App Information
- [ ] **App Category**: Productivity (recommended for this app)
- [ ] **Subcategory** (optional): Personal Productivity
- [ ] **Content Rights**: Confirm you have rights to all content
- [ ] **Age Rating**: Complete questionnaire (likely 4+)

### Marketing Materials
- [ ] **App Screenshots** (Required for multiple device sizes):
  - iPhone 6.7" Display (iPhone 14 Pro Max, 15 Pro Max)
  - iPhone 6.5" Display (iPhone 11 Pro Max, XS Max)
  - iPhone 5.5" Display (iPhone 8 Plus, 7 Plus)
  - iPad Pro (12.9", 3rd gen)
  - iPad Pro (12.9", 2nd gen)
  
- [ ] **App Preview Videos** (Optional but recommended)

- [ ] **App Description** (4000 character limit)
  - Write compelling description of your goal tracking app
  
- [ ] **Keywords** (100 character limit)
  - Suggested: goals,tasks,productivity,tracking,habits,planner

- [ ] **Promotional Text** (170 characters)
  - This can be updated anytime without new review

- [ ] **Support URL** (Required)
  - Where users can get help (website, email, etc.)

- [ ] **Marketing URL** (Optional)
  - Your app's marketing page

### Privacy & Legal
- [ ] **Privacy Policy URL** (Required)
  - Create and host a privacy policy
  - Should cover: notifications, data storage, Supabase usage, IAP

- [ ] **App Privacy Details** (Required in App Store Connect)
  - Data collected: Email, Name, User ID
  - Data usage: App functionality, Analytics
  - Data linked to user: Yes

- [ ] **Terms of Service** (Recommended)
  - Especially important for subscription features

### In-App Purchases Setup
Your app uses `react-native-iap`, so you need to:

- [ ] Create IAP products in App Store Connect
  - Go to: Your App → Features → In-App Purchases
  - Create subscription products
  - Add localizations and pricing

- [ ] Configure IAP product IDs to match your app code
  - Check `services/subscriptionService.ts` for product IDs

- [ ] Set up subscription groups (if using subscriptions)

- [ ] Add IAP screenshots (required for each IAP)

## Build & Deploy Process

### Step 1: First Build (TestFlight - Internal Testing)
- [ ] Run: `npm run eas:build:preview`
- [ ] Wait for build to complete (10-30 mins)
- [ ] Build automatically uploads to TestFlight

### Step 2: TestFlight Testing
- [ ] In App Store Connect → TestFlight:
  - Add internal testers
  - Test thoroughly on real devices
  - Fix any bugs found

### Step 3: Production Build
- [ ] Run: `npm run eas:build:production`
- [ ] Wait for build to complete
- [ ] Verify build in EAS dashboard

### Step 4: Submit to App Store
- [ ] Option A: Use EAS Submit
  ```bash
  npm run eas:submit
  ```
  - You'll need Apple ID app-specific password
  - Create at: https://appleid.apple.com/

- [ ] Option B: Manual Upload
  - Download `.ipa` from EAS dashboard
  - Use Transporter app (Mac App Store)
  - Upload to App Store Connect

### Step 5: Complete App Store Connect
- [ ] Select your build in App Store Connect
- [ ] Complete all required fields (see above)
- [ ] Add all required screenshots
- [ ] Review all information

### Step 6: Submit for Review
- [ ] Click "Submit for Review"
- [ ] Answer questionnaire:
  - Export compliance (encryption): No (already configured)
  - Content rights: Yes
  - Advertising identifier: Based on your app's analytics

- [ ] Add notes for reviewer if needed:
  - Demo account credentials
  - Special testing instructions
  - Features to focus on

## Post-Submission

### During Review (1-3 days typically)
- [ ] Monitor App Store Connect for status updates
- [ ] Respond promptly to any reviewer questions
- [ ] Be ready to fix issues if rejected

### After Approval
- [ ] Set release option:
  - Manual release (you control when it goes live)
  - Automatic release (goes live immediately after approval)
  
- [ ] Monitor app analytics in App Store Connect

- [ ] Set up App Store Optimization (ASO)
  - Monitor keyword rankings
  - Update based on performance

## Version Updates

When releasing updates:

1. Update version in `app.json`:
   ```json
   "version": "1.0.1",  // Increment this
   "ios": {
     "buildNumber": "2"  // Increment this
   }
   ```

2. Build new version: `npm run eas:build:production`

3. Submit: `npm run eas:submit`

4. Add "What's New" text in App Store Connect

## Quick Commands

```bash
# Login to Expo
npm run eas:login

# Build for TestFlight (testing)
npm run eas:build:preview

# Build for App Store (production)
npm run eas:build:production

# Submit to App Store
npm run eas:submit

# Check build status
npm run eas:build:list
```

## Important Notes

⚠️ **First-Time Approval**: First app submission typically takes longer (3-7 days)

⚠️ **In-App Purchases**: IAPs must be submitted with your app's first version

⚠️ **Privacy Policy**: Required before submission - cannot submit without it

⚠️ **Screenshots**: Must be from actual app, no mockups allowed

⚠️ **App Icon**: Must be 1024x1024px, no transparency, no rounded corners

## Resources

- 📖 **Full Guide**: See `APP_STORE_DEPLOYMENT.md`
- 🔗 **App Store Connect**: https://appstoreconnect.apple.com/
- 🔗 **EAS Docs**: https://docs.expo.dev/build/introduction/
- 🔗 **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/

## Getting Help

- **Expo Discord**: https://chat.expo.dev/
- **App Store Support**: https://developer.apple.com/contact/
- **EAS Build Issues**: https://docs.expo.dev/build/troubleshooting/

---

**Ready to deploy?** Start with: `npm run eas:login` 🚀

