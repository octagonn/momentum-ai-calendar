# Deep Link Setup Guide for Email Verification

This guide will help you configure Supabase to send email verification links that open your Momentum app instead of a web browser.

## ✅ What We've Done

1. **Updated app.json** - Changed scheme from `myapp` to `momentum`
2. **Added iOS Universal Links** - Configured associated domains for `rork.com`
3. **Added Android Intent Filters** - Set up deep link handling for Android
4. **Updated Auth Callback** - Modified `/app/auth/callback.tsx` to handle URL parameters
5. **Added Deep Link Listener** - Added global URL handling in `/app/_layout.tsx`

## 🔧 What You Need to Do in Supabase

### Step 1: Configure Redirect URLs

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

### Step 2: Update Email Templates

You need to update your email templates to use the deep link redirect.

#### For Confirm Email Template:

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

#### For Magic Link Template:

1. Select **Magic Link**
2. Find the magic link (looks like this):

   ```html
   <a href="{{ .ConfirmationURL }}">Log in</a>
   ```

3. Replace it with:

   ```html
   <a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Log in</a>
   ```

#### For Password Recovery Template:

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

### Step 3: Configure PKCE Flow (Recommended)

For better security with mobile apps, enable PKCE:

1. Go to **Authentication → Settings**
2. Find **PKCE Flow** settings
3. Enable **PKCE** for your project
4. This will make Supabase send `access_token` and `refresh_token` in the URL

## 📱 How It Works

### Before (Old Behavior):
1. User clicks email verification link
2. Opens in Safari/Chrome browser
3. User has to manually return to app
4. Session might not transfer properly

### After (New Behavior):
1. User clicks email verification link
2. iOS/Android intercepts the `momentum://` URL
3. App opens automatically
4. Session is created instantly
5. User is logged in and redirected to home screen

## 🧪 Testing

### Test on iOS Simulator/Device:

1. Sign up with a new email
2. Check the email (use a real email or check Supabase logs)
3. Click the verification link
4. The app should open automatically
5. You should see "Verifying your email..." then be redirected to home

### Test on Android Emulator/Device:

Same steps as iOS - Android will handle `momentum://` URLs automatically once the app is installed.

### Test URL Format:

The email link should look like this:

```
https://[your-supabase-project].supabase.co/auth/v1/verify
  ?token=xxx
  &type=signup
  &redirect_to=momentum://auth/callback
```

When clicked, Supabase will redirect to:

```
momentum://auth/callback?access_token=xxx&refresh_token=yyy&type=signup
```

## 🐛 Troubleshooting

### Issue: Link opens browser instead of app

**Solution:** 
- Make sure you've rebuilt the app after updating `app.json`
- Run: `npx expo prebuild --clean` then rebuild
- For iOS: The scheme needs to be registered in the native build

### Issue: App opens but shows "No session found"

**Solution:**
- Check Supabase logs to see if `access_token` and `refresh_token` are in the URL
- Verify PKCE is enabled
- Check browser console for the actual redirect URL

### Issue: "Invalid redirect URL" error

**Solution:**
- Make sure you added `momentum://auth/callback` to Redirect URLs in Supabase
- URLs are case-sensitive and must match exactly

### Issue: Works in dev but not in production

**Solution:**
- For iOS: Add the app to Apple's Associated Domains
- For Android: Verify `intentFilters` in `app.json` are correct
- Rebuild the production app with: `eas build`

## 📝 Additional Notes

### Custom Domain (Optional)

If you want to use your own domain instead of Supabase's:

1. Set up a custom domain in Supabase (e.g., `auth.momentum.com`)
2. Update the `associatedDomains` in `app.json` to `applinks:auth.momentum.com`
3. Add Universal Link configuration on your server
4. Update redirect URLs in Supabase

### Multiple Environments

If you have dev/staging/prod environments:

```json
{
  "expo": {
    "scheme": "momentum",
    "extra": {
      "dev": {
        "scheme": "momentum-dev"
      }
    }
  }
}
```

Then update email templates to use different schemes per environment.

## 🚀 Next Steps

1. ✅ Complete Supabase configuration (Steps 1-3 above)
2. ✅ Rebuild your app: `npx expo prebuild --clean`
3. ✅ Test with a real email on a physical device
4. ✅ Verify deep links work in both cold start (app closed) and warm start (app open)
5. ✅ Update any other email templates you use (invite emails, etc.)

## 📚 Resources

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Supabase Auth Deep Links](https://supabase.com/docs/guides/auth/auth-deep-linking)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)

---

**Need Help?** Check the console logs for deep link events. The app will log:
- "Deep link received: [url]"
- "Auth callback deep link detected"
- "Setting session from URL tokens"

