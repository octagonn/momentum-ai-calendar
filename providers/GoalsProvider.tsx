import { useState, useEffect, useMemo, useCallback } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { Task } from "@/types/task";
import { Goal } from "@/types/goal";
import { supabase } from "@/lib/supabase-client";
import { getItem, setItem } from "@/lib/storage";

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
}

const defaultTasks: Task[] = [];
const defaultGoals: Goal[] = [];

export const [GoalsProvider, useGoals] = createContextHook<GoalsContextType>(() => {
  console.log('GoalsProvider initializing');
  const [localTasks, setLocalTasks] = useState<Task[]>(defaultTasks);
  const [localGoals, setLocalGoals] = useState<Goal[]>(defaultGoals);

  // Load initial data from AsyncStorage
  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      const [savedTasks, savedGoals] = await Promise.all([
        getItem("tasks"),
        getItem("goals"),
      ]);
      if (savedTasks !== null) {
        const parsedTasks = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          setLocalTasks(parsedTasks);
        }
      }
      if (savedGoals !== null) {
        const parsedGoals = JSON.parse(savedGoals);
        if (Array.isArray(parsedGoals)) {
          setLocalGoals(parsedGoals);
        }
      }
    } catch (storageError) {
      console.warn("Storage load failed, using defaults:", storageError);
    }
  };

  // Fetch data from Supabase
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('momentum_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to fetch tasks from Supabase:', error);
        return;
      }

      if (data) {
        // Convert Supabase data to our Task format
        const tasks = data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          completed: task.completed,
          priority: task.priority,
          time: task.due_date, // Using due_date as time for now
          goalId: task.goal_id,
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

  // Load data on mount
  useEffect(() => {
    fetchTasks();
    fetchGoals();
  }, [fetchTasks, fetchGoals]);

  // Use local data
  const tasks = localTasks;
  const goals = localGoals;

  const toggleTask = useCallback(async (taskId: string) => {
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
        .from('momentum_tasks')
        .update({ 
          completed: updates.completed,
          status: updates.completed ? 'completed' : 'pending'
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
            .from('momentum_goals')
            .update({ 
              progress_percentage: goalProgress,
              current_value: completedGoalTasks
            })
            .eq('id', task.goal_id);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Rollback optimistic update
      setLocalTasks(tasks);
      setItem('tasks', JSON.stringify(tasks)).catch(console.warn);
    }
  }, [tasks]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
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
      
      // Map our Goal format to Supabase format
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.current !== undefined) supabaseUpdates.current_value = updates.current;
      if (updates.target !== undefined) supabaseUpdates.target_value = updates.target;
      if (updates.unit !== undefined) supabaseUpdates.unit = updates.unit;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.plan !== undefined) supabaseUpdates.plan = updates.plan;

      const { error } = await supabase
        .from('momentum_goals')
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
        .from('momentum_goals')
        .insert({
          title: newGoal.title,
          description: newGoal.description,
          category: newGoal.category || 'personal',
          current_value: newGoal.current_value || 0,
          target_value: newGoal.target_value,
          unit: newGoal.unit,
          status: newGoal.status || 'active',
          progress_percentage: newGoal.progress_percentage || 0,
          plan: newGoal.plan,
          user_id: newGoal.user_id,
          start_date: new Date().toISOString(),
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
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
        .from('momentum_goals')
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
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const weeklyProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, weeklyProgress };
  }, [tasks]);

  // Enhanced progress tracking for goals
  const getGoalProgress = useCallback((goal: Goal) => {
    // Calculate progress based on completed tasks for this goal
    const goalTasks = tasks.filter(task => task.goal_id === goal.id);
    if (goalTasks.length === 0) return 0;
    
    const completedTasks = goalTasks.filter(task => task.completed || task.status === 'completed').length;
    return Math.round((completedTasks / goalTasks.length) * 100);
  }, [tasks]);

  // Get today's progress across all goals
  const getTodaysProgress = useCallback(() => {
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
  }), [tasks, goals, toggleTask, updateGoal, addGoal, deleteGoal, isLoading, getTasksStats, getGoalProgress, getTodaysProgress]);
});