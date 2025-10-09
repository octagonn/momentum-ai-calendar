-- Final attempt to add color column to goals table
-- This migration will add the color column with a simple ALTER TABLE statement

-- Add color column to goals table
ALTER TABLE public.goals ADD COLUMN color TEXT DEFAULT '#3B82F6';

-- Update existing goals to have a default color if they don't have one
UPDATE public.goals SET color = '#3B82F6' WHERE color IS NULL;

-- Verify the column was added by selecting from it
SELECT 'Color column verification' as status, 
       CASE 
         WHEN EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'goals' 
           AND column_name = 'color' 
           AND table_schema = 'public'
         ) THEN 'EXISTS'
         ELSE 'MISSING'
       END as column_status;
