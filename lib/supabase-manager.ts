import { supabase } from './supabase-client';

export interface DatabaseStats {
  totalUsers: number;
  totalGoals: number;
  totalTasks: number;
  recentActivity: any[];
}

export interface UserManagement {
  users: any[];
  totalUsers: number;
  activeUsers: number;
}

export class SupabaseManager {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    this.supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  }

  // Database Statistics
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [goalsResult, tasksResult, usersResult] = await Promise.all([
        supabase.from('momentum_goals').select('count', { count: 'exact' }),
        supabase.from('momentum_tasks').select('count', { count: 'exact' }),
        supabase.auth.admin.listUsers()
      ]);

      return {
        totalUsers: usersResult.data?.users?.length || 0,
        totalGoals: goalsResult.count || 0,
        totalTasks: tasksResult.count || 0,
        recentActivity: []
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        totalUsers: 0,
        totalGoals: 0,
        totalTasks: 0,
        recentActivity: []
      };
    }
  }

  // User Management
  async getAllUsers(): Promise<UserManagement> {
    try {
      const { data: users, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching users:', error);
        return { users: [], totalUsers: 0, activeUsers: 0 };
      }

      const activeUsers = users?.filter(user => user.email_confirmed_at) || [];
      
      return {
        users: users || [],
        totalUsers: users?.length || 0,
        activeUsers: activeUsers.length
      };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return { users: [], totalUsers: 0, activeUsers: 0 };
    }
  }

  // Goals Management
  async getAllGoals() {
    try {
      const { data, error } = await supabase
        .from('momentum_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllGoals:', error);
      return [];
    }
  }

  // Tasks Management
  async getAllTasks() {
    try {
      const { data, error } = await supabase
        .from('momentum_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllTasks:', error);
      return [];
    }
  }

  // Database Health Check
  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('momentum_goals')
        .select('count', { count: 'exact' })
        .limit(1);

      return {
        status: error ? 'error' : 'healthy',
        message: error ? error.message : 'Database connection successful',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Authentication Settings
  async getAuthSettings() {
    try {
      // This would typically require admin access
      // For now, we'll return basic info
      return {
        emailConfirmations: true,
        passwordMinLength: 6,
        providers: ['email'],
        redirectUrls: [`${window.location.origin}/auth/callback`]
      };
    } catch (error) {
      console.error('Error getting auth settings:', error);
      return null;
    }
  }

  // Database Schema Info
  async getSchemaInfo() {
    try {
      // Get table information
      const tables = ['momentum_goals', 'momentum_tasks'];
      const schemaInfo: any = {};

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (!error && data) {
          schemaInfo[table] = {
            exists: true,
            columns: Object.keys(data[0] || {}),
            sampleData: data[0]
          };
        } else {
          schemaInfo[table] = {
            exists: false,
            error: error?.message
          };
        }
      }

      return schemaInfo;
    } catch (error) {
      console.error('Error getting schema info:', error);
      return {};
    }
  }

  // Clean up old data
  async cleanupOldData(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean up old completed tasks
      const { error: tasksError } = await supabase
        .from('momentum_tasks')
        .delete()
        .eq('status', 'completed')
        .lt('created_at', cutoffDate.toISOString());

      if (tasksError) {
        console.error('Error cleaning up old tasks:', tasksError);
      }

      return {
        success: !tasksError,
        message: tasksError ? tasksError.message : 'Cleanup completed successfully'
      };
    } catch (error) {
      console.error('Error in cleanupOldData:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Export data
  async exportData() {
    try {
      const [goals, tasks] = await Promise.all([
        this.getAllGoals(),
        this.getAllTasks()
      ]);

      return {
        goals,
        tasks,
        exportDate: new Date().toISOString(),
        totalRecords: goals.length + tasks.length
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }
}

// Create singleton instance
export const supabaseManager = new SupabaseManager();
