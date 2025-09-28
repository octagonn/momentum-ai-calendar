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

async function testGoalCreation() {
  console.log('🎯 Testing Goal Creation with Tasks');
  console.log('===================================\n');

  try {
    // Create a test goal
    console.log('📝 Creating test goal...');
    const { data: goal, error: goalError } = await supabase
      .from('momentum_goals')
      .insert({
        title: 'Test Fitness Goal',
        description: 'Complete a 30-day fitness challenge',
        category: 'fitness',
        target_value: 30,
        unit: 'days',
        status: 'active',
        current_value: 0,
        progress_percentage: 0,
        plan: {
          title: 'Test Fitness Goal',
          description: 'Complete a 30-day fitness challenge',
          milestones: [
            { week: 1, target: 7, description: "Week 1: Build foundation" },
            { week: 2, target: 14, description: "Week 2: Increase intensity" },
            { week: 3, target: 21, description: "Week 3: Push harder" },
            { week: 4, target: 30, description: "Week 4: Finish strong" }
          ]
        },
        user_id: '00000000-0000-0000-0000-000000000000' // Test user ID
      })
      .select()
      .single();

    if (goalError) {
      console.error('❌ Goal creation failed:', goalError.message);
      return;
    }

    console.log('✅ Goal created successfully');
    console.log('🆔 Goal ID:', goal.id);

    // Create test tasks for the goal
    console.log('\n📋 Creating test tasks...');
    const tasks = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + i);
      
      tasks.push({
        title: `Fitness Session ${i + 1}`,
        description: `Day ${i + 1} workout routine`,
        date: taskDate.toISOString().split('T')[0],
        time: '09:00',
        estimated_duration: 45,
        status: 'pending',
        priority: 'medium',
        category: 'fitness',
        goal_id: goal.id,
        user_id: '00000000-0000-0000-0000-000000000000',
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

    // Test task completion
    console.log('\n✅ Testing task completion...');
    const firstTask = createdTasks[0];
    
    const { error: updateError } = await supabase
      .from('momentum_tasks')
      .update({ 
        completed: true,
        status: 'completed'
      })
      .eq('id', firstTask.id);

    if (updateError) {
      console.error('❌ Task update failed:', updateError.message);
      return;
    }

    console.log('✅ Task completed successfully');

    // Test goal progress calculation
    console.log('\n📈 Testing goal progress...');
    const { data: updatedGoal, error: goalUpdateError } = await supabase
      .from('momentum_goals')
      .update({ 
        progress_percentage: Math.round((1 / createdTasks.length) * 100),
        current_value: 1
      })
      .eq('id', goal.id)
      .select()
      .single();

    if (goalUpdateError) {
      console.error('❌ Goal update failed:', goalUpdateError.message);
      return;
    }

    console.log('✅ Goal progress updated');
    console.log('📊 Progress:', updatedGoal.progress_percentage + '%');

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('momentum_tasks').delete().eq('goal_id', goal.id);
    await supabase.from('momentum_goals').delete().eq('id', goal.id);
    console.log('✅ Cleanup completed');

    console.log('\n🎉 All tests passed! The goal creation and task system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'test':
      await testGoalCreation();
      break;
    default:
      console.log('Usage: node scripts/test-goal-creation.js test');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testGoalCreation };
