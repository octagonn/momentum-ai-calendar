# Alert Spam Fix - "Million Messages" Issue

## The Problem 🚨

When device time was changed, users reported getting **"a million messages"** - the same alert appearing over and over:

```
"Login Session Invalid" alert
"Login Session Invalid" alert
"Login Session Invalid" alert
"Login Session Invalid" alert
... (repeating endlessly)
```

## Why This Happened

### Issue 1: Using `useState` Instead of `useRef`
```typescript
// ❌ WRONG - This resets on every render
const [hasShownTimeWarning, setHasShownTimeWarning] = useState(false);
```

**Problem**: 
- Component re-renders when `user` or `loading` state changes
- `useState` value can reset during re-renders
- Flag doesn't persist reliably
- Multiple renders = multiple alerts

### Issue 2: Multiple Code Paths Triggering Independently
The app had **4 different places** checking for invalid sessions:
1. Early session check in `loadUserProfile()`
2. RLS error handler in `loadUserProfile()`
3. RLS error handler in `createUserProfile()`
4. AppState listener on app resume

Each path had its own alert logic:
```typescript
// ❌ WRONG - Duplicated in 4 places
if (!hasShownTimeWarning) {
  setHasShownTimeWarning(true);
  Alert.alert(...);
}
```

**Problem**: Race conditions between these paths caused multiple alerts

### Issue 3: No Debouncing
No timestamp checking meant rapid successive calls would all show alerts

## The Solution ✅

### Fix 1: Use `useRef` Instead of `useState`
```typescript
// ✅ CORRECT - Persists across renders
const hasShownTimeWarning = useRef(false);
const lastWarningTime = useRef(0);
```

**Why this works**:
- `useRef` values persist for the component's entire lifetime
- Not tied to render cycles
- Survives state changes
- Guaranteed single source of truth

### Fix 2: Centralized Alert Function
```typescript
// ✅ CORRECT - Single function used everywhere
const showTimeWarningAlert = useCallback(() => {
  const now = Date.now();
  const timeSinceLastWarning = now - lastWarningTime.current;
  
  // Only show if we haven't shown it before, or if it's been more than 5 minutes
  if (!hasShownTimeWarning.current || timeSinceLastWarning > 5 * 60 * 1000) {
    hasShownTimeWarning.current = true;
    lastWarningTime.current = now;
    
    Alert.alert(
      'Login Session Invalid',
      'Your login session has expired, possibly due to incorrect device date/time settings. Please ensure your device time is set correctly and log in again.',
      [{ text: 'OK', onPress: () => {} }]
    );
  }
}, []);
```

**Why this works**:
- All 4 code paths call the same function
- No duplicate logic
- Consistent behavior everywhere
- Easy to maintain

### Fix 3: Timestamp-Based Debouncing
```typescript
const timeSinceLastWarning = now - lastWarningTime.current;

if (!hasShownTimeWarning.current || timeSinceLastWarning > 5 * 60 * 1000) {
  // Show alert
}
```

**Why this works**:
- Prevents alerts within 5-minute window
- Even if flag somehow resets, timestamp check prevents spam
- Allows re-showing after reasonable time period

### Fix 4: Proper Reset on Logout
```typescript
useEffect(() => {
  if (authUser) {
    loadUserProfile();
  } else {
    setUser(null);
    setLoading(false);
    // Reset warning flag when user logs out
    hasShownTimeWarning.current = false;
    lastWarningTime.current = 0;
  }
}, [authUser]);
```

**Why this works**:
- Clears flags when user successfully logs out
- Allows alert to show again after new login attempt
- Fresh state for new session

## Comparison

| Aspect | Before (useState) | After (useRef) |
|--------|------------------|----------------|
| **Alert Count** | Many (10+) | Exactly 1 |
| **Persistence** | Unreliable | Guaranteed |
| **Re-render Safe** | No | Yes |
| **Code Duplication** | 4 copies | 1 function |
| **Debouncing** | None | 5 minutes |
| **Reset Logic** | None | On logout |

## Code Flow

### Before (Broken) ❌
```
Time changed → App loads
  ↓
Path 1 detects error → Shows alert (count: 1)
  ↓
Re-render occurs (useState resets!)
  ↓
Path 2 detects error → Shows alert (count: 2)
  ↓
Re-render occurs (useState resets!)
  ↓
Path 1 detects error again → Shows alert (count: 3)
  ↓
... (continues indefinitely)
```

### After (Fixed) ✅
```
Time changed → App loads
  ↓
Path 1 detects error → Calls showTimeWarningAlert()
  ↓ (checks ref)
  ↓ (!hasShownTimeWarning.current === true)
  ↓
Shows alert (count: 1)
Sets hasShownTimeWarning.current = true
  ↓
Re-render occurs (ref persists!)
  ↓
Path 2 detects error → Calls showTimeWarningAlert()
  ↓ (checks ref)
  ↓ (hasShownTimeWarning.current === true)
  ↓
No alert shown (count: still 1)
  ↓
Done! Only 1 alert total
```

## Key Takeaways

### When to Use `useRef` vs `useState`

**Use `useRef` when:**
- ✅ Value needs to persist across renders
- ✅ Changing value shouldn't trigger re-render
- ✅ Need guaranteed single source of truth
- ✅ Implementing flags, counters, or timestamps
- ✅ Preventing duplicate operations

**Use `useState` when:**
- Value changes should trigger re-render
- Value is displayed in UI
- React needs to track value for diffing

### Example: Our Case
```typescript
// ✅ CORRECT - Flags don't need to trigger renders
const hasShownTimeWarning = useRef(false);
const lastWarningTime = useRef(0);

// ✅ CORRECT - These DO need to trigger renders
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
```

## Testing Verification

1. Change device time forward
2. Wait 3-5 seconds without tapping anything
3. **Verify**: Only ONE alert appears
4. Tap "OK"
5. **Verify**: No more alerts appear
6. Check console logs
7. **Verify**: No repeated error messages

## Common Mistakes to Avoid

### ❌ Don't do this:
```typescript
const [alertShown, setAlertShown] = useState(false);

if (!alertShown) {
  setAlertShown(true);
  Alert.alert(...); // May show multiple times!
}
```

### ✅ Do this instead:
```typescript
const alertShown = useRef(false);

if (!alertShown.current) {
  alertShown.current = true;
  Alert.alert(...); // Shows exactly once
}
```

## Related Issues This Fix Prevents

1. **Double Submission** - Same pattern can prevent double form submissions
2. **Duplicate API Calls** - Use refs to track in-flight requests
3. **Multiple Toasts** - Prevent toast/notification spam
4. **Event Handler Spam** - Debounce button clicks
5. **Animation Glitches** - Track animation state reliably

## Files Modified
- `providers/UserProvider.tsx` - Changed to useRef, added centralized function

## Documentation
- See `TIME_CHANGE_BLINKING_FIX.md` for complete context
- See `TIME_CHANGE_FIX.md` for technical details

---

**Status**: ✅ Fixed
**Issue**: "Million messages" alert spam
**Solution**: useRef + centralized function + debouncing
**Result**: Exactly 1 alert shown, no matter how many code paths trigger

