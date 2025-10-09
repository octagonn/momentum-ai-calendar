-- Add color field to goals table
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
