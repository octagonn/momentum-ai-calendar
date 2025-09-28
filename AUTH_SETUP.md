# Authentication Setup Guide

## Overview
The Momentum app now includes a comprehensive email authentication system using Supabase Auth with email verification. Users must create an account and verify their email before accessing the app.

## Features Implemented

### ✅ **Authentication System**
- **Email Sign Up**: Users can create accounts with email and password
- **Email Sign In**: Existing users can sign in with their credentials
- **Email Verification**: Users must verify their email before accessing the app
- **Password Reset**: Users can reset their password via email
- **Terms of Service**: Users must agree to terms before creating an account
- **Logout**: Users can sign out from the settings screen

### ✅ **UI Components**
- **Beautiful Auth Screen**: Modern, approachable design with gradient backgrounds
- **Terms Modal**: Comprehensive terms of service with scrollable content
- **Email Verification Screen**: Clear instructions for email verification
- **Password Reset Screen**: Simple password reset interface
- **Protected Routes**: All app routes are protected by authentication

### ✅ **Security Features**
- **Email Verification Required**: Users cannot access the app without verifying their email
- **Secure Password Requirements**: Minimum 6 characters
- **Session Management**: Automatic session handling with Supabase
- **Protected Routes**: All app functionality is behind authentication

## Setup Instructions

### 1. Supabase Configuration
The authentication system uses your existing Supabase configuration from the `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Supabase Auth Settings
In your Supabase dashboard, ensure the following settings are configured:

1. **Authentication > Settings**:
   - Enable email confirmations
   - Set site URL to your app's URL
   - Configure redirect URLs for email verification

2. **Authentication > URL Configuration**:
   - Site URL: `http://localhost:8082` (for development)
   - Redirect URLs: `http://localhost:8082/auth/callback`

### 3. Email Templates (Optional)
You can customize email templates in Supabase:
- Go to Authentication > Email Templates
- Customize the confirmation email template
- Customize the password reset email template

## How It Works

### 1. **First Time Users**
1. User opens the app
2. Sees the beautiful authentication screen
3. Chooses "Sign Up" tab
4. Enters email and password
5. Must check "I agree to Terms of Service"
6. Clicks "Create Account"
7. Receives verification email
8. Clicks verification link in email
9. Gets redirected back to app and can now access it

### 2. **Returning Users**
1. User opens the app
2. Sees authentication screen
3. Chooses "Sign In" tab
4. Enters email and password
5. Clicks "Sign In"
6. Gets immediate access to the app

### 3. **Password Reset**
1. User clicks "Forgot Password" (if implemented)
2. Enters email address
3. Receives password reset email
4. Clicks reset link
5. Sets new password
6. Gets redirected to app

## File Structure

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

## Key Components

### **AuthProvider**
- Manages authentication state
- Provides sign up, sign in, sign out functions
- Handles email verification
- Manages password reset

### **AuthScreen**
- Beautiful, modern UI design
- Tab-based interface (Sign In / Sign Up)
- Terms of service agreement
- Email verification flow
- Form validation

### **ProtectedRoute**
- Wraps the entire app
- Shows auth screen if user not logged in
- Shows app if user is authenticated

## Testing the Authentication

### 1. **Test Sign Up Flow**
1. Open the app
2. Click "Sign Up" tab
3. Enter a valid email and password
4. Check "I agree to Terms of Service"
5. Click "Create Account"
6. Check your email for verification link
7. Click the verification link
8. You should be redirected back to the app

### 2. **Test Sign In Flow**
1. Open the app
2. Click "Sign In" tab
3. Enter your verified email and password
4. Click "Sign In"
5. You should be taken to the main app

### 3. **Test Logout**
1. Go to Settings tab
2. Scroll to "Account Actions" section
3. Click "Sign Out"
4. You should be redirected to the auth screen

## Troubleshooting

### **Email Not Received**
- Check spam folder
- Verify Supabase email settings
- Check if email confirmation is enabled in Supabase

### **Verification Link Not Working**
- Ensure redirect URLs are configured in Supabase
- Check that the callback route is properly set up
- Verify the site URL matches your app URL

### **Authentication Errors**
- Check browser console for error messages
- Verify Supabase credentials in `.env` file
- Ensure Supabase project is active

## Security Notes

- All user data is protected by Supabase Auth
- Email verification prevents unauthorized access
- Passwords are securely hashed by Supabase
- Sessions are automatically managed
- All app routes require authentication

The authentication system is now fully integrated and ready to use! 🎉
