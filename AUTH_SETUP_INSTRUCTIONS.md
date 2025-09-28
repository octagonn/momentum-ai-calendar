# Authentication Setup Instructions

## 🔧 Required Configuration Update

**IMPORTANT**: You need to update your `.env` file to use the correct Supabase project URL.

### Current .env file has:
```
EXPO_PUBLIC_SUPABASE_URL=https://iwbetvsammuvubaememu.supabase.co
```

### Should be updated to:
```
EXPO_PUBLIC_SUPABASE_URL=https://tepmvenrjpqcblvavdew.supabase.co
```

## 📝 Steps to Update:

1. **Open your `.env` file** in the project root
2. **Change the URL** from `iwbetvsammuvubaememu` to `tepmvenrjpqcblvavdew`
3. **Save the file**
4. **Restart your development server**

## 🚀 After Updating .env:

Run these commands to test the authentication setup:

```bash
# Test database connection
npm run auth:connection

# Run full authentication test
npm run auth:test

# Create a test user
npm run auth:user

# Test user login
npm run auth:login
```

## ✅ What's Already Configured:

### **Database Schema:**
- ✅ `user_profiles` table created
- ✅ Foreign key relationships updated
- ✅ RLS policies optimized
- ✅ User signup trigger configured

### **Authentication Features:**
- ✅ Email/password authentication
- ✅ User profile management
- ✅ Automatic profile creation on signup
- ✅ Secure data access policies

### **Available Functions:**
- `get_current_user_profile()` - Get current user's profile
- `get_user_goals_with_profile()` - Get user's goals with profile info
- `handle_new_user()` - Auto-create profile on signup

## 🎯 Next Steps:

1. **Update .env file** (as described above)
2. **Test authentication** with the provided commands
3. **Start the app** and test the signup/login flow
4. **Verify** that users can create goals and tasks

## 🔍 Troubleshooting:

If you encounter issues:

1. **Check .env file** - Ensure URL is correct
2. **Restart server** - After changing .env
3. **Check console** - For detailed error messages
4. **Run tests** - Use the auth test commands

The authentication system is fully configured and ready to use once you update the .env file! 🎉
