# Apply Chat Tracking Migrations - Quick Guide

## 🚨 Error You're Seeing

```
Could not find the function public.get_weekly_chat_count(p_user_id) 
in the schema cache
```

**Cause**: Database migrations haven't been applied to your Supabase instance yet.

---

## ✅ Solution: Apply Migrations via Supabase Dashboard

### **Step 1: Open Supabase SQL Editor**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New query** button

---

### **Step 2: Apply Migration #1 - Helper Functions**

Copy and paste this entire SQL script:

```sql
-- Migration: Add chat usage helper functions
-- File: 20250115000000_add_chat_usage_helpers.sql

-- Function to get the start of the current week (Sunday at 00:00:00 UTC)
CREATE OR REPLACE FUNCTION get_week_start()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN date_trunc('week', NOW());
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get chat count for current week for a specific user
CREATE OR REPLACE FUNCTION get_weekly_chat_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  chat_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO chat_count
  FROM chat_usage
  WHERE user_id = p_user_id
    AND created_at >= get_week_start();
  
  RETURN COALESCE(chat_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can create a new chat (under weekly limit)
CREATE OR REPLACE FUNCTION can_create_chat(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  is_premium BOOLEAN;
  weekly_limit INTEGER := 10;
BEGIN
  -- Check if user is premium
  SELECT 
    CASE 
      WHEN subscription_tier IN ('premium', 'family') THEN true
      ELSE false
    END
  INTO is_premium
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Premium users have unlimited chats
  IF is_premium THEN
    RETURN true;
  END IF;
  
  -- Get current week's chat count
  current_count := get_weekly_chat_count(p_user_id);
  
  -- Check if under limit
  RETURN current_count < weekly_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to cleanup old chat usage records (older than 4 weeks)
CREATE OR REPLACE FUNCTION cleanup_old_chat_usage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete records older than 4 weeks to keep some history
  DELETE FROM chat_usage
  WHERE created_at < NOW() - INTERVAL '4 weeks';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION get_week_start() TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_chat_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_chat(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_week_start() IS 'Returns the start of the current week (Sunday at 00:00:00 UTC)';
COMMENT ON FUNCTION get_weekly_chat_count(UUID) IS 'Returns the number of chats used by a user in the current week';
COMMENT ON FUNCTION can_create_chat(UUID) IS 'Checks if a user can create a new chat based on their subscription and weekly limit';
COMMENT ON FUNCTION cleanup_old_chat_usage() IS 'Cleans up chat usage records older than 4 weeks';
```

**Then click "RUN" button** (bottom right)

✅ You should see: "Success. No rows returned"

---

### **Step 3: Verify Functions Were Created**

Create a new query and run this:

```sql
SELECT proname as function_name
FROM pg_proc 
WHERE proname IN ('get_week_start', 'get_weekly_chat_count', 'can_create_chat', 'cleanup_old_chat_usage');
```

**Expected Result:** 4 rows showing the function names

---

### **Step 4: Test the Functions**

Replace `YOUR-USER-UUID` with your actual user ID and run:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users LIMIT 1;

-- Then test (replace the UUID below)
SELECT get_weekly_chat_count('YOUR-USER-UUID');
SELECT can_create_chat('YOUR-USER-UUID');
```

**Expected Results:**
- First query returns a number (0-10)
- Second query returns `true` or `false`

---

### **Step 5: Apply Migration #2 - Scheduled Jobs (Optional)**

⚠️ **Note**: This requires pg_cron extension. On Supabase hosted, this might need to be enabled first.

If you want automatic cleanup (recommended but optional):

```sql
-- Enable pg_cron if not already enabled
-- Note: May require contacting Supabase support if not available

-- Schedule cleanup to run every Monday at 1 AM UTC
SELECT cron.schedule(
  'cleanup-old-chat-usage',
  '0 1 * * 1',
  'SELECT cleanup_old_chat_usage();'
);
```

If this fails, you can skip it - the app will still work. You'll just need to manually run cleanup occasionally:

```sql
SELECT cleanup_old_chat_usage();
```

---

## ✅ After Migration: Test in App

1. **Restart your app** (close and reopen)
2. **Go to AI Chat screen**
3. **Check console** - you should see:
   ```
   Chat usage this week: 0/10
   ```
4. **Send a test chat**
5. **Verify count increases** to 1/10

---

## 🐛 If Still Getting Errors

### Error: "relation 'chat_usage' does not exist"

This means the original chat_usage table migration wasn't applied. Run this first:

```sql
-- Create chat_usage table
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chat_usage_user_id ON chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_created_at ON chat_usage(created_at);

-- Enable RLS
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chat usage"
  ON chat_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat usage"
  ON chat_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE chat_usage IS 'Tracks AI chat usage for non-premium users';
```

Then go back and apply Step 2 again.

---

## 📞 Need Help?

If you're still having issues:

1. Check Supabase logs (Logs section in dashboard)
2. Verify you're running SQL as the correct role (postgres or service_role)
3. Make sure user_profiles table exists with subscription_tier column

---

## ✨ Success!

Once migrations are applied, your app will:
- ✅ Track chat usage in database
- ✅ Show usage bar for free users
- ✅ Automatically reset every Sunday
- ✅ Enforce 10 chat per week limit
- ✅ Allow unlimited chats for premium users

Refresh your app and test! 🎉

