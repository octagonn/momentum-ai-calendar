import { useState, useEffect, useMemo, useCallback } from "react";
import { Platform } from "react-native";
import createContextHook from "@nkzw/create-context-hook";
import { useQueryClient } from "@tanstack/react-query";
import { Task } from "@/types/task";
import { Goal } from "@/types/goal";
import { trpc } from "@/lib/trpc";
import { getItem, setItem } from "@/lib/storage";

interface GoalsContextType {
  tasks: Task[];
  goals: Goal[];
  toggleTask: (taskId: string) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  addGoal: (goal: Goal) => Promise<void>;
  isLoading: boolean;
  getTasksStats: () => {
    total: number;
    completed: number;
    weeklyProgress: number;
  };
}

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Morning workout - Upper body",
    time: "7:00 AM - 8:00 AM",
    priority: "high",
    completed: true,
  },
  {
    id: "2",
    title: "Project review meeting",
    time: "10:00 AM - 11:00 AM",
    priority: "medium",
    completed: false,
  },
  {
    id: "3",
    title: 'Read 20 pages of "Atomic Habits"',
    time: "2:00 PM - 2:30 PM",
    priority: "low",
    completed: false,
  },
  {
    id: "4",
    title: "Weekly meal prep",
    time: "6:00 PM - 7:30 PM",
    priority: "medium",
    completed: true,
  },
  {
    id: "5",
    title: "Evening meditation",
    time: "9:00 PM - 9:15 PM",
    priority: "low",
    completed: true,
  },
];

const defaultGoals: Goal[] = [
  {
    id: "1",
    title: "Bench Press 225 lbs",
    description: "185 lbs / 225 lbs",
    current: 185,
    target: 225,
    unit: "lbs",
    status: "active",
    progress: 75,
  },
  {
    id: "2",
    title: "Read 24 Books This Year",
    description: "14 books / 24 books",
    current: 14,
    target: 24,
    unit: "books",
    status: "active",
    progress: 58,
  },
  {
    id: "3",
    title: "Learn Spanish",
    description: "90 days / 300 days",
    current: 90,
    target: 300,
    unit: "days",
    status: "paused",
    progress: 30,
  },
  {
    id: "4",
    title: "Run First Marathon",
    description: "26.2 miles completed!",
    current: 26.2,
    target: 26.2,
    unit: "miles",
    status: "completed",
    progress: 100,
  },
];

