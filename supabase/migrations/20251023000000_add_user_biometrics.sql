-- Add optional biometrics/demographics to user_profiles for better AI personalization
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age BETWEEN 10 AND 120),
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (char_length(gender) <= 64),
  ADD COLUMN IF NOT EXISTS height_cm INTEGER CHECK (height_cm BETWEEN 50 AND 250),
  ADD COLUMN IF NOT EXISTS weight_kg INTEGER CHECK (weight_kg BETWEEN 20 AND 500);

COMMENT ON COLUMN public.user_profiles.age IS 'Optional: used to personalize AI plans';
COMMENT ON COLUMN public.user_profiles.gender IS 'Optional: user-provided gender label';
COMMENT ON COLUMN public.user_profiles.height_cm IS 'Optional: height in centimeters';
COMMENT ON COLUMN public.user_profiles.weight_kg IS 'Optional: weight in kilograms';

