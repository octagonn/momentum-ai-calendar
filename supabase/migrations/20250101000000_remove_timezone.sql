-- Remove timezone column from profiles table
alter table public.profiles drop column if exists tz;
