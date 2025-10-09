-- Force add color column to goals table
-- This migration will add the color column if it doesn't exist

-- First, check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    -- Check if color column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goals' 
        AND column_name = 'color' 
        AND table_schema = 'public'
    ) THEN
        -- Add the color column
        ALTER TABLE public.goals ADD COLUMN color TEXT DEFAULT '#3B82F6';
        RAISE NOTICE 'Color column added to goals table';
    ELSE
        RAISE NOTICE 'Color column already exists in goals table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'goals' 
AND column_name = 'color' 
AND table_schema = 'public';
