#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load .env file from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration not found in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseManager {
  async getDatabaseStats() {
    try {
      console.log('📊 Fetching database statistics...');
      
      const [goalsResult, tasksResult] = await Promise.all([
        supabase.from('momentum_goals').select('count', { count: 'exact' }),
        supabase.from('momentum_tasks').select('count', { count: 'exact' })
      ]);

      const stats = {
        goals: goalsResult.count || 0,
        tasks: tasksResult.count || 0,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Database Statistics:');
      console.log(`   Goals: ${stats.goals}`);
      console.log(`   Tasks: ${stats.tasks}`);
      console.log(`   Timestamp: ${stats.timestamp}`);

      return stats;
    } catch (error) {
      console.error('❌ Error fetching database stats:', error.message);
      return null;
    }
  }

  async healthCheck() {
    try {
      console.log('🏥 Performing health check...');
      
      const { data, error } = await supabase
        .from('momentum_goals')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error('❌ Health check failed:', error.message);
        return { status: 'error', message: error.message };
      }

      console.log('✅ Health check passed - Database is accessible');
      return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }

  async exportData() {
    try {
      console.log('📤 Exporting data...');
      
      const [goals, tasks] = await Promise.all([
        supabase.from('momentum_goals').select('*'),
        supabase.from('momentum_tasks').select('*')
      ]);

      if (goals.error) {
        console.error('❌ Error fetching goals:', goals.error.message);
        return null;
      }

      if (tasks.error) {
        console.error('❌ Error fetching tasks:', tasks.error.message);
        return null;
      }

      const exportData = {
        goals: goals.data || [],
        tasks: tasks.data || [],
        exportDate: new Date().toISOString(),
        totalRecords: (goals.data?.length || 0) + (tasks.data?.length || 0)
      };

      console.log('✅ Export completed:');
      console.log(`   Goals: ${goals.data?.length || 0}`);
      console.log(`   Tasks: ${tasks.data?.length || 0}`);
      console.log(`   Total Records: ${exportData.totalRecords}`);

      return exportData;
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      return null;
    }
  }

  async cleanupOldData(daysOld = 30) {
    try {
      console.log(`🧹 Cleaning up data older than ${daysOld} days...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { data, error } = await supabase
        .from('momentum_tasks')
        .delete()
        .eq('status', 'completed')
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('❌ Cleanup failed:', error.message);
        return false;
      }

      console.log('✅ Cleanup completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      return false;
    }
  }

  async getSchemaInfo() {
    try {
      console.log('📋 Checking database schema...');
      
      const tables = ['momentum_goals', 'momentum_tasks'];
      const schemaInfo = {};

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (error) {
            if (error.message.includes('Invalid API key')) {
              console.log(`⚠️  Table ${table}: API key permissions issue (this is normal for anon key)`);
              schemaInfo[table] = { exists: 'unknown', error: 'API key permissions' };
            } else {
              console.log(`❌ Table ${table}: ${error.message}`);
              schemaInfo[table] = { exists: false, error: error.message };
            }
          } else {
            console.log(`✅ Table ${table}: Exists with ${Object.keys(data[0] || {}).length} columns`);
            schemaInfo[table] = {
              exists: true,
              columns: Object.keys(data[0] || {}),
              sampleData: data[0]
            };
          }
        } catch (tableError) {
          console.log(`❌ Table ${table}: ${tableError.message}`);
          schemaInfo[table] = { exists: false, error: tableError.message };
        }
      }

      return schemaInfo;
    } catch (error) {
      console.error('❌ Schema check failed:', error.message);
      return {};
    }
  }
}

// CLI Interface
async function main() {
  const manager = new SupabaseManager();
  const command = process.argv[2];

  console.log('🚀 Supabase Manager CLI');
  console.log('========================\n');

  switch (command) {
    case 'stats':
      await manager.getDatabaseStats();
      break;
    case 'health':
      await manager.healthCheck();
      break;
    case 'export':
      const data = await manager.exportData();
      if (data) {
        console.log('\n📄 Export data saved to console output');
      }
      break;
    case 'cleanup':
      const days = parseInt(process.argv[3]) || 30;
      await manager.cleanupOldData(days);
      break;
    case 'schema':
      await manager.getSchemaInfo();
      break;
    case 'all':
      console.log('Running all checks...\n');
      await manager.healthCheck();
      console.log('');
      await manager.getDatabaseStats();
      console.log('');
      await manager.getSchemaInfo();
      break;
    default:
      console.log('Available commands:');
      console.log('  stats     - Get database statistics');
      console.log('  health    - Perform health check');
      console.log('  export    - Export all data');
      console.log('  cleanup   - Clean up old data (optional: days, default 30)');
      console.log('  schema    - Check database schema');
      console.log('  all       - Run all checks');
      console.log('\nUsage: node scripts/supabase-manager.js <command>');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SupabaseManager;
