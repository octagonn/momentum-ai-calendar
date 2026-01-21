# App Store Deployment Guide

## Prerequisites

Before you begin, make sure you have:

1. ✅ **Apple Developer Account** ($99/year)
   - Sign up at: https://developer.apple.com/programs/

2. ✅ **App Store Connect Access**
   - Access at: https://appstoreconnect.apple.com/

3. ✅ **Expo Account**
   - Sign up at: https://expo.dev/

## Step 1: Login to Expo

```bash
eas login
```

Enter your Expo credentials.

## Step 2: Configure EAS Build

Create an EAS configuration file:

```bash
eas build:configure
```

This will create an `eas.json` file. You can customize it as needed.

## Step 3: Update app.json (Important!)

Before building, ensure your `app.json` has all required fields:

- ✅ Your bundle identifier is set: `com.momentumaicalendar.app`
- ✅ Version is set: `1.0.0`
- ⚠️ You may need to add/verify:
  - Privacy descriptions (for notifications, location, etc.)
  - App Store assets (icon, splash screen)

## Step 4: Build for iOS

### Option A: Build for Internal Testing (TestFlight)

```bash
eas build --platform ios --profile preview
```

### Option B: Build for Production (App Store)

```bash
eas build --platform ios --profile production
```

This will:
- Upload your code to Expo's servers
- Build your app in the cloud
- Generate an `.ipa` file (iOS app package)
- Takes 10-30 minutes typically

## Step 5: Submit to App Store

After the build completes:

```bash
eas submit --platform ios
```

You'll be prompted for:
- Apple ID
- App-specific password (create at appleid.apple.com)
- App Store Connect credentials

## Alternative: Manual Submission

If you prefer manual control:

1. Download the `.ipa` file from your EAS build
2. Use **Transporter** app (from Mac App Store)
3. Upload the `.ipa` to App Store Connect
4. Complete app information in App Store Connect

## Step 6: Configure App in App Store Connect

1. Go to https://appstoreconnect.apple.com/
2. Create a new app:
   - Bundle ID: `com.momentumaicalendar.app`
   - App Name: "Momentum iOS App" (or your desired name)
   - Primary Language
   - SKU (unique identifier for your records)

3. Fill out required information:
   - **App Information**: Category, content rights, etc.
   - **Pricing**: Free or paid
   - **App Privacy**: Privacy policy URL, data collection practices
   - **Screenshots**: Required for all supported device sizes
   - **App Description**: Marketing text
   - **Keywords**: For search optimization
   - **Support URL**: Where users can get help
   - **Marketing URL** (optional)

4. Add your build from TestFlight

5. Submit for review

## Important Configuration Updates Needed

### 1. Add Privacy Descriptions

Your app uses notifications and background modes. Add to `app.json`:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.momentumaicalendar.app",
  "infoPlist": {
    "UIBackgroundModes": ["background-fetch", "background-processing"],
    "NSUserNotificationsUsageDescription": "We use notifications to remind you about your goals and tasks.",
    "NSLocationWhenInUseUsageDescription": "This app does not use your location."
  }
}
```

### 2. Verify Assets

Make sure these files exist and are high quality:
- `./assets/images/icon.png` - Should be 1024x1024px
- `./assets/images/splash-icon.png` - Splash screen image

### 3. In-App Purchases Setup

Your app uses `react-native-iap`. You'll need to:
1. Create IAP products in App Store Connect
2. Test purchases in sandbox environment
3. Submit IAPs for review alongside your app

## Common Issues & Solutions

### Issue: "Build failed - missing credentials"
**Solution**: Run `eas credentials` to configure signing certificates

### Issue: "Invalid Bundle ID"
**Solution**: Ensure bundle ID in app.json (`com.momentumaicalendar.app`) matches exactly what's in App Store Connect

### Issue: "Missing Privacy Policy"
**Solution**: You must host a privacy policy URL (can use GitHub Pages, your website, etc.)

### Issue: "App uses non-exempt encryption"
**Solution**: Add to app.json:
```json
"ios": {
  "config": {
    "usesNonExemptEncryption": false
  }
}
```

## Testing Before Submission

### TestFlight (Internal Testing)

1. Build with preview profile:
   ```bash
   eas build --platform ios --profile preview
   ```

2. The build automatically uploads to TestFlight

3. Add internal testers in App Store Connect

4. Testers receive invite via TestFlight app

### External Testing

External testers (up to 10,000) can test via TestFlight after basic app review.

## Timeline Expectations

- **Build time**: 10-30 minutes per build
- **TestFlight availability**: Immediate for internal, 1-2 days review for external
- **App Store review**: 1-3 days (sometimes longer)
- **Total time to launch**: Plan for at least 1 week

## Commands Quick Reference

```bash
# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS (production)
eas build --platform ios --profile production

# Build for iOS (preview/TestFlight)
eas build --platform ios --profile preview

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list

# View credentials
eas credentials

# Update app version
# (Update version in app.json, then rebuild)
```

## Next Steps After This Guide

1. ✅ Run `eas build:configure` to create eas.json
2. ✅ Update app.json with privacy descriptions
3. ✅ Create App Store Connect app listing
4. ✅ Build for TestFlight: `eas build --platform ios --profile preview`
5. ✅ Test thoroughly via TestFlight
6. ✅ Build for production: `eas build --platform ios --profile production`
7. ✅ Submit: `eas submit --platform ios`
8. ✅ Complete App Store Connect listing
9. ✅ Submit for review

## Resources

- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **TestFlight Guide**: https://developer.apple.com/testflight/

## Cost Summary

- Apple Developer Program: **$99/year** (required)
- Expo Account: **Free** (or paid for priority builds)
- EAS Build: **Free tier available** (limited builds/month), or paid plans for unlimited

---

**Ready to start?** Run: `eas build:configure`

