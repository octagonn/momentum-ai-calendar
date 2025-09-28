# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Choose a name and database password
5. Wait for the project to be created

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon/public key
3. Create a `.env` file in the root directory with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 3. Set Up the Database Schema

1. In your Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Run the SQL to create the tables and sample data

## 4. Test the Connection

Run the app with `npm run dev` and check if the goals load from Supabase.

## 5. Enable Row Level Security (Optional)

For production, you may want to set up proper RLS policies for user-specific data. The current setup allows public access for development.
