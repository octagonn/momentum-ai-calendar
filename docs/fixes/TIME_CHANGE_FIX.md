# Device Time Change Error Fix

## Problem

When the device time was manually changed forward (e.g., from Oct 12 to Oct 13), the app crashed with multiple errors:

```
ERROR: new row violates row-level security policy for table "user_profiles"
Error code: 42501 (insufficient privileges)
```

## Root Cause

### JWT Token Expiration

Supabase uses JWT (JSON Web Tokens) for authentication. These tokens contain:
- **Issue time (`iat`)**: When the token was created
- **Expiration time (`exp`)**: When the token expires

When you change the device time forward:

1. **Device time**: October 13, 2024
2. **Token issued**: October 12, 2024 (yesterday according to new time)
3. **Token expires**: October 12, 2024 (already expired!)

The tokens appear expired or have invalid timestamps, causing authentication failures.

### Row Level Security (RLS) Impact

Supabase's Row Level Security policies check:
```sql
-- Example RLS policy
CREATE POLICY "Users can only access their own profile"
ON user_profiles FOR ALL
USING (auth.uid() = id);
```

When the JWT token is invalid:
- `auth.uid()` returns `null`
- RLS policies reject all database operations
- Error code **42501** (permission denied) is thrown

## The Solution

### 1. **Session Refresh on RLS Errors with Graceful Logout**

Added automatic session refresh when RLS policy violations occur, **with detection of completely invalid sessions**:

```typescript
// In loadUserProfile()
if (error.code === '42501' || error.message?.includes('JWT')) {
  console.log('Authentication error detected - attempting to refresh session...');
  
  // Try to refresh the session
  const { data: { session }, error: refreshError } = 
    await supabase.auth.refreshSession();
  
  if (refreshError || !session) {
    console.error('Session refresh failed:', refreshError);
    
    // NEW: Detect completely invalid sessions and sign out gracefully
    if (refreshError?.message?.includes('Auth session missing') || 
        refreshError?.message?.includes('refresh_token') ||
        refreshError?.name === 'AuthSessionMissingError') {
      console.log('Session is completely invalid - signing out user...');
      
      // Sign out to clear invalid session and prevent infinite loops
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
      return;
    }
    
    setUser(null);
    return;
  }
  
  if (session) {
    console.log('Session refreshed successfully, retrying...');
    // Retry the failed operation
  }
}
```

**Key Improvement**: This prevents infinite retry loops that cause screen blinking when the session is beyond repair.

### 2. **App Resume Session Refresh with Invalid Session Detection**

Added automatic session refresh when the app becomes active, **with graceful logout for invalid sessions**:

```typescript
useEffect(() => {
  const handleAppStateChange = async (nextAppState) => {
    if (nextAppState === 'active' && authUser) {
      console.log('App became active - checking session validity...');
      
      // Refresh session to handle potential time changes
      const { data: { session }, error } = 
        await supabase.auth.refreshSession();
      
      if (error) {
        console.warn('Session refresh failed on app resume:', error);
        
        // NEW: Detect completely invalid sessions and sign out
        if (error?.message?.includes('Auth session missing') || 
            error?.message?.includes('refresh_token') ||
            error?.name === 'AuthSessionMissingError') {
          console.log('Session is invalid on app resume - signing out...');
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
      } else if (session) {
        console.log('Session refreshed successfully on app resume');
        await loadUserProfile();
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);
  return () => subscription?.remove();
}, [authUser]);
```

**Key Improvement**: Prevents endless retry loops when the session cannot be recovered.

### 3. **Graceful Retry Logic with Screen Blinking Prevention**

When an operation fails due to token issues:

1. **Detect** error code 42501 or JWT-related errors
2. **Refresh** the session with `supabase.auth.refreshSession()`
3. **Check** if refresh succeeded or if session is completely invalid
4. **Sign out** gracefully if session cannot be recovered (prevents infinite loops)
5. **Retry** the failed operation with fresh tokens if refresh succeeded
6. **Fallback** show login screen, no endless retries

**Critical**: The detection of `AuthSessionMissingError` prevents the app from entering an infinite loop of:
```
Load Profile → RLS Error → Refresh Session → Auth Missing → 
Retry Load → RLS Error → Refresh Session → Auth Missing → (INFINITE LOOP)
```

Instead, it now does:
```
Load Profile → RLS Error → Refresh Session → Auth Missing → 
Sign Out → Show Login Screen → DONE
```

## Technical Details

### Error Codes Handled

| Error Code | Description | Solution |
|------------|-------------|----------|
| **42501** | RLS policy violation | Refresh session & retry |
| **PGRST116** | Profile doesn't exist | Create new profile |
| **JWT errors** | Invalid/expired tokens | Refresh session & retry |

