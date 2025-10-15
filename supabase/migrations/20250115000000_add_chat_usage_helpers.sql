-- Add helper functions and cleanup for chat_usage weekly tracking

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

-- Add a materialized view for quick weekly stats (optional, for analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS weekly_chat_stats AS
SELECT 
  user_id,
  date_trunc('week', created_at) as week_start,
  COUNT(*) as chat_count
FROM chat_usage
GROUP BY user_id, date_trunc('week', created_at);

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_weekly_chat_stats_user_week 
  ON weekly_chat_stats(user_id, week_start);

-- Function to refresh the stats view
CREATE OR REPLACE FUNCTION refresh_chat_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_chat_stats;
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
COMMENT ON MATERIALIZED VIEW weekly_chat_stats IS 'Aggregated weekly chat statistics for analytics';

