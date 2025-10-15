-- Create chat_usage table to track AI chat usage for non-premium users
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_usage_user_id ON chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_created_at ON chat_usage(created_at);

-- Enable RLS
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own chat usage
CREATE POLICY "Users can view their own chat usage"
  ON chat_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own chat usage
CREATE POLICY "Users can insert their own chat usage"
  ON chat_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE chat_usage IS 'Tracks AI chat usage for non-premium users (10 chats per week limit)';