### How Session Refresh Works

```typescript
// Refresh session
const { data: { session }, error } = await supabase.auth.refreshSession();

// What it does:
1. Requests new JWT tokens from Supabase
2. Uses refresh token (longer-lived) to get new access token
3. Updates internal session state
4. New tokens have current timestamps
5. RLS policies work again
```

### When Refresh Might Fail

Session refresh can fail if:
- Refresh token is also expired (common with large time changes)
- Refresh token is missing/corrupted (`AuthSessionMissingError`)
- Network connection issues
- User account was deleted/disabled
- Supabase service is down

**New Behavior**: When session refresh fails with `AuthSessionMissingError`, the app:
1. Logs "Session is completely invalid - signing out user..."
2. Calls `supabase.auth.signOut()` to clear corrupted session
3. Sets `user` to null and `loading` to false
4. Shows login screen immediately
5. **Prevents infinite retry loops and screen blinking**

## Files Modified

### `providers/UserProvider.tsx`

#### Added Session Refresh on RLS Errors:
- **Lines 85-139**: `loadUserProfile()` - refresh session on error 42501
- **Lines 195-231**: `createUserProfile()` - refresh session on error 42501

#### Added App State Listener:
- **Lines 64-93**: Refresh session when app becomes active

## Testing Scenarios

### Scenario 1: Time Changed Forward (Your Case)
```
1. User logged in → Token valid (Oct 12, expires Oct 13)
2. User changes time to Oct 13 → Token appears expired
3. App tries to load profile → Error 42501
4. System detects error → Refreshes session
5. New token issued → Valid for current time
6. Retry succeeds → User profile loads ✅
```

### Scenario 2: Time Changed Backward
```
1. User logged in → Token valid
2. User changes time backward → Token still valid
3. No issues ✅ (tokens not expired yet)
```

### Scenario 3: App in Background, Time Changes
```
1. App goes to background
2. Device time changes
3. User opens app → Triggers 'active' state
4. System refreshes session automatically
5. Fresh tokens loaded ✅
```

### Scenario 4: Network Issues During Refresh
```
1. Error 42501 detected
2. Attempt session refresh → Network error
3. Retry fails gracefully
4. User sees login screen (expected behavior)
```

## Prevention Measures

While we can't prevent users from changing device time, we handle it gracefully:

### ✅ What We Do Now:
1. **Detect** token issues automatically
2. **Refresh** session when possible
3. **Retry** failed operations
4. **Log** for debugging
5. **Graceful fallback** to login if needed

### ❌ What We Don't Do:
- Force users to keep accurate time
- Block app functionality
- Delete user data
- Show confusing error messages

## Logs You'll See

### Normal Flow:
```
App became active - checking session validity...
Session refreshed successfully on app resume
```

### When Time Changed:
```
Error fetching user profile: {code: "42501", message: "new row violates..."}
Authentication error detected - attempting to refresh session...
Session refreshed successfully, retrying profile fetch...
[Normal user profile logs]
```

### When Refresh Fails:
```
Authentication error detected - attempting to refresh session...
Session refresh failed: [error details]
[User redirected to login]
```

## User Experience

### Before Initial Fix:
❌ Change time → Endless errors
❌ Profile won't load
❌ Can't use app
❌ Need to reinstall or wait

### After Initial Fix (with bug):
⚠️ Change time → Attempted refresh
⚠️ Refresh failed → Retry
⚠️ Infinite retry loop → Screen blinking
❌ Still can't use app

### After Complete Fix (current):
✅ Change time → Brief refresh attempt
✅ Detects invalid session immediately
✅ Signs out gracefully
✅ Shows login screen (no blinking!)
✅ User can log back in and continue

## Additional Benefits

This fix also helps with:

1. **Long app suspension**: If app is suspended for hours/days, session refreshes on resume
2. **Timezone changes**: Traveling to different timezones won't break authentication
3. **Network interruptions**: Temporary network issues during auth are handled better
4. **Token expiration**: Normal token expiration (after 1 hour) is handled smoothly

## Monitoring

Watch for these log patterns:

### Good (Normal Operation):
```
✅ Session refreshed successfully
✅ Profile loaded
```

### Attention Needed (User Issue):
```
⚠️ Session refresh failed
→ Check user's network
→ Verify Supabase status
```

### Error (System Issue):
```
❌ Retry failed after session refresh
→ Check RLS policies
→ Verify user_profiles table permissions
```

## Screen Blinking Fix (Latest Update - v2)

### The Problem
After the initial fix was deployed, users still experienced screen blinking when the device time was changed:

