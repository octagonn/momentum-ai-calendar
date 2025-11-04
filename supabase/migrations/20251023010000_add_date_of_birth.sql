-- Add date of birth to user_profiles (optional)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN public.user_profiles.date_of_birth IS 'Optional: DOB to compute age for personalization';

