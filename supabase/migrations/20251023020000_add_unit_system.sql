-- Add preferred unit system to user_profiles
CREATE TYPE unit_system AS ENUM ('imperial', 'metric');

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS unit_system unit_system DEFAULT 'metric';

COMMENT ON COLUMN public.user_profiles.unit_system IS 'Preferred units for height/weight display';