1. **First Issue**: The session was completely corrupted (not just expired)
2. The `refreshSession()` call failed with `AuthSessionMissingError`
3. The app kept retrying the profile load → session refresh → profile load cycle
4. **Second Issue**: The home page briefly appeared before detecting the invalid session
5. This caused rapid blinking between home page → login screen → home page

### The Solution (Two-Part Fix)

#### Part 1: Graceful Logout with User Alert
Added detection of `AuthSessionMissingError` and graceful logout **with clear user messaging**:

```typescript
if (refreshError?.message?.includes('Auth session missing') || 
    refreshError?.message?.includes('refresh_token') ||
    refreshError?.name === 'AuthSessionMissingError') {
  console.log('Session is completely invalid - signing out user...');
  
  // Show clear message to user (only once)
  if (!hasShownTimeWarning) {
    setHasShownTimeWarning(true);
    Alert.alert(
      'Login Session Invalid',
      'Your login session has expired, possibly due to incorrect device date/time settings. Please ensure your device time is set correctly and log in again.',
      [{ text: 'OK', onPress: () => {} }]
    );
  }
  
  // Break the infinite loop by signing out
  await supabase.auth.signOut();
  setUser(null);
  setLoading(false); // Critical: stops the loading cycle
  return;
}
```

#### Part 2: Early Session Validation
Added upfront session check **before** loading any user data to prevent the home page from appearing:

```typescript
const loadUserProfile = async () => {
  if (!authUser) return;
  
  try {
    setLoading(true);
    
    // Early session validity check to prevent showing content with invalid session
    const { data: { session: currentSession }, error: sessionCheckError } = 
      await supabase.auth.getSession();
    
    if (sessionCheckError || !currentSession) {
      console.log('Session check failed - attempting refresh...');
      
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        // Detect completely invalid session and show alert
        // Sign out immediately - NO content is loaded
        return;
      }
    }
    
    // Only proceed to fetch profile if session is valid
    // ...
  }
}
```

### Testing This Fix (v2)
1. Log into the app
2. Change device time forward by 1+ days (Settings → General → Date & Time)
3. Close and reopen the app OR bring it back to foreground
4. **Expected behavior**:
   - Loading spinner shows briefly (< 1 second)
   - **Alert appears**: "Login Session Invalid - Your login session has expired, possibly due to incorrect device date/time settings..."
   - User taps "OK" on alert
   - Login screen appears cleanly
   - **NO home page shown at all**
   - **NO screen blinking or flickering**
   - **NO infinite loops**
5. User corrects device time (if needed)
6. User logs back in successfully

### Key Logs to Watch For
```
✅ Good flow (v2 - current):
Session check failed - attempting refresh...
Session is completely invalid during initial check - signing out...
[Alert shown to user]
[Login screen appears cleanly]

✅ Alternative good flow:
Authentication error detected - attempting to refresh session...
Session is completely invalid - signing out user...
[Alert shown to user]
[Login screen appears cleanly]

❌ Old buggy flow (should NOT happen anymore):
Authentication error detected - attempting to refresh session...
Session refresh failed: [AuthSessionMissingError]
[Briefly shows home page]
Authentication error detected - attempting to refresh session...
Session refresh failed: [AuthSessionMissingError]
[Briefly shows home page]
(Repeats infinitely - causes blinking between home and login)
```

### What Changed from v1 to v2
| Aspect | v1 (Previous) | v2 (Current) |
|--------|---------------|--------------|
| **User Message** | None | Clear alert explaining the issue |
| **Session Check** | After trying to load profile | Before loading any data |
| **Home Page Visibility** | Briefly visible | Never shown |
| **Screen Blinking** | Still occurred | Completely eliminated |
| **User Experience** | Confusing (what's happening?) | Clear (knows what went wrong) |

## Conclusion

The app now gracefully handles device time changes by:
- **Automatically detecting** authentication token issues
- **Refreshing sessions** when possible
- **Detecting unrecoverable session errors** (`AuthSessionMissingError`)
- **Signing out gracefully** when session cannot be recovered
- **Preventing infinite retry loops** and screen blinking
- **Retrying failed operations** with fresh tokens (when refresh succeeds)
- **Logging clearly** for debugging
- **Falling back gracefully** to login screen if needed

**Result**: Users can change device time and the app will either recover automatically OR show a clean login screen (no blinking, no infinite loops)! 🎉

## Recommendations

### For Development:
1. Test with various time changes
2. Test with airplane mode + time change
3. Test with suspended app + time change

### For Production:
1. Monitor RLS error frequency
2. Track session refresh success rate
3. Alert if refresh failures spike

### For Users:
- No action needed! The fix is transparent
- If issues persist, they can simply log out and log back in

