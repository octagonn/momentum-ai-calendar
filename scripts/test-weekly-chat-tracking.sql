-- Weekly Chat Tracking System - Testing Script
-- Run these queries in Supabase SQL Editor to test the system

-- ============================================================
-- 1. VERIFY DATABASE SETUP
-- ============================================================

-- Check if chat_usage table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'chat_usage'
) AS chat_usage_table_exists;

-- Check if functions exist
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_week_start', 'get_weekly_chat_count', 'can_create_chat', 'cleanup_old_chat_usage')
ORDER BY p.proname;

-- Check if scheduled jobs exist
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname IN ('cleanup-old-chat-usage', 'refresh-weekly-chat-stats');

-- ============================================================
-- 2. TEST HELPER FUNCTIONS
-- ============================================================

-- Test get_week_start() - Should return Sunday 00:00:00 UTC of current week
SELECT 
  get_week_start() as week_start,
  EXTRACT(DOW FROM get_week_start()) as day_of_week, -- Should be 0 (Sunday)
  get_week_start()::date as week_start_date;

-- Test get_weekly_chat_count() - Replace with actual user_id
-- SELECT get_weekly_chat_count('YOUR-USER-UUID-HERE');

-- Test can_create_chat() - Replace with actual user_id
-- SELECT can_create_chat('YOUR-USER-UUID-HERE');

-- ============================================================
-- 3. VIEW CURRENT WEEK DATA
-- ============================================================

-- See all chat usage records for current week
SELECT 
  cu.id,
  cu.user_id,
  u.email,
  cu.created_at,
  cu.created_at >= get_week_start() as is_current_week
FROM chat_usage cu
LEFT JOIN auth.users u ON cu.user_id = u.id
WHERE cu.created_at >= get_week_start()
ORDER BY cu.created_at DESC;

-- Count by user for current week
SELECT 
  cu.user_id,
  u.email,
  COUNT(*) as chat_count_this_week,
  up.subscription_tier
FROM chat_usage cu
LEFT JOIN auth.users u ON cu.user_id = u.id
LEFT JOIN user_profiles up ON cu.user_id = up.id
WHERE cu.created_at >= get_week_start()
GROUP BY cu.user_id, u.email, up.subscription_tier
ORDER BY chat_count_this_week DESC;

-- ============================================================
-- 4. TEST DATA INSERTION (Optional)
-- ============================================================

-- Insert test record for current user (REPLACE UUID)
/*
INSERT INTO chat_usage (user_id, created_at)
VALUES ('YOUR-USER-UUID-HERE', NOW());
*/

-- Insert multiple test records (REPLACE UUID)
/*
INSERT INTO chat_usage (user_id, created_at)
SELECT 
  'YOUR-USER-UUID-HERE',
  NOW() - (INTERVAL '1 hour' * generate_series(0, 9))
FROM generate_series(0, 9);
*/

-- ============================================================
-- 5. TEST WEEKLY RESET LOGIC
-- ============================================================

-- Insert test records from last week (REPLACE UUID)
/*
INSERT INTO chat_usage (user_id, created_at)
VALUES 
  ('YOUR-USER-UUID-HERE', get_week_start() - INTERVAL '1 day'),  -- Last Saturday
  ('YOUR-USER-UUID-HERE', get_week_start() - INTERVAL '2 days'), -- Last Friday
  ('YOUR-USER-UUID-HERE', get_week_start() - INTERVAL '3 days'); -- Last Thursday
*/

-- Verify last week's records DON'T count in current week
/*
SELECT 
  'Total records' as type,
  COUNT(*) as count
FROM chat_usage
WHERE user_id = 'YOUR-USER-UUID-HERE'

UNION ALL

SELECT 
  'Current week' as type,
  COUNT(*) as count
FROM chat_usage
WHERE user_id = 'YOUR-USER-UUID-HERE'
  AND created_at >= get_week_start()

UNION ALL

SELECT 
  'Last week' as type,
  COUNT(*) as count
FROM chat_usage
WHERE user_id = 'YOUR-USER-UUID-HERE'
  AND created_at < get_week_start()
  AND created_at >= get_week_start() - INTERVAL '7 days';
*/

-- ============================================================
-- 6. TEST LIMIT ENFORCEMENT
-- ============================================================

