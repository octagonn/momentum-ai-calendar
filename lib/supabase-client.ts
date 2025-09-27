import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      momentum_goals: {
        Row: {
          id: string;
          title: string;
          description: string;
          current_value: number;
          target_value: number;
          unit: string;
          status: 'active' | 'paused' | 'completed';
          plan: any;
          start_date: string;
          target_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          current_value?: number;
          target_value: number;
          unit: string;
          status?: 'active' | 'paused' | 'completed';
          plan?: any;
          start_date?: string;
          target_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          current_value?: number;
          target_value?: number;
          unit?: string;
          status?: 'active' | 'paused' | 'completed';
          plan?: any;
          start_date?: string;
          target_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      momentum_tasks: {
        Row: {
          id: string;
          title: string;
          description: string;
          completed: boolean;
          priority: 'low' | 'medium' | 'high';
          due_date: string;
          goal_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          completed?: boolean;
          priority?: 'low' | 'medium' | 'high';
          due_date: string;
          goal_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          completed?: boolean;
          priority?: 'low' | 'medium' | 'high';
          due_date?: string;
          goal_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
