import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Force schema refresh by creating a new client instance
const createFreshClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Schema-Version': Date.now().toString(),
        'X-Force-Refresh': 'true',
        'X-Skip-Cache': 'true'
      }
    },
    auth: {
      persistSession: true,
      storage: AsyncStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
};

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
  ? createFreshClient()
  : createFallbackClient();

// Export a function to get a fresh client instance
export const getFreshSupabaseClient = () => {
  return supabaseUrl && supabaseAnonKey ? createFreshClient() : createFallbackClient();
};

// Create a completely new client instance with different configuration
export const createNewSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return createFallbackClient();
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Schema-Version': Date.now().toString(),
        'X-Force-Refresh': 'true',
        'X-Skip-Cache': 'true',
        'X-No-Cache': 'true'
      }
    },
    auth: {
      persistSession: true,
      storage: AsyncStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
};

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