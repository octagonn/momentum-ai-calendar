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

class AuthSetup {
  async testConnection() {
    try {
      console.log('🔗 Testing Supabase connection...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error('❌ Connection failed:', error.message);
        return false;
      }

      console.log('✅ Connection successful');
      return true;
    } catch (error) {
      console.error('❌ Connection error:', error.message);
      return false;
    }
  }

  async createTestUser() {
    try {
      console.log('👤 Creating test user...');
      
      const testEmail = 'test@example.com';
      const testPassword = 'testpassword123';

      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User'
          }
        }
      });

      if (error) {
        console.error('❌ User creation failed:', error.message);
        return false;
      }

      console.log('✅ Test user created successfully');
      console.log('📧 Email:', testEmail);
      console.log('🔑 Password:', testPassword);
      console.log('🆔 User ID:', data.user?.id);
      
      return true;
    } catch (error) {
      console.error('❌ User creation error:', error.message);
      return false;
    }
  }

  async testAuthentication() {
    try {
      console.log('🔐 Testing authentication...');
      
      const testEmail = 'test@example.com';
      const testPassword = 'testpassword123';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (error) {
        console.error('❌ Authentication failed:', error.message);
        return false;
      }

      console.log('✅ Authentication successful');
      console.log('🆔 User ID:', data.user?.id);
      console.log('📧 Email:', data.user?.email);
      console.log('✅ Email confirmed:', !!data.user?.email_confirmed_at);

      return true;
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      return false;
    }
  }

  async testUserProfile() {
    try {
      console.log('👤 Testing user profile access...');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .single();

      if (error) {
        console.error('❌ Profile access failed:', error.message);
        return false;
      }

      console.log('✅ User profile accessible');
      console.log('📊 Profile data:', {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        created_at: data.created_at
      });

      return true;
    } catch (error) {
      console.error('❌ Profile access error:', error.message);
      return false;
    }
  }

  async testGoalsAccess() {
    try {
      console.log('🎯 Testing goals access...');
      
      const { data, error } = await supabase
        .from('momentum_goals')
        .select('*');

      if (error) {
        console.error('❌ Goals access failed:', error.message);
        return false;
      }

      console.log('✅ Goals access successful');
      console.log('📊 Goals count:', data.length);

      return true;
    } catch (error) {
      console.error('❌ Goals access error:', error.message);
      return false;
    }
  }

  async cleanupTestUser() {
    try {
      console.log('🧹 Cleaning up test user...');
      
      // Sign out first
      await supabase.auth.signOut();
      
      console.log('✅ Cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Cleanup error:', error.message);
      return false;
    }
  }

  async runFullTest() {
    console.log('🚀 Running Authentication Setup Test');
    console.log('=====================================\n');

    const results = {
      connection: await this.testConnection(),
      userCreation: false,
      authentication: false,
      profileAccess: false,
      goalsAccess: false,
      cleanup: false
    };

    if (results.connection) {
      results.userCreation = await this.createTestUser();
      
      if (results.userCreation) {
        results.authentication = await this.testAuthentication();
        
        if (results.authentication) {
          results.profileAccess = await this.testUserProfile();
          results.goalsAccess = await this.testGoalsAccess();
        }
        
        results.cleanup = await this.cleanupTestUser();
      }
    }

    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Connection: ${results.connection ? '✅' : '❌'}`);
    console.log(`User Creation: ${results.userCreation ? '✅' : '❌'}`);
    console.log(`Authentication: ${results.authentication ? '✅' : '❌'}`);
    console.log(`Profile Access: ${results.profileAccess ? '✅' : '❌'}`);
    console.log(`Goals Access: ${results.goalsAccess ? '✅' : '❌'}`);
    console.log(`Cleanup: ${results.cleanup ? '✅' : '❌'}`);

    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! Authentication is properly configured.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
    }

    return allPassed;
  }
}

// CLI Interface
async function main() {
  const authSetup = new AuthSetup();
  const command = process.argv[2];

  switch (command) {
    case 'test':
      await authSetup.runFullTest();
      break;
    case 'connection':
      await authSetup.testConnection();
      break;
    case 'user':
      await authSetup.createTestUser();
      break;
    case 'auth':
      await authSetup.testAuthentication();
      break;
    case 'profile':
      await authSetup.testUserProfile();
      break;
    case 'goals':
      await authSetup.testGoalsAccess();
      break;
    case 'cleanup':
      await authSetup.cleanupTestUser();
      break;
    default:
      console.log('Available commands:');
      console.log('  test      - Run full authentication test');
      console.log('  connection - Test database connection');
      console.log('  user      - Create test user');
      console.log('  auth      - Test authentication');
      console.log('  profile   - Test profile access');
      console.log('  goals     - Test goals access');
      console.log('  cleanup   - Clean up test data');
      console.log('\nUsage: node scripts/setup-auth.js <command>');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AuthSetup;
