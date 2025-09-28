import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create a fallback for when Supabase is not configured
const createFallbackClient = () => {
  return {
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
      eq: () => ({ data: [], error: null }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  };
};

// Create Supabase client with fallback
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createFallbackClient();

// Test connection
export const testSupabaseConnection = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { connected: false, message: "Supabase not configured" };
  }

  try {
    const { data, error } = await supabase.from('momentum_goals').select('count').limit(1);
    if (error) {
      return { connected: false, message: `Connection error: ${error.message}` };
    }
    return { connected: true, message: "Successfully connected to Supabase" };
  } catch (error) {
    return { 
      connected: false, 
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};