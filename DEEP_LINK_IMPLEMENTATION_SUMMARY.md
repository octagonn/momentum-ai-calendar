# Deep Link Implementation Summary

## ✅ What's Been Implemented

I've successfully configured your Momentum app to handle email verification deep links! Here's what was done:

### 1. **Updated App Configuration** (`app.json`)
   - ✅ Changed app scheme from `myapp` to `momentum`
   - ✅ Added iOS Universal Links support for `rork.com`
   - ✅ Added Android Intent Filters for deep link handling
   - ✅ Configured both platforms to intercept `momentum://` URLs

### 2. **Enhanced Auth Callback** (`app/auth/callback.tsx`)
   - ✅ Added URL parameter parsing
   - ✅ Handles `access_token` and `refresh_token` from URLs
   - ✅ Properly sets Supabase session from URL tokens
   - ✅ Includes error handling for failed verifications
   - ✅ Provides user feedback during the process

### 3. **Added Deep Link Listener** (`app/_layout.tsx`)
   - ✅ Listens for deep links when app is open (warm start)
   - ✅ Handles deep links when app launches (cold start)
   - ✅ Automatically routes to auth callback with parameters
   - ✅ Includes comprehensive logging for debugging

### 4. **Created Documentation**
   - ✅ `DEEP_LINK_SETUP_GUIDE.md` - Complete setup instructions
   - ✅ `SUPABASE_EMAIL_TEMPLATE_UPDATE.md` - Quick reference for Supabase
   - ✅ `scripts/test-deep-links.js` - Testing utilities

---

## 🎯 How It Works Now

### Before (Old Flow):
```
1. User receives email → 
2. Clicks verification link → 
3. Opens in Safari/Chrome → 
4. Shows "Email verified" page → 
5. User manually returns to app → 
6. May need to log in again
```

### After (New Flow):
```
1. User receives email → 
2. Clicks verification link → 
3. App opens automatically → 
4. Tokens extracted from URL → 
5. Session created → 
6. User is logged in immediately ✨
```

---

## 📋 What You Need To Do

### Step 1: Update Supabase Dashboard (5 minutes)

1. **Add Redirect URLs:**
   - Go to: **Supabase Dashboard → Authentication → URL Configuration**
   - Add: `momentum://auth/callback`
   - Add: `https://rork.com/auth/callback` (fallback)
   - Click **Save**

2. **Update Email Templates:**
   - Go to: **Supabase Dashboard → Authentication → Email Templates**
   - For each template (Confirm Signup, Magic Link, Reset Password):
     - Find: `{{ .ConfirmationURL }}`
     - Change to: `{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback`
   - Click **Save** for each

   See `SUPABASE_EMAIL_TEMPLATE_UPDATE.md` for detailed instructions.

### Step 2: Rebuild Your App (Required!)

Since `app.json` was modified, you **must** rebuild:

```bash
# Clean and rebuild native folders
npx expo prebuild --clean

# Then run on your device/simulator
npx expo run:ios
# or
npx expo run:android
```

For production builds:
```bash
eas build --platform ios
eas build --platform android
```

### Step 3: Test It!

1. **Sign up with a real email** (Gmail, Outlook, etc.)
2. **Check your email** inbox
3. **Click the verification link**
4. **Expected result:** 
   - App opens automatically
   - Brief "Verifying your email..." screen
   - Redirects to home screen
   - You're logged in!

Run the test helper for more testing options:
```bash
node scripts/test-deep-links.js
```

---

## 🧪 Testing Checklist

Use this to verify everything works:

- [ ] Supabase redirect URLs updated
- [ ] Email templates updated with `&redirect_to=momentum://auth/callback`
- [ ] App rebuilt with `npx expo prebuild --clean`
- [ ] Tested email verification on iOS
- [ ] Tested email verification on Android
- [ ] Tested with app closed (cold start)
- [ ] Tested with app open (warm start)
- [ ] Tested password reset link
- [ ] Tested magic link (if you use it)

---

## 🔍 Debugging

### Check Console Logs

When a deep link is triggered, you should see:

```
Deep link received: momentum://auth/callback?access_token=...
Auth callback deep link detected
Setting session from URL tokens
Session set successfully, user: user@example.com
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Browser opens instead of app | Rebuild: `npx expo prebuild --clean` |
| "Invalid redirect URL" error | Add `momentum://auth/callback` to Supabase Dashboard |
| "No session found" | Enable PKCE in Supabase auth settings |
| Works in dev, not prod | Rebuild production app: `eas build` |
| App crashes on open | Check console for errors, verify tokens are valid |

### Test URLs Manually

iOS Simulator:
```bash
xcrun simctl openurl booted "momentum://auth/callback?access_token=test&refresh_token=test"
```

Android Emulator:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "momentum://auth/callback?access_token=test&refresh_token=test"
```

---

## 📱 Platform-Specific Notes

### iOS
- Universal Links require `associatedDomains` capability
- Already configured in `app.json` for `rork.com`
- On first install, may need to long-press link and choose "Open in Momentum"
- After first time, will always open in app

### Android
- Intent filters automatically registered
- Works immediately after install
- No user intervention needed

---

## 🚀 Production Deployment

When ready to deploy:

1. **Update EAS configuration** (if using EAS Build)
2. **Rebuild app** with the new deep link configuration
3. **Submit to App Store / Play Store**
4. **Test in production** with real devices
5. **Monitor Supabase logs** for any deep link issues

---

## 📂 Modified Files

Here's what was changed for your reference:

```
app.json                           # Updated scheme and deep link config
app/auth/callback.tsx              # Enhanced URL parameter handling
app/_layout.tsx                    # Added deep link listener
DEEP_LINK_SETUP_GUIDE.md          # (new) Comprehensive guide
SUPABASE_EMAIL_TEMPLATE_UPDATE.md # (new) Quick reference
scripts/test-deep-links.js        # (new) Testing utilities
```

---

## 🎓 Learn More

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Supabase Auth Deep Linking](https://supabase.com/docs/guides/auth/auth-deep-linking)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)

---

## 🆘 Need Help?

1. **Check the guides:**
   - `DEEP_LINK_SETUP_GUIDE.md` - Detailed instructions
   - `SUPABASE_EMAIL_TEMPLATE_UPDATE.md` - Template updates

2. **Run the test script:**
   ```bash
   node scripts/test-deep-links.js
   ```

3. **Check console logs** for debugging info

4. **Verify Supabase configuration:**
   - Redirect URLs are correct
   - Email templates have `redirect_to` parameter
   - PKCE is enabled (recommended)

---

## ✨ Success Criteria

You'll know it's working when:

1. ✅ Email verification link opens the app (not browser)
2. ✅ App shows "Verifying your email..." briefly
3. ✅ User is redirected to home screen
4. ✅ User is logged in without manual intervention
5. ✅ Works on both iOS and Android
6. ✅ Works whether app is open or closed

---

## 🎉 Next Steps

1. **Complete Supabase setup** (5 minutes)
2. **Rebuild the app** (`npx expo prebuild --clean`)
3. **Test with real email** on physical device
4. **Verify all flows work** (signup, reset password, magic link)
5. **Deploy to production** when ready

---

**You're all set!** The code is ready - just update Supabase and rebuild. 🚀

Any questions? Check the detailed guides or run the test script for more info!

