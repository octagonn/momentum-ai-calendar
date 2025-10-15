import { supabase } from '@/lib/supabase-client';

/**
 * Day Streak Service
 * 
 * Logic:
 * 1. Has tasks + completes them → Increment streak
 * 2. Has tasks + doesn't complete any → Break streak (reset to 0)
 * 3. No tasks for the day → No change (neither increment nor break)
 * 4. Starting from 0 → Must complete tasks on a day WITH tasks
 */

interface StreakData {
  dayStreak: number;
  lastStreakDate: string | null;
}

/**
 * Check and update user's day streak based on their task activity
 */
export async function checkAndUpdateDayStreak(userId: string): Promise<number> {
  try {
    // Get current streak data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('day_streak, last_streak_date')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile for streak:', profileError);
      return 0;
    }

    const currentStreak = profile.day_streak || 0;
    const lastStreakDate = profile.last_streak_date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    // If already updated today, return current streak
    if (lastStreakDate === todayString) {
      return currentStreak;
    }

    // Check if user has tasks for today
    const { data: todayTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, status, due_at')
      .eq('user_id', userId);

    if (tasksError) {
      console.error('Error fetching tasks for streak:', tasksError);
      return currentStreak;
    }

    // Filter tasks for today
    const tasksToday = (todayTasks || []).filter(task => {
      if (!task.due_at) return false;
      const taskDate = new Date(task.due_at);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime();
    });

    const hasTasks = tasksToday.length > 0;
    const hasCompletedTasks = tasksToday.some(task => task.status === 'done');

    // Determine new streak value
    let newStreak = currentStreak;
    let shouldUpdate = false;

    if (!hasTasks) {
      // No tasks today - no change to streak
      console.log('No tasks today, streak unchanged:', currentStreak);
      return currentStreak;
    }

    // Check if this is consecutive day
    const isConsecutiveDay = lastStreakDate 
      ? isYesterday(lastStreakDate, todayString)
      : false;

    if (hasCompletedTasks) {
      // User has tasks and completed at least one
      if (currentStreak === 0) {
        // Starting new streak
        newStreak = 1;
        shouldUpdate = true;
      } else if (isConsecutiveDay) {
        // Continuing streak
        newStreak = currentStreak + 1;
        shouldUpdate = true;
      } else if (!isConsecutiveDay && lastStreakDate) {
        // Missed days - restart streak
        newStreak = 1;
        shouldUpdate = true;
      }
    } else {
      // User has tasks but didn't complete any
      if (isConsecutiveDay || currentStreak > 0) {
        // Break the streak
        newStreak = 0;
        shouldUpdate = true;
      }
    }

    // Update database if needed
    if (shouldUpdate) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          day_streak: newStreak,
          last_streak_date: todayString,
          streak_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating streak:', updateError);
        return currentStreak;
      }

      console.log(`Streak updated: ${currentStreak} → ${newStreak}`);
      return newStreak;
    }

    return currentStreak;
  } catch (error) {
    console.error('Error in checkAndUpdateDayStreak:', error);
    return 0;
  }
}

/**
 * Check if date1 is yesterday compared to date2
 */
function isYesterday(date1String: string, date2String: string): boolean {
  const date1 = new Date(date1String);
  const date2 = new Date(date2String);
  
  const yesterday = new Date(date2);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return date1.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

/**
 * Validate and fix streak on app open
 * Checks if user missed days and breaks streak if needed
 */
export async function validateDayStreak(userId: string): Promise<number> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('day_streak, last_streak_date')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return 0;
    }

    const currentStreak = profile.day_streak || 0;
    const lastStreakDate = profile.last_streak_date;

    if (!lastStreakDate || currentStreak === 0) {
      return currentStreak;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];
    const lastDate = new Date(lastStreakDate);

    // Calculate days between
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // If more than 1 day has passed, check if we need to break the streak
    if (daysDiff > 1) {
      // Check if there were tasks on the missed days
      const startDate = new Date(lastDate);
      startDate.setDate(startDate.getDate() + 1);
      
      const { data: missedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status, due_at')
        .eq('user_id', userId)
        .gte('due_at', startDate.toISOString())
        .lt('due_at', today.toISOString());

      if (tasksError) {
        console.error('Error checking missed tasks:', tasksError);
        return currentStreak;
      }

      // Group tasks by date
      const tasksByDate: { [key: string]: any[] } = {};
      (missedTasks || []).forEach(task => {
        const taskDate = new Date(task.due_at);
        taskDate.setHours(0, 0, 0, 0);
        const dateKey = taskDate.toISOString().split('T')[0];
        
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(task);
      });

      // Check each missed day
      let shouldBreakStreak = false;
      
      for (let i = 1; i < daysDiff; i++) {
        const checkDate = new Date(lastDate);
        checkDate.setDate(checkDate.getDate() + i);
        const dateKey = checkDate.toISOString().split('T')[0];
        
        const dayTasks = tasksByDate[dateKey] || [];
        
        if (dayTasks.length > 0) {
          // Had tasks on this day
          const completedAny = dayTasks.some(t => t.status === 'done');
          if (!completedAny) {
            // Had tasks but didn't complete any - break streak
            shouldBreakStreak = true;
            break;
          }
        }
        // If no tasks, continue checking (don't break streak)
      }

      if (shouldBreakStreak) {
        // Reset streak
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            day_streak: 0,
            last_streak_date: null,
          })
          .eq('id', userId);

        if (!updateError) {
          console.log('Streak broken due to missed day with incomplete tasks');
          return 0;
        }
      }
    }

    return currentStreak;
  } catch (error) {
    console.error('Error in validateDayStreak:', error);
    return 0;
  }
}

/**
 * Get user's current streak
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('day_streak')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return 0;
    }

    return profile.day_streak || 0;
  } catch (error) {
    console.error('Error getting current streak:', error);
    return 0;
  }
}

