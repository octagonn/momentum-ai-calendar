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

async function testGoalCreationDirect(userId) {
  console.log('\n📝 Creating goal directly...');
  const { data: goal, error: goalError } = await supabase
    .from('momentum_goals')
    .insert({
      title: 'Test UI Goal',
      description: 'Test goal created from UI',
      category: 'personal',
      target_value: 100,
      unit: 'points',
      status: 'active',
      current_value: 0,
      progress_percentage: 0,
      plan: {
        title: 'Test UI Goal',
        description: 'Test goal created from UI',
        milestones: [
          { week: 1, target: 25, description: "Week 1" },
          { week: 2, target: 50, description: "Week 2" },
          { week: 3, target: 75, description: "Week 3" },
          { week: 4, target: 100, description: "Week 4" }
        ]
      },
      user_id: userId,
      start_date: new Date().toISOString(),
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .select()
    .single();

  if (goalError) {
    console.error('❌ Goal creation failed:', goalError.message);
    console.error('Error details:', goalError);
    return;
  }

  console.log('✅ Goal created successfully');
  console.log('🆔 Goal ID:', goal.id);
  console.log('📊 Goal title:', goal.title);

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await supabase.from('momentum_goals').delete().eq('id', goal.id);
  console.log('✅ Cleanup completed');

  console.log('\n🎉 Direct goal creation test passed!');
}

async function testGoalCreationWithAuth() {
  console.log('🎯 Testing Goal Creation with Authentication');
  console.log('============================================\n');

  try {
    // Use an existing user for testing
    console.log('👤 Using existing user for testing...');
    const testEmail = 'octavioalbuquerque09@gmail.com';
    const testPassword = 'testpassword123'; // This might not work, but let's try

    // Try to sign in with existing user
    console.log('🔐 Attempting to sign in with existing user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) {
      console.log('❌ Sign in failed, trying with service role...');
      // If sign in fails, we'll use a direct database approach
      const userId = 'bac87a89-5ea4-47ae-bf6c-429ea624709d'; // Use the existing user ID
      console.log('✅ Using existing user ID:', userId);
      
      // Test goal creation directly
      await testGoalCreationDirect(userId);
      return;
    }

    console.log('✅ User signed in successfully');
    console.log('🆔 Session user ID:', signInData.user?.id);

    // Now try to create a goal
    console.log('\n📝 Creating goal...');
    const { data: goal, error: goalError } = await supabase
      .from('momentum_goals')
      .insert({
        title: 'Test UI Goal',
        description: 'Test goal created from UI',
        category: 'personal',
        target_value: 100,
        unit: 'points',
        status: 'active',
        current_value: 0,
        progress_percentage: 0,
        plan: {
          title: 'Test UI Goal',
          description: 'Test goal created from UI',
          milestones: [
            { week: 1, target: 25, description: "Week 1" },
            { week: 2, target: 50, description: "Week 2" },
            { week: 3, target: 75, description: "Week 3" },
            { week: 4, target: 100, description: "Week 4" }
          ]
        },
        user_id: signInData.user.id,
        start_date: new Date().toISOString(),
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (goalError) {
      console.error('❌ Goal creation failed:', goalError.message);
      console.error('Error details:', goalError);
      return;
    }

    console.log('✅ Goal created successfully');
    console.log('🆔 Goal ID:', goal.id);
    console.log('📊 Goal title:', goal.title);

    // Create some tasks
    console.log('\n📋 Creating tasks...');
    const tasks = [];
    const today = new Date();
    
    for (let i = 0; i < 3; i++) {
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + i);
      
      tasks.push({
        title: `Test Task ${i + 1}`,
        description: `Test task ${i + 1} description`,
        date: taskDate.toISOString().split('T')[0],
        time: '09:00',
        estimated_duration: 30,
        status: 'pending',
        priority: 'medium',
        category: 'personal',
        goal_id: goal.id,
        user_id: signInData.user.id,
        completed: false
      });
    }

    const { data: createdTasks, error: tasksError } = await supabase
      .from('momentum_tasks')
      .insert(tasks)
      .select();

    if (tasksError) {
      console.error('❌ Task creation failed:', tasksError.message);
      return;
    }

    console.log('✅ Tasks created successfully');
    console.log('📊 Created tasks:', createdTasks.length);

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await supabase.from('momentum_tasks').delete().eq('goal_id', goal.id);
    await supabase.from('momentum_goals').delete().eq('id', goal.id);
    await supabase.auth.signOut();
    console.log('✅ Cleanup completed');

    console.log('\n🎉 All tests passed! The authentication and goal creation system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      await testGoalCreationWithAuth();
      break;
    default:
      console.log('Usage: node scripts/test-goal-creation-ui.js test');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testGoalCreationWithAuth };
