-- Force add color column to goals table
-- This migration will definitely add the color column

-- Drop the column if it exists and recreate it
DO $$ 
BEGIN
    -- Check if color column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goals' 
        AND column_name = 'color' 
        AND table_schema = 'public'
    ) THEN
        -- Column exists, do nothing
        RAISE NOTICE 'Color column already exists in goals table';
    ELSE
        -- Add the color column
        ALTER TABLE public.goals ADD COLUMN color TEXT DEFAULT '#3B82F6';
        RAISE NOTICE 'Color column added to goals table';
    END IF;
END $$;

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
