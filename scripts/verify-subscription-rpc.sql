-- Subscription RPC Function Verification Script
-- Run this in Supabase SQL Editor to verify the RPC function exists

-- ============================================================
-- 1. VERIFY RPC FUNCTION EXISTS
-- ============================================================

-- Check if upsert_subscription_event function exists
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'upsert_subscription_event';

-- ============================================================
-- 2. VERIFY SUBSCRIPTION ENUMS EXIST
-- ============================================================

-- Check if subscription_tier enum exists
SELECT 
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('subscription_tier', 'subscription_status')
GROUP BY t.typname;

-- ============================================================
-- 3. VERIFY USER_PROFILES TABLE HAS SUBSCRIPTION COLUMNS
-- ============================================================

-- Check subscription columns in user_profiles table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN (
    'subscription_tier',
    'subscription_status',
    'subscription_expires_at',
    'product_id',
    'subscription_id'
  )
ORDER BY column_name;

-- ============================================================
-- 4. VERIFY SUBSCRIPTIONS TABLE EXISTS
-- ============================================================

-- Check if subscriptions table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'subscriptions'
) AS subscriptions_table_exists;

-- ============================================================
-- 5. TEST THE RPC FUNCTION (Optional - requires authentication)
-- ============================================================
-- Uncomment and run this if you want to test the function
-- Note: This will only work if you're authenticated as a user
-- 
-- SELECT upsert_subscription_event(
--   'active'::subscription_status,
--   'premium'::subscription_tier,
--   'com.momentumaicalendar.premium.monthly',
--   NOW() + INTERVAL '30 days',
--   NULL,
--   'ios',
--   'sandbox'
-- );

