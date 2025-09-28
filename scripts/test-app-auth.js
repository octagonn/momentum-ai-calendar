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

class AppAuthTest {
  async testSignUp() {
    try {
      console.log('📝 Testing user signup...');
      
      const testEmail = `test-${Date.now()}@example.com`;
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
        console.error('❌ Signup failed:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Signup successful');
      console.log('📧 Email:', testEmail);
      console.log('🆔 User ID:', data.user?.id);
      console.log('✅ Email confirmed:', !!data.user?.email_confirmed_at);

      return { 
        success: true, 
        user: data.user, 
        email: testEmail, 
        password: testPassword 
      };
    } catch (error) {
      console.error('❌ Signup error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testSignIn(email, password) {
    try {
      console.log('🔐 Testing user signin...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        console.error('❌ Signin failed:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Signin successful');
      console.log('🆔 User ID:', data.user?.id);
      console.log('📧 Email:', data.user?.email);

      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Signin error:', error.message);
      return { success: false, error: error.message };
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
        return { success: false, error: error.message };
      }

      console.log('✅ Profile access successful');
      console.log('📊 Profile:', {
        id: data.id,
        email: data.email,
        full_name: data.full_name
      });

      return { success: true, profile: data };
    } catch (error) {
      console.error('❌ Profile access error:', error.message);
      return { success: false, error: error.message };
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
        return { success: false, error: error.message };
      }

      console.log('✅ Goals access successful');
      console.log('📊 Goals count:', data.length);

      return { success: true, goals: data };
    } catch (error) {
      console.error('❌ Goals access error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCreateGoal() {
    try {
      console.log('🎯 Testing goal creation...');
      
      const { data, error } = await supabase
        .from('momentum_goals')
        .insert({
          title: 'Test Goal',
          description: 'This is a test goal',
          category: 'personal',
          target_value: 100,
          unit: 'points'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Goal creation failed:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Goal creation successful');
      console.log('🆔 Goal ID:', data.id);
      console.log('📝 Title:', data.title);

      return { success: true, goal: data };
    } catch (error) {
      console.error('❌ Goal creation error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testSignOut() {
    try {
      console.log('🚪 Testing signout...');
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Signout failed:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ Signout successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Signout error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async runFullTest() {
    console.log('🚀 Running Complete App Authentication Test');
    console.log('==========================================\n');

    const results = {
      signup: false,
      signin: false,
      profile: false,
      goals: false,
      createGoal: false,
      signout: false
    };

    let testUser = null;

    // Test signup
    const signupResult = await this.testSignUp();
    results.signup = signupResult.success;
    if (signupResult.success) {
      testUser = signupResult;
    }

    if (results.signup) {
      // Test signin
      const signinResult = await this.testSignIn(testUser.email, testUser.password);
      results.signin = signinResult.success;

      if (results.signin) {
        // Test profile access
        const profileResult = await this.testUserProfile();
        results.profile = profileResult.success;

        // Test goals access
        const goalsResult = await this.testGoalsAccess();
        results.goals = goalsResult.success;

        // Test goal creation
        const createGoalResult = await this.testCreateGoal();
        results.createGoal = createGoalResult.success;

        // Test signout
        const signoutResult = await this.testSignOut();
        results.signout = signoutResult.success;
      }
    }

    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Signup: ${results.signup ? '✅' : '❌'}`);
    console.log(`Signin: ${results.signin ? '✅' : '❌'}`);
    console.log(`Profile: ${results.profile ? '✅' : '❌'}`);
    console.log(`Goals Access: ${results.goals ? '✅' : '❌'}`);
    console.log(`Create Goal: ${results.createGoal ? '✅' : '❌'}`);
    console.log(`Signout: ${results.signout ? '✅' : '❌'}`);

    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
      console.log('\n🎉 All authentication tests passed! The app is ready to use.');
    } else {
      console.log('\n⚠️  Some tests failed. Check the errors above.');
    }

    return allPassed;
  }
}

// CLI Interface
async function main() {
  const authTest = new AppAuthTest();
  const command = process.argv[2];

  switch (command) {
    case 'test':
      await authTest.runFullTest();
      break;
    case 'signup':
      await authTest.testSignUp();
      break;
    case 'signin':
      const email = process.argv[3];
      const password = process.argv[4];
      if (!email || !password) {
        console.log('Usage: npm run app-auth:signin <email> <password>');
        return;
      }
      await authTest.testSignIn(email, password);
      break;
    case 'profile':
      await authTest.testUserProfile();
      break;
    case 'goals':
      await authTest.testGoalsAccess();
      break;
    case 'create-goal':
      await authTest.testCreateGoal();
      break;
    case 'signout':
      await authTest.testSignOut();
      break;
    default:
      console.log('Available commands:');
      console.log('  test         - Run full authentication test');
      console.log('  signup       - Test user signup');
      console.log('  signin       - Test user signin (requires email and password)');
      console.log('  profile      - Test profile access');
      console.log('  goals        - Test goals access');
      console.log('  create-goal  - Test goal creation');
      console.log('  signout      - Test signout');
      console.log('\nUsage: node scripts/test-app-auth.js <command>');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AppAuthTest;
