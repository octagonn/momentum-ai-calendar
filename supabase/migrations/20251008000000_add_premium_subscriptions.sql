-- Add subscription tier type
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'family');

-- Add subscription status type
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trialing');

-- Add subscription fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_tier subscription_tier DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS product_id text,
ADD COLUMN IF NOT EXISTS original_transaction_id text,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Create subscriptions table for tracking subscription history
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text NOT NULL,
  product_id text NOT NULL,
  original_transaction_id text,
  purchase_date timestamptz NOT NULL,
  expires_date timestamptz,
  status subscription_status NOT NULL DEFAULT 'active',
  tier subscription_tier NOT NULL DEFAULT 'premium',
  platform text NOT NULL DEFAULT 'ios',
  environment text NOT NULL DEFAULT 'production',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_user_profiles_subscription_tier ON public.user_profiles(subscription_tier);

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to check if user is premium
CREATE OR REPLACE FUNCTION is_user_premium(user_id uuid)
RETURNS boolean AS $$
DECLARE
  tier subscription_tier;
  status subscription_status;
  expires_at timestamptz;
BEGIN
  SELECT subscription_tier, subscription_status, subscription_expires_at
  INTO tier, status, expires_at
  FROM public.user_profiles
  WHERE id = user_id;
  
  -- Check if user has premium or family tier
  IF tier IN ('premium', 'family') AND status = 'active' THEN
    -- Check if subscription hasn't expired
    IF expires_at IS NULL OR expires_at > now() THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to count user's active goals
CREATE OR REPLACE FUNCTION count_user_active_goals(user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.goals
    WHERE goals.user_id = count_user_active_goals.user_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update goal_progress view to include subscription tier
DROP VIEW IF EXISTS public.goal_progress;
CREATE OR REPLACE VIEW public.goal_progress AS
SELECT
  g.id as goal_id,
  g.user_id,
  g.title,
  g.description,
  g.target_date,
  g.status,
  g.color,
  g.created_at,
  g.updated_at,
  count(t.*) filter (where t.status='done')::float / nullif(count(t.*),0) as completion_ratio,
  up.subscription_tier,
  is_user_premium(g.user_id) as is_premium
FROM goals g
LEFT JOIN tasks t ON t.goal_id = g.id
LEFT JOIN user_profiles up ON up.id = g.user_id
GROUP BY g.id, g.user_id, g.title, g.description, g.target_date, g.status, g.color, g.created_at, g.updated_at, up.subscription_tier;
