-- Add day streak fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS day_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_date DATE,
ADD COLUMN IF NOT EXISTS streak_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_streak_date ON public.user_profiles(last_streak_date);

-- Add comment
COMMENT ON COLUMN public.user_profiles.day_streak IS 'Current day streak count - increments when user completes tasks on days with scheduled tasks';
COMMENT ON COLUMN public.user_profiles.last_streak_date IS 'Last date the streak was updated (used to check consecutive days)';
COMMENT ON COLUMN public.user_profiles.streak_updated_at IS 'Timestamp of last streak update';