-- Check users at or near limit (free users only)
SELECT 
  u.id,
  u.email,
  get_weekly_chat_count(u.id) as chat_count,
  can_create_chat(u.id) as can_create,
  up.subscription_tier,
  CASE 
    WHEN get_weekly_chat_count(u.id) >= 10 THEN '🔴 At Limit'
    WHEN get_weekly_chat_count(u.id) >= 8 THEN '🟡 Warning'
    WHEN get_weekly_chat_count(u.id) >= 7 THEN '🟢 Approaching'
    ELSE '⚪ Safe'
  END as status
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE up.subscription_tier = 'free'
  AND get_weekly_chat_count(u.id) > 0
ORDER BY get_weekly_chat_count(u.id) DESC;

-- ============================================================
-- 7. TEST CLEANUP FUNCTION
-- ============================================================

-- Check records older than 4 weeks
SELECT 
  COUNT(*) as old_records_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_old_record
FROM chat_usage
WHERE created_at < NOW() - INTERVAL '4 weeks';

-- Dry run: See what would be deleted (doesn't actually delete)
SELECT 
  id,
  user_id,
  created_at,
  NOW() - created_at as age
FROM chat_usage
WHERE created_at < NOW() - INTERVAL '4 weeks'
ORDER BY created_at DESC;

-- Actually run cleanup (UNCOMMENT TO EXECUTE)
-- SELECT cleanup_old_chat_usage();

-- ============================================================
-- 8. ANALYTICS QUERIES
-- ============================================================

-- Weekly usage trends (last 4 weeks)
SELECT 
  date_trunc('week', created_at)::date as week_start,
  COUNT(*) as total_chats,
  COUNT(DISTINCT user_id) as unique_users,
  ROUND(COUNT(*)::numeric / COUNT(DISTINCT user_id), 2) as avg_chats_per_user
FROM chat_usage
WHERE created_at >= NOW() - INTERVAL '4 weeks'
GROUP BY date_trunc('week', created_at)
ORDER BY week_start DESC;

-- Distribution of chat usage (current week)
SELECT 
  chat_count,
  COUNT(*) as user_count
FROM (
  SELECT 
    user_id,
    get_weekly_chat_count(user_id) as chat_count
  FROM chat_usage
  WHERE created_at >= get_week_start()
  GROUP BY user_id
) subquery
GROUP BY chat_count
ORDER BY chat_count;

-- Premium vs Free usage comparison
SELECT 
  up.subscription_tier,
  COUNT(DISTINCT cu.user_id) as active_users,
  COUNT(*) as total_chats,
  ROUND(AVG(weekly_count), 2) as avg_chats_per_user
FROM (
  SELECT 
    user_id,
    get_weekly_chat_count(user_id) as weekly_count
  FROM chat_usage
  WHERE created_at >= get_week_start()
  GROUP BY user_id
) weekly
JOIN user_profiles up ON weekly.user_id = up.id
JOIN chat_usage cu ON weekly.user_id = cu.user_id 
  AND cu.created_at >= get_week_start()
GROUP BY up.subscription_tier;

-- ============================================================
-- 9. VERIFY ROW LEVEL SECURITY
-- ============================================================

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'chat_usage';

-- View RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'chat_usage';

-- ============================================================
-- 10. PERFORMANCE CHECK
-- ============================================================

-- Check indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'chat_usage'
ORDER BY indexname;

-- Estimate query performance (EXPLAIN)
EXPLAIN ANALYZE
SELECT get_weekly_chat_count('00000000-0000-0000-0000-000000000000');

-- ============================================================
-- SUMMARY
-- ============================================================

-- Overall system health check
SELECT 
  'Total Records' as metric,
  COUNT(*)::text as value
FROM chat_usage

UNION ALL

SELECT 
  'Current Week Records',
  COUNT(*)::text
FROM chat_usage
WHERE created_at >= get_week_start()

UNION ALL

SELECT 
  'Old Records (>4 weeks)',
  COUNT(*)::text
FROM chat_usage
WHERE created_at < NOW() - INTERVAL '4 weeks'

UNION ALL

SELECT 
  'Active Free Users This Week',
  COUNT(DISTINCT cu.user_id)::text
FROM chat_usage cu
JOIN user_profiles up ON cu.user_id = up.id
WHERE cu.created_at >= get_week_start()
  AND up.subscription_tier = 'free'

UNION ALL

SELECT 
  'Free Users At Limit',
  COUNT(*)::text
FROM user_profiles up
WHERE up.subscription_tier = 'free'
  AND get_weekly_chat_count(up.id) >= 10;

-- ============================================================
-- NOTES:
-- 
-- Replace 'YOUR-USER-UUID-HERE' with actual user UUIDs
-- Uncomment INSERT statements to add test data
-- Run SELECT queries first before DELETE operations
-- Check cron.job_run_details for scheduled job history
-- ============================================================

