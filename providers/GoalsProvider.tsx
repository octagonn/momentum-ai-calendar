import { useState, useEffect, useMemo, useCallback } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { Task } from "@/types/task";
import { Goal } from "@/types/goal";
import { supabase } from "@/lib/supabase-client";
import { getItem, setItem } from "@/lib/storage";
import { checkAndUpdateDayStreak } from "@/services/dayStreakService";

interface GoalsContextType {
  tasks: Task[];
  goals: Goal[];
  toggleTask: (taskId: string) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  addGoal: (goal: Goal, tasks?: any[]) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  isLoading: boolean;
  getTasksStats: () => {
    total: number;
    completed: number;
    weeklyProgress: number;
  };
  getGoalProgress: (goal: Goal) => number;
  getTodaysProgress: () => {
    totalTasks: number;
    completedTasks: number;
    progressPercentage: number;
  };
  refreshTasks: () => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const defaultTasks: Task[] = [];
const defaultGoals: Goal[] = [];

export const [GoalsProvider, useGoals] = createContextHook<GoalsContextType>(() => {
  const [localTasks, setLocalTasks] = useState<Task[]>(defaultTasks);
  const [localGoals, setLocalGoals] = useState<Goal[]>(defaultGoals);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Monitor auth state changes and clear data on user change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const newUserId = session?.user?.id || null;
        
        console.log('GoalsProvider: Auth state changed:', event, 'User ID:', newUserId);
        
        // If user changed (logout or different user login), clear all data
        if (currentUserId !== newUserId) {
          console.log('GoalsProvider: User changed from', currentUserId, 'to', newUserId);
          
          // Clear state immediately to prevent showing old user's data
          setLocalTasks([]);
          setLocalGoals([]);
          
          // Clear AsyncStorage
          setItem('tasks', JSON.stringify([])).catch(console.warn);
          setItem('goals', JSON.stringify([])).catch(console.warn);
          
          // Update current user ID - this will trigger data fetch via useEffect dependency
          setCurrentUserId(newUserId);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [currentUserId]);

  // Load initial data from AsyncStorage
  useEffect(() => {
    loadLocalData();
  }, []);

  // Set up real-time listener for goals
  useEffect(() => {
    const setupRealtimeListener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('GoalsProvider: No user, skipping realtime listener setup');
        return;
      }

      console.log('GoalsProvider: Setting up realtime listeners for user:', user.id);

      const goalsSubscription = supabase
        .channel('goals_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'goals',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Goals table changed:', payload);
            
            // Update local state immediately for better UX
            if (payload.eventType === 'UPDATE' && payload.new) {
              setLocalGoals(prevGoals => 
                prevGoals.map(goal => 
                  goal.id === payload.new.id ? { ...goal, ...payload.new } : goal
                )
              );
            } else if (payload.eventType === 'INSERT' && payload.new) {
              setLocalGoals(prevGoals => [...prevGoals, payload.new]);
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setLocalGoals(prevGoals => 
                prevGoals.filter(goal => goal.id !== payload.old.id)
              );
            }
            
            // Also refresh from database to ensure data consistency
            fetchGoalsFromSupabase();
          }
        )
        .subscribe();

      // Also listen to goal_progress view changes for immediate updates
      const goalProgressSubscription = supabase
        .channel('goal_progress_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'goal_progress',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Goal progress view changed:', payload);
            // Refresh goals when goal_progress view changes
            fetchGoalsFromSupabase();
          }
        )
        .subscribe();

      // Listen for changes to tasks
      const tasksSubscription = supabase
        .channel('tasks_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'tasks',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('Tasks table changed:', payload);
            console.log('Current local tasks count before update:', localTasks.length);
            
            // Update local state immediately for better UX
            if (payload.eventType === 'UPDATE' && payload.new) {
              setLocalTasks(prevTasks => {
                const updated = prevTasks.map(task => 
                  task.id === payload.new.id ? { ...task, ...payload.new } : task
                );
                console.log('Updated tasks after UPDATE:', updated.length);
                return updated;
              });
            } else if (payload.eventType === 'INSERT' && payload.new) {
              setLocalTasks(prevTasks => {
                const updated = [...prevTasks, payload.new];
                console.log('Updated tasks after INSERT:', updated.length);
                return updated;
              });
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setLocalTasks(prevTasks => {
                const updated = prevTasks.filter(task => task.id !== payload.old.id);
                console.log('Updated tasks after DELETE:', updated.length);
                return updated;
              });
            }
            
            // Also refresh from database to ensure data consistency
            fetchTasks();
            // Refresh goals to update completion ratios when tasks change
            fetchGoalsFromSupabase();
          }
        )
        .subscribe();

      return () => {
        goalsSubscription.unsubscribe();
        goalProgressSubscription.unsubscribe();
        tasksSubscription.unsubscribe();
      };
    };

    const cleanup = setupRealtimeListener();
    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const loadLocalData = async () => {
    try {
      // Load tasks from local storage (for backward compatibility)
      const savedTasks = await getItem("tasks");
      if (savedTasks !== null) {
        const parsedTasks = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          setLocalTasks(parsedTasks);
        }
      }

      // Load goals from Supabase instead of local storage
      await fetchGoalsFromSupabase();
    } catch (storageError) {
      console.warn("Storage load failed, using defaults:", storageError);
    }
  };

  const fetchGoalsFromSupabase = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, skipping goal fetch');
        return;
      }

      // Fetch from goals table directly to get plan field
      const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals from Supabase:', error);
        return;
      }

      if (!goals || goals.length === 0) {
        console.log('No goals found for user');
        setLocalGoals([]);
        return;
      }

      console.log(`Found ${goals.length} goals, calculating progress...`);

      // Fetch task counts for each goal to calculate progress
      const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
        const { data: tasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id, status')
          .eq('goal_id', goal.id);

        if (tasksError) {
          console.error('Error fetching tasks for goal:', tasksError);
        }

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          target_date: goal.target_date,
          status: goal.status,
          progress: progress,
          created_at: goal.created_at,
          updated_at: goal.updated_at,
          color: goal.color || '#3B82F6', // Default color if none
          plan: goal.plan, // Include plan for goal-generated tasks
        };
      }));

      console.log(`Setting ${goalsWithProgress.length} goals with progress`);
      setLocalGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error fetching goals from Supabase:', error);
    }
  }, []);

  // Fetch data from Supabase
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, skipping task fetch');
        return;
      }
      

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch tasks from Supabase:', error);
        return;
      }

      if (data) {
        // Convert Supabase data to our Task format
        const tasks = await Promise.all(data.map(async (task) => {
          // Try to find goal title from local goals first
          let goalTitle = localGoals.find(goal => goal.id === task.goal_id)?.title;
          
          // If not found locally, fetch from database
          if (!goalTitle && task.goal_id) {
            try {
              const { data: goalData, error } = await supabase
                .from('goals')
                .select('title')
                .eq('id', task.goal_id)
                .single();
              
              if (!error && goalData) {
                goalTitle = goalData.title;
              }
            } catch (error) {
              console.error('Error fetching goal title:', error);
            }
          }
          
          return {
            id: task.id,
            title: task.title,
            description: task.notes || '',
            completed: task.status === 'done',
            due_at: task.due_at,
            goal_id: task.goal_id,
            goalTitle: goalTitle || 'Untitled Goal', // Add goal title for notifications
            duration_minutes: task.duration_minutes,
          };
        }));
        
        setLocalTasks(tasks);
      }
    } catch (error) {
      console.warn('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('momentum_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch goals from Supabase:', error);
        return;
      }

      if (data) {
        // Convert Supabase data to our Goal format
        const goals = data.map(goal => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          current: goal.current_value,
          target: goal.target_value,
          unit: goal.unit,
          status: goal.status,
          plan: goal.plan,
          progress: goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0,
        }));
        setLocalGoals(goals);
      }
    } catch (error) {
      console.warn('Error fetching goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount and when user changes
  useEffect(() => {
    if (currentUserId) {
      console.log('GoalsProvider: Loading data for user:', currentUserId);
      fetchTasks();
      fetchGoalsFromSupabase();
    }
  }, [fetchTasks, fetchGoalsFromSupabase, currentUserId]);

  // Auto-cleanup overdue incomplete tasks after 1 week
  useEffect(() => {
    const cleanupOverdueTasks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Find overdue incomplete tasks older than 1 week
        const { data: overdueTasks, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .lt('due_at', oneWeekAgo.toISOString());

        if (error) {
          console.error('Error fetching overdue tasks for cleanup:', error);
          return;
        }

        if (overdueTasks && overdueTasks.length > 0) {
          // Delete the overdue tasks
          const taskIds = overdueTasks.map(task => task.id);
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .in('id', taskIds);

          if (deleteError) {
            console.error('Error deleting overdue tasks:', deleteError);
          } else {
            // Refresh tasks after cleanup
            fetchTasks();
          }
        }
      } catch (error) {
        console.error('Error in task cleanup process:', error);
      }
    };

    // Run cleanup when tasks are loaded
    if (tasks && tasks.length > 0) {
      cleanupOverdueTasks();
    }
  }, [tasks?.length, fetchTasks]);

  // Use local data
  const tasks = localTasks;
  const goals = localGoals;

  const toggleTask = useCallback(async (taskId: string) => {
    if (!tasks) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates = { completed: !task.completed };
    
    // Optimistic update
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    setLocalTasks(updatedTasks);
    
    // Save to local storage
    setItem('tasks', JSON.stringify(updatedTasks)).catch((error) => {
      console.error('Error saving tasks locally:', error);
    });

    // Update in Supabase
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: updates.completed ? 'done' : 'pending',
          completed_at: updates.completed ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) {
        console.error('Failed to update task in Supabase:', error);
        // Rollback optimistic update
        setLocalTasks(tasks);
        setItem('tasks', JSON.stringify(tasks)).catch(console.warn);
      } else {
        // Update goal progress if this task is linked to a goal
        const task = updatedTasks.find(t => t.id === taskId);
        if (task && task.goal_id) {
          const goalTasks = updatedTasks.filter(t => t.goal_id === task.goal_id);
          const completedGoalTasks = goalTasks.filter(t => t.completed || t.status === 'completed').length;
          const goalProgress = goalTasks.length > 0 ? Math.round((completedGoalTasks / goalTasks.length) * 100) : 0;
          
          // Update goal progress in database
          await supabase
            .from('goals')
            .update({ 
              status: goalProgress === 100 ? 'completed' : 'active'
            })
            .eq('id', task.goal_id);
        }

        // Check and update day streak when task is completed
        if (updates.completed) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await checkAndUpdateDayStreak(user.id);
          }
        }
        
        // Refresh goals to update completion ratios
        fetchGoalsFromSupabase();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Rollback optimistic update
      setLocalTasks(tasks);
      setItem('tasks', JSON.stringify(tasks)).catch(console.warn);
    }
  }, [tasks]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    if (!goals) return;
    
    // Optimistic update
    const updatedGoals = goals.map((g) =>
      g.id === goalId ? { ...g, ...updates } : g
    );
    setLocalGoals(updatedGoals);
    
    // Save to local storage
    setItem('goals', JSON.stringify(updatedGoals)).catch((error) => {
      console.error('Error saving goals locally:', error);
    });

    // Update in Supabase
    try {
      const supabaseUpdates: any = {};
      
      // Map our Goal format to Supabase goals table format
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.target_date !== undefined) supabaseUpdates.target_date = updates.target_date;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.color !== undefined) supabaseUpdates.color = updates.color;

      const { error } = await supabase
        .from('goals')
        .update(supabaseUpdates)
        .eq('id', goalId);

      if (error) {
        console.error('Failed to update goal in Supabase:', error);
        // Rollback optimistic update
        setLocalGoals(goals);
        setItem('goals', JSON.stringify(goals)).catch(console.warn);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      // Rollback optimistic update
      setLocalGoals(goals);
      setItem('goals', JSON.stringify(goals)).catch(console.warn);
    }
  }, [goals]);

  const addGoal = useCallback(async (newGoal: Goal, tasks?: any[]) => {
    if (!newGoal.title) {
      throw new Error('Goal must have title');
    }
    
    if (!goals) return;
    
    // Create optimistic goal with temporary ID
    const optimisticGoal = { ...newGoal, id: `temp-${Date.now()}` };
    const optimisticGoals = [...goals, optimisticGoal];
    setLocalGoals(optimisticGoals);
    
    // Save to local storage
    setItem('goals', JSON.stringify(optimisticGoals)).catch((error) => {
      console.error('Error saving new goal locally:', error);
    });

    // Create in Supabase
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert({
          title: newGoal.title,
          description: newGoal.description,
          status: newGoal.status || 'active',
          target_date: newGoal.target_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          color: newGoal.color || '#3B82F6', // Default blue color
          user_id: newGoal.user_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create goal in Supabase:', error);
        console.error('Goal data being inserted:', {
          title: newGoal.title,
          description: newGoal.description,
          category: newGoal.category,
          user_id: newGoal.user_id,
          target_value: newGoal.target_value,
          unit: newGoal.unit
        });
        // Rollback optimistic update
        setLocalGoals(goals);
        setItem('goals', JSON.stringify(goals)).catch(console.warn);
        throw error;
      }

      if (data) {
        // Replace optimistic goal with real data
        const realGoal = {
          id: data.id,
          title: data.title,
          description: data.description,
          current: data.current_value,
          target: data.target_value,
          unit: data.unit,
          status: data.status,
          plan: data.plan,
          progress: data.target_value > 0 ? Math.round((data.current_value / data.target_value) * 100) : 0,
        };
        
        const finalGoals = goals.map(g => g.id === optimisticGoal.id ? realGoal : g);
        setLocalGoals(finalGoals);
        setItem('goals', JSON.stringify(finalGoals)).catch(console.warn);

        // Create tasks if provided
        if (tasks && tasks.length > 0) {
          try {
            const tasksWithGoalId = tasks.map(task => ({
              ...task,
              goal_id: data.id,
              user_id: newGoal.user_id || data.user_id
            }));

            const { error: tasksError } = await supabase
              .from('momentum_tasks')
              .insert(tasksWithGoalId);

            if (tasksError) {
              console.error('Failed to create tasks:', tasksError);
            } else {
              console.log(`Created ${tasks.length} tasks for goal ${data.id}`);
              // Refresh tasks from database
              fetchTasks();
            }
          } catch (error) {
            console.error('Error creating tasks:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      // Rollback optimistic update
      setLocalGoals(goals);
      setItem('goals', JSON.stringify(goals)).catch(console.warn);
      throw error;
    }
  }, [goals]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!goals) return;
    
    // Optimistic update
    const updatedGoals = goals.filter(g => g.id !== goalId);
    setLocalGoals(updatedGoals);
    
    // Save to local storage
    setItem('goals', JSON.stringify(updatedGoals)).catch((error) => {
      console.error('Error saving goals locally:', error);
    });

    // Delete from Supabase
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        console.error('Failed to delete goal in Supabase:', error);
        // Rollback optimistic update
        setLocalGoals(goals);
        setItem('goals', JSON.stringify(goals)).catch(console.warn);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      // Rollback optimistic update
      setLocalGoals(goals);
      setItem('goals', JSON.stringify(goals)).catch(console.warn);
      throw error;
    }
  }, [goals]);

  const getTasksStats = useCallback(() => {
    if (!tasks) return { total: 0, completed: 0, weeklyProgress: 0 };
    
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const weeklyProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, weeklyProgress };
  }, [tasks]);

  // Enhanced progress tracking for goals
  const getGoalProgress = useCallback((goal: Goal) => {
    if (!tasks) return 0;
    
    // Calculate progress based on completed tasks for this goal
    const goalTasks = tasks.filter(task => task.goal_id === goal.id);
    if (goalTasks.length === 0) return 0;
    
    const completedTasks = goalTasks.filter(task => task.completed || task.status === 'completed').length;
    return Math.round((completedTasks / goalTasks.length) * 100);
  }, [tasks]);

  // Get today's progress across all goals
  const getTodaysProgress = useCallback(() => {
    if (!tasks) return { totalTasks: 0, completedTasks: 0, progressPercentage: 0 };
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get all tasks for today
    const todaysTasks = tasks.filter(task => {
      if (task.date) {
        return task.date === todayStr;
      }
      // Fallback for old task structure
      return task.time && task.time.includes(todayStr);
    });
    
    const totalTasks = todaysTasks.length;
    const completedTasks = todaysTasks.filter(task => task.completed || task.status === 'completed').length;
    
    return {
      totalTasks,
      completedTasks,
      progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }, [tasks]);

  const refreshGoals = useCallback(async () => {
    await fetchGoalsFromSupabase();
  }, [fetchGoalsFromSupabase]);

  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  return useMemo(() => ({
    tasks,
    goals,
    toggleTask,
    updateGoal,
    addGoal,
    deleteGoal,
    isLoading,
    getTasksStats,
    getGoalProgress,
    getTodaysProgress,
    refreshTasks,
    refreshGoals,
  }), [tasks, goals, isLoading, toggleTask, updateGoal, addGoal, deleteGoal, getTasksStats, getGoalProgress, getTodaysProgress, refreshTasks, refreshGoals]);
});