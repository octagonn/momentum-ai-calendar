-- Admin-controlled premium override for friends/family/donors
-- Columns on user_profiles to activate a temporary or lifetime premium without App Store changes

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS admin_premium_tier subscription_tier,
  ADD COLUMN IF NOT EXISTS admin_premium_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_premium_notes TEXT,
  ADD COLUMN IF NOT EXISTS admin_premium_set_by TEXT;

COMMENT ON COLUMN public.user_profiles.admin_premium_tier IS 'When set with admin_premium_until in the future (or infinity), overrides to this tier.';
COMMENT ON COLUMN public.user_profiles.admin_premium_until IS 'Timestamp when admin premium expires. Use infinity for lifetime; NULL disables override.';
COMMENT ON COLUMN public.user_profiles.admin_premium_notes IS 'Optional reason/context for the override.';
COMMENT ON COLUMN public.user_profiles.admin_premium_set_by IS 'Identifier of admin who granted override.';

-- Helper function to check if the admin override is currently active
CREATE OR REPLACE FUNCTION public.is_admin_premium_active(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (up.admin_premium_tier IN ('premium','family')) AND
    (
      up.admin_premium_until = 'infinity'::timestamptz OR
      (up.admin_premium_until IS NOT NULL AND up.admin_premium_until > now())
    ),
    false
  )
  FROM public.user_profiles up
  WHERE up.id = p_user_id;
$$;

-- Helper function to grant an override using natural durations like '7 days' or 'lifetime'
CREATE OR REPLACE FUNCTION public.grant_admin_premium(
  p_user_id UUID,
  p_duration TEXT,               -- e.g., '7 days', '1 month', 'lifetime'
  p_tier subscription_tier DEFAULT 'premium',
  p_notes TEXT DEFAULT NULL,
  p_set_by TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_until TIMESTAMPTZ;
BEGIN
  IF lower(trim(p_duration)) IN ('lifetime','forever','infinite','permanent') THEN
    v_until := 'infinity'::timestamptz;
  ELSE
    v_until := now() + (p_duration)::interval;
  END IF;

  UPDATE public.user_profiles
  SET admin_premium_tier = p_tier,
      admin_premium_until = v_until,
      admin_premium_notes = p_notes,
      admin_premium_set_by = p_set_by,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Helper function to clear an override
CREATE OR REPLACE FUNCTION public.clear_admin_premium(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.user_profiles
  SET admin_premium_tier = NULL,
      admin_premium_until = NULL,
      admin_premium_notes = NULL,
      admin_premium_set_by = NULL,
      updated_at = now()
  WHERE id = p_user_id;
$$;

