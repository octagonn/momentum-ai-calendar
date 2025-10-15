# Supabase Email Template Updates - Quick Reference

## 🎯 Goal
Make email verification links open the **Momentum app** instead of a web browser.

---

## ⚡ Quick Steps

### 1. Add Redirect URLs (Supabase Dashboard)

**Path:** Authentication → URL Configuration → Redirect URLs

**Add these URLs:**
```
momentum://auth/callback
https://rork.com/auth/callback
```

---

### 2. Update Email Templates

**Path:** Authentication → Email Templates

For **EACH** of these templates, add `&redirect_to=momentum://auth/callback` to the confirmation link:

#### ✉️ Confirm Signup

**Before:**
```html
<a href="{{ .ConfirmationURL }}">Confirm your email</a>
```

**After:**
```html
<a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Confirm your email</a>
```

---

#### ✉️ Magic Link

**Before:**
```html
<a href="{{ .ConfirmationURL }}">Log in</a>
```

**After:**
```html
<a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Log in</a>
```

---

#### ✉️ Reset Password

**Before:**
```html
<a href="{{ .ConfirmationURL }}">Reset password</a>
```

**After:**
```html
<a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Reset password</a>
```

---

#### ✉️ Invite User (if you use this)

**Before:**
```html
<a href="{{ .ConfirmationURL }}">Accept invite</a>
```

**After:**
```html
<a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">Accept invite</a>
```

---

## 🧪 Test It

1. Sign up with a **real email address** (Gmail, etc.)
2. Check your email inbox
3. Click the verification link
4. **Expected:** Momentum app opens and you're logged in
5. **Not expected:** Browser opens instead

---

## 📋 Template Reference

If you want to customize your email templates, here's the full structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Confirm Your Email</title>
</head>
<body>
  <h2>Confirm your signup</h2>
  <p>Follow this link to confirm your user:</p>
  <p>
    <a href="{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback">
      Confirm your email address
    </a>
  </p>
  <p>Or copy and paste this URL into your browser:</p>
  <p>{{ .ConfirmationURL }}&redirect_to=momentum://auth/callback</p>
</body>
</html>
```

**Key Points:**
- Keep `{{ .ConfirmationURL }}` as is (Supabase variable)
- Add `&redirect_to=momentum://auth/callback` after it
- Update both the `<a href>` and the plain text URL

---

## ✅ Verification

After updating, your email links should look like:

```
https://xxxxx.supabase.co/auth/v1/verify
  ?token=abc123...
  &type=signup
  &redirect_to=momentum://auth/callback
```

When clicked, Supabase redirects to:

```
momentum://auth/callback
  ?access_token=xyz789...
  &refresh_token=def456...
  &type=signup
```

And your app intercepts this URL and logs the user in! 🎉

---

## 🚨 Important Notes

1. **Save each template** after editing
2. **Test with a real email** (not just copy-paste URLs)
3. **Rebuild your app** if you changed `app.json`:
   ```bash
   npx expo prebuild --clean
   ```
4. **Physical device** testing works best (simulators can be flaky)

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser opens instead of app | Rebuild app: `npx expo prebuild --clean` |
| "Invalid redirect URL" error | Add `momentum://auth/callback` to Supabase redirect URLs |
| "No session found" in app | Check if tokens are in URL (enable PKCE in Supabase) |
| Works in dev, not production | Rebuild production: `eas build --platform ios` |

---

## 📚 Related Files

- `DEEP_LINK_SETUP_GUIDE.md` - Comprehensive setup guide
- `scripts/test-deep-links.js` - Testing utilities
- `app/auth/callback.tsx` - Auth callback handler
- `app/_layout.tsx` - Deep link listener
- `app.json` - App configuration

---

**Need more help?** Check the console logs when clicking the email link. You should see:
```
Deep link received: momentum://auth/callback?access_token=...
Auth callback deep link detected
Setting session from URL tokens
Session set successfully, user: [email]
```

---

✨ **You're all set!** Just update the Supabase templates and test. ✨

