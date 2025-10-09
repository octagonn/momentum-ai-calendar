-- Ensure color column exists in goals table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goals' 
        AND column_name = 'color' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.goals ADD COLUMN color TEXT DEFAULT '#3B82F6';
    END IF;
END $$;
