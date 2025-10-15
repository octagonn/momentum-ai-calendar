-- Schedule automatic cleanup of old chat usage records
-- This requires pg_cron extension which Supabase provides

-- Enable pg_cron extension if not already enabled (Supabase has this by default)
-- Note: This might require superuser privileges on self-hosted instances
-- On Supabase hosted platform, pg_cron is pre-configured

-- Schedule cleanup to run every Monday at 1 AM UTC
-- This ensures we keep records for 4 weeks for analytics/auditing
SELECT cron.schedule(
  'cleanup-old-chat-usage',                    -- Job name
  '0 1 * * 1',                                  -- Cron schedule: Every Monday at 1 AM
  $$
    SELECT cleanup_old_chat_usage();
  $$
);

-- Schedule stats refresh every Sunday at 11:59 PM UTC (before week rollover)
SELECT cron.schedule(
  'refresh-weekly-chat-stats',                  -- Job name
  '59 23 * * 0',                                -- Cron schedule: Every Sunday at 11:59 PM
  $$
    SELECT refresh_chat_stats();
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Scheduled jobs for maintenance tasks';