export const [GoalsProvider, useGoals] = createContextHook<GoalsContextType>(() => {
  console.log('GoalsProvider initializing');
  const queryClient = useQueryClient();
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

  // tRPC queries with fallback to local data
  const tasksQuery = trpc.tasks.getTasks.useQuery(undefined, {
    enabled: Platform.OS !== 'web', // Skip on web if Supabase not configured
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
  });

  const goalsQuery = trpc.goals.getGoals.useQuery(undefined, {
    enabled: Platform.OS !== 'web', // Skip on web if Supabase not configured
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
  });

  // Sync server data to local storage when available
  useEffect(() => {
    if (tasksQuery.data && Array.isArray(tasksQuery.data)) {
      setLocalTasks(tasksQuery.data);
      setItem('tasks', JSON.stringify(tasksQuery.data)).catch((e) => {
        console.warn('Failed to save tasks to local storage:', e);
      });
    }
  }, [tasksQuery.data]);

  useEffect(() => {
    if (goalsQuery.data && Array.isArray(goalsQuery.data)) {
      setLocalGoals(goalsQuery.data);
      setItem('goals', JSON.stringify(goalsQuery.data)).catch((e) => {
        console.warn('Failed to save goals to local storage:', e);
      });
    }
  }, [goalsQuery.data]);

  // Log query errors
  useEffect(() => {
    if (tasksQuery.error) {
      console.warn('Failed to fetch tasks from server:', tasksQuery.error);
    }
  }, [tasksQuery.error]);

  useEffect(() => {
    if (goalsQuery.error) {
      console.warn('Failed to fetch goals from server:', goalsQuery.error);
    }
  }, [goalsQuery.error]);

  // Use server data if available, otherwise fall back to local data
  const tasks = tasksQuery.data || localTasks;
  const goals = goalsQuery.data || localGoals;
  const isLoading = tasksQuery.isLoading || goalsQuery.isLoading;

  // Task update mutation with optimistic updates
  const updateTaskMutation = trpc.tasks.updateTask.useMutation({
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: [['tasks', 'getTasks']] });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData([['tasks', 'getTasks']]) as Task[] || localTasks;
      
      // Optimistically update
      const optimisticTasks = tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      );
      
      // Update query cache
      queryClient.setQueryData([['tasks', 'getTasks']], optimisticTasks);
      
      // Update local state and storage
      setLocalTasks(optimisticTasks);
      setItem('tasks', JSON.stringify(optimisticTasks)).catch((e) => {
        console.warn('Failed to save optimistic update to local storage:', e);
      });
      
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      console.error('Task update failed:', error);
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData([['tasks', 'getTasks']], context.previousTasks);
        setLocalTasks(context.previousTasks as Task[]);
        setItem('tasks', JSON.stringify(context.previousTasks)).catch(console.warn);
      }
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      if (Platform.OS !== 'web') {
        queryClient.invalidateQueries({ queryKey: [['tasks', 'getTasks']] });
      }
    },
  });

  const toggleTask = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates = { completed: !task.completed };
    
    if (Platform.OS !== 'web') {
      // Use tRPC mutation for server sync
      updateTaskMutation.mutate({ id: taskId, updates });
    } else {
      // Web-only: just update local state and storage
      const updatedTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      setLocalTasks(updatedTasks);
      setItem('tasks', JSON.stringify(updatedTasks)).catch((error) => {
        console.error('Error saving tasks:', error);
      });
    }
  }, [tasks, updateTaskMutation]);

  // Goal update mutation with optimistic updates
  const updateGoalMutation = trpc.goals.updateGoal.useMutation({
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: [['goals', 'getGoals']] });
      
      const previousGoals = queryClient.getQueryData([['goals', 'getGoals']]) as Goal[] || localGoals;
      
      const optimisticGoals = goals.map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal
      );
      
      queryClient.setQueryData([['goals', 'getGoals']], optimisticGoals);
      setLocalGoals(optimisticGoals);
      setItem('goals', JSON.stringify(optimisticGoals)).catch((e) => {
        console.warn('Failed to save optimistic goal update to local storage:', e);
      });
      
      return { previousGoals };
    },
    onError: (error, variables, context) => {
      console.error('Goal update failed:', error);
      if (context?.previousGoals) {
        queryClient.setQueryData([['goals', 'getGoals']], context.previousGoals);
        setLocalGoals(context.previousGoals as Goal[]);
        setItem('goals', JSON.stringify(context.previousGoals)).catch(console.warn);
      }
    },
    onSettled: () => {
      if (Platform.OS !== 'web') {
        queryClient.invalidateQueries({ queryKey: [['goals', 'getGoals']] });
      }
    },
  });

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    if (Platform.OS !== 'web') {
      updateGoalMutation.mutate({ id: goalId, updates });
    } else {
      const updatedGoals = goals.map((g) =>
        g.id === goalId ? { ...g, ...updates } : g
      );
      setLocalGoals(updatedGoals);
      setItem('goals', JSON.stringify(updatedGoals)).catch((error) => {
        console.error('Error saving goals:', error);
      });
    }
  }, [goals, updateGoalMutation]);

  // Add goal mutation
  const addGoalMutation = trpc.goals.createGoal.useMutation({
    onMutate: async (newGoal) => {
      await queryClient.cancelQueries({ queryKey: [['goals', 'getGoals']] });
      
      const previousGoals = queryClient.getQueryData([['goals', 'getGoals']]) as Goal[] || localGoals;
      // Create optimistic goal with temporary ID
      const optimisticGoal = { ...newGoal, id: `temp-${Date.now()}` };
      const optimisticGoals = [...goals, optimisticGoal];
      
      queryClient.setQueryData([['goals', 'getGoals']], optimisticGoals);
      setLocalGoals(optimisticGoals);
      setItem('goals', JSON.stringify(optimisticGoals)).catch((e) => {
        console.warn('Failed to save new goal to local storage:', e);
      });
      
      return { previousGoals };
    },
    onError: (error, variables, context) => {
      console.error('Add goal failed:', error);
      if (context?.previousGoals) {
        queryClient.setQueryData([['goals', 'getGoals']], context.previousGoals);
        setLocalGoals(context.previousGoals as Goal[]);
        setItem('goals', JSON.stringify(context.previousGoals)).catch(console.warn);
      }
    },
    onSettled: () => {
      if (Platform.OS !== 'web') {
        queryClient.invalidateQueries({ queryKey: [['goals', 'getGoals']] });
      }
    },
  });

  const addGoal = useCallback(async (newGoal: Goal) => {
    if (!newGoal.title) {
      throw new Error('Goal must have title');
    }
    
    if (Platform.OS !== 'web') {
      // Remove id for backend creation (backend generates it)
      const { id, ...goalData } = newGoal;
      addGoalMutation.mutate(goalData);
    } else {
      const updatedGoals = [...goals, newGoal];
      setLocalGoals(updatedGoals);
      setItem('goals', JSON.stringify(updatedGoals)).catch((error) => {
        console.error('Error saving new goal:', error);
        throw error;
      });
    }
  }, [goals, addGoalMutation]);

  const getTasksStats = useCallback(() => {
    const completed = tasks.filter((t) => t.completed).length;
    const total = tasks.length;
    const weeklyProgress = Math.round((completed / total) * 85); // Simulated weekly progress
    
    return { total, completed, weeklyProgress };
  }, [tasks]);

  return useMemo(() => ({
    tasks,
    goals,
    toggleTask,
    updateGoal,
    addGoal,
    isLoading,
    getTasksStats,
  }), [tasks, goals, toggleTask, updateGoal, addGoal, isLoading, getTasksStats]);
});