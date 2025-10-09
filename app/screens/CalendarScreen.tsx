import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Dimensions,
  AppState,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase, createNewSupabaseClient } from '../../lib/supabase-client';
import GoalModal from '../components/GoalModal';

interface Task {
  id: string;
  title: string;
  notes?: string;
  due_at: string;
  duration_minutes?: number;
  status: 'pending' | 'done' | 'skipped';
  completed_at?: string;
  seq: number;
  goal_id: string;
  goal?: {
    id: string;
    title: string;
    description?: string;
    color?: string;
  };
}

interface Goal {
  id?: string;
  goal_id?: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  color?: string;
}

export default function CalendarScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showMonthView, setShowMonthView] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Animation values for swipe gestures
  const translateX = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const [isAnimating, setIsAnimating] = useState(false);
  const [gestureStartX, setGestureStartX] = useState(0);
  const [isGestureActive, setIsGestureActive] = useState(false);
  const [nextWeekDates, setNextWeekDates] = useState<Date[]>([]);
  const [showNextWeek, setShowNextWeek] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Month view animation values
  const monthTranslateX = useRef(new Animated.Value(0)).current;
  const [isMonthAnimating, setIsMonthAnimating] = useState(false);
  const [isMonthGestureActive, setIsMonthGestureActive] = useState(false);

  // Reset month view when currentDate changes
  useEffect(() => {
    if (showMonthView) {
      monthTranslateX.setValue(0);
      setIsMonthAnimating(false);
      setIsMonthGestureActive(false);
    }
  }, [currentDate, showMonthView]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      // Try to fetch with color field first, fallback to without color if it fails
      let { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          goal:goals(id, title, description, color)
        `)
        .eq('user_id', user.id)
        .order('due_at', { ascending: true });

      // If color field doesn't exist, try without it
      if (error && (error.message.includes('color does not exist') || error.message.includes('color') || error.message.includes('column') || error.message.includes('schema'))) {
        const fallbackResult = await supabase
        .from('tasks')
        .select(`
          *,
          goal:goals(id, title, description)
        `)
        .eq('user_id', user.id)
        .order('due_at', { ascending: true });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
        
        // Add default color to goals if color field is not available
        if (data) {
          data = data.map(task => ({
            ...task,
            goal: task.goal ? { ...task.goal, color: '#3B82F6' } : task.goal
          }));
        }
      }

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching goals:', error);
        return;
      }

      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchGoals()]);
      setLoading(false);
    };

    fetchData();
  }, [fetchTasks, fetchGoals]);

  // Enhanced polling mechanism as backup for real-time updates
  useEffect(() => {
    if (!user) return;

    // More frequent polling for critical updates
    const fastPollInterval = setInterval(() => {
      fetchGoals();
      fetchTasks();
    }, 10000); // Poll every 10 seconds for critical updates

    // Less frequent polling for general data consistency
    const slowPollInterval = setInterval(() => {
      fetchGoals();
      fetchTasks();
    }, 60000); // Poll every 60 seconds for general consistency

    return () => {
      clearInterval(fastPollInterval);
      clearInterval(slowPollInterval);
    };
  }, [user, fetchGoals, fetchTasks]);

  // Note: Task colors now reference goal colors directly from goals state
  // No need to update individual task colors anymore

  // Set up comprehensive Realtime listeners
  useEffect(() => {
    if (!user) return;

    // Listen for changes to tasks
    const tasksSubscription = supabase
      .channel('calendar_tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          // Update tasks state immediately for better UX
          if (payload.eventType === 'INSERT' && payload.new) {
            setTasks(prevTasks => [...prevTasks, payload.new]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setTasks(prevTasks => 
              prevTasks.map(task => 
                task.id === payload.new.id ? { ...task, ...payload.new } : task
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setTasks(prevTasks => 
              prevTasks.filter(task => task.id !== payload.old.id)
            );
          }
          
          // Also refresh to ensure data consistency
          fetchTasks();
        }
      )
      .subscribe();

    // Listen for changes to goals
    const goalsSubscription = supabase
      .channel('calendar_goals_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'goals',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          // Update goals state immediately for better UX
          if (payload.eventType === 'INSERT' && payload.new) {
            setGoals(prevGoals => [...prevGoals, payload.new]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setGoals(prevGoals => 
              prevGoals.map(goal => 
                (goal.id === payload.new.id || goal.goal_id === payload.new.id)
                  ? { ...goal, ...payload.new }
                  : goal
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setGoals(prevGoals => 
              prevGoals.filter(goal => 
                goal.id !== payload.old.id && goal.goal_id !== payload.old.id
              )
            );
          }
          
          // Also refresh to ensure data consistency
          fetchGoals();
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      goalsSubscription.unsubscribe();
    };
  }, [user, fetchTasks, fetchGoals]);

  // Refresh data when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && user) {
        // App has come to the foreground, refresh data
        fetchGoals();
        fetchTasks();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [user, fetchGoals, fetchTasks]);

  const handleTaskToggle = async (task: Task) => {
    if (!user) return;

    const newStatus = task.status === 'done' ? 'pending' : 'done';
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating task:', error);
        Alert.alert('Error', 'Failed to update task');
        return;
      }

      // Update local state
      setTasks(prev => 
        prev.map(t => 
          t.id === task.id 
            ? { ...t, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : undefined }
            : t
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleTaskToggleForModal = async (taskId: string, completed: boolean) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      await handleTaskToggle(task);
    }
  };

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const handleGoalUpdated = (updatedGoal: Goal) => {
    // Update goals state immediately
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        (goal.id === updatedGoal.id || goal.goal_id === updatedGoal.id)
          ? { ...goal, ...updatedGoal }
          : goal
      )
    );
    
    // Force complete calendar reload by refreshing data and triggering re-render
    fetchGoals();
    fetchTasks();
    
    // Trigger a calendar reload by updating the refresh key
    setRefreshKey(prev => prev + 1);
  };

  const getTasksForDate = (date: string) => {
    const filteredTasks = tasks.filter(task => {
      // Parse the task date and convert to local date string
      const taskDate = new Date(task.due_at);
      const taskDateString = taskDate.getFullYear() + '-' + 
        String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(taskDate.getDate()).padStart(2, '0');
      return taskDateString === date;
    });
    return filteredTasks;
  };

  // Get the week dates for the current week view
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday = 0
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  // Get all weeks in the current month
  const getMonthWeeks = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the starting day of the week (0 = Sunday)
    const startDay = firstDay.getDay();
    
    // Get the number of days in the month
    const daysInMonth = lastDay.getDate();
    
    // Calculate how many weeks we need
    const totalDays = startDay + daysInMonth;
    const weeksNeeded = Math.ceil(totalDays / 7);
    
    const weeks = [];
    
    // Start from the first Sunday of the month (or before)
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() - startDay);
    
    for (let week = 0; week < weeksNeeded; week++) {
      const weekDates = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(firstSunday);
        date.setDate(firstSunday.getDate() + (week * 7) + day);
        weekDates.push(date);
      }
      weeks.push(weekDates);
    }
    
    return weeks;
  };

  // Get event count for a specific date
  const getEventCountForDate = (date: Date) => {
    const dateString = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    return getTasksForDate(dateString).length;
  };

  // Format date for display
  const formatDateForDisplay = (date: Date) => {
    return date.getDate().toString();
  };

  // Format month and year for header
  const formatMonthYear = (date: Date) => {
    return {
      month: date.toLocaleDateString('en-US', { month: 'long' }),
      year: date.getFullYear().toString()
    };
  };



  // Handle month name click
  const handleMonthClick = () => {
    setShowMonthView(!showMonthView);
    // Reset month animation when opening/closing
    if (!showMonthView) {
      monthTranslateX.setValue(0);
      setIsMonthAnimating(false);
      setIsMonthGestureActive(false);
    }
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (isMonthAnimating) return;
    setIsMonthAnimating(true);
    
    const currentTranslation = monthTranslateX._value;
    const remainingDistance = screenWidth - currentTranslation;
    const duration = Math.max(600, (remainingDistance / screenWidth) * 800);
    
    
    Animated.timing(monthTranslateX, {
      toValue: screenWidth,
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      // Update the date
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setCurrentDate(newDate);
      
      // Reset position immediately
      monthTranslateX.setValue(0);
      setIsMonthAnimating(false);
    });
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (isMonthAnimating) return;
    setIsMonthAnimating(true);
    
    const currentTranslation = monthTranslateX._value;
    const remainingDistance = screenWidth + currentTranslation;
    const duration = Math.max(600, (remainingDistance / screenWidth) * 800);
    
    
    Animated.timing(monthTranslateX, {
      toValue: -screenWidth,
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      // Update the date
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setCurrentDate(newDate);
      
      // Reset position immediately
      monthTranslateX.setValue(0);
      setIsMonthAnimating(false);
    });
  };

  // Navigate to previous week/month
  const goToPreviousWeek = () => {
    if (isAnimating) {
      return;
    }
    setIsAnimating(true);
    
    // Get current position and continue sliding to the right
    const currentTranslation = translateX._value;
    const remainingDistance = screenWidth - currentTranslation;
    const duration = Math.max(800, (remainingDistance / screenWidth) * 1200);
    
    
    // Continue sliding from current position to complete the transition
    Animated.timing(translateX, {
      toValue: screenWidth,
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      // Update the date
      const newDate = new Date(currentDate);
      if (showMonthView) {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setDate(newDate.getDate() - 7);
        
        // Update selectedDate to maintain the same weekday
    if (selectedDate) {
          // Parse the date string as local date to avoid timezone issues
          const [year, month, day] = selectedDate.split('-').map(Number);
          const currentSelectedDate = new Date(year, month - 1, day);
          
          // Calculate the new selected date by subtracting 7 days (going to previous week)
          const newSelectedDate = new Date(currentSelectedDate);
          newSelectedDate.setDate(currentSelectedDate.getDate() - 7);
          
          const newYear = newSelectedDate.getFullYear();
          const newMonth = String(newSelectedDate.getMonth() + 1).padStart(2, '0');
          const newDay = String(newSelectedDate.getDate()).padStart(2, '0');
          const newDateString = `${newYear}-${newMonth}-${newDay}`;
          setSelectedDate(newDateString);
        }
      }
      setCurrentDate(newDate);
      
      // Clean up next week display
      setShowNextWeek(false);
      setSwipeDirection(null);
      setIsAnimating(false);
    });
  };

  // Navigate to next week/month
  const goToNextWeek = () => {
    if (isAnimating) {
      return;
    }
    setIsAnimating(true);
    
    // Get current position and continue sliding to the left
    const currentTranslation = translateX._value;
    const remainingDistance = screenWidth + currentTranslation;
    const duration = Math.max(800, (remainingDistance / screenWidth) * 1200);
    
    
    // Continue sliding from current position to complete the transition
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: duration,
      useNativeDriver: true,
    }).start(() => {
      // Update the date
      const newDate = new Date(currentDate);
      if (showMonthView) {
        newDate.setMonth(newDate.getMonth() + 1);
      } else {
        newDate.setDate(newDate.getDate() + 7);
        
        // Update selectedDate to maintain the same weekday
        if (selectedDate) {
          // Parse the date string as local date to avoid timezone issues
          const [year, month, day] = selectedDate.split('-').map(Number);
          const currentSelectedDate = new Date(year, month - 1, day);
          
          // Calculate the new selected date by adding 7 days (going to next week)
          const newSelectedDate = new Date(currentSelectedDate);
          newSelectedDate.setDate(currentSelectedDate.getDate() + 7);
          
          const newYear = newSelectedDate.getFullYear();
          const newMonth = String(newSelectedDate.getMonth() + 1).padStart(2, '0');
          const newDay = String(newSelectedDate.getDate()).padStart(2, '0');
          const newDateString = `${newYear}-${newMonth}-${newDay}`;
          setSelectedDate(newDateString);
        }
      }
      setCurrentDate(newDate);
      
      // Clean up next week display
      setShowNextWeek(false);
      setSwipeDirection(null);
      setIsAnimating(false);
    });
  };

  // Handle swipe gesture - follow finger in real-time
  const onGestureEvent = (event: any) => {
    if (isGestureActive && !isAnimating) {
      const { translationX } = event.nativeEvent;
      
      // Show next week when swiping starts
      if (Math.abs(translationX) > 20 && !showNextWeek) {
        if (translationX > 0) {
          // Swiping right - show previous week
          const newDate = new Date(currentDate);
          newDate.setDate(newDate.getDate() - 7);
          setNextWeekDates(getWeekDatesForDate(newDate));
          setSwipeDirection('right');
        } else {
          // Swiping left - show next week
          const newDate = new Date(currentDate);
          newDate.setDate(newDate.getDate() + 7);
          setNextWeekDates(getWeekDatesForDate(newDate));
          setSwipeDirection('left');
        }
        setShowNextWeek(true);
      }
      
      // Directly set the translation value to follow finger
      translateX.setValue(translationX);
    }
  };

  const onHandlerStateChange = (event: any) => {
    const { state, translationX, velocityX, x } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      // Gesture started - record starting position
      setGestureStartX(x);
      setIsGestureActive(true);
      translateX.setValue(0);
      setShowNextWeek(false);
      setSwipeDirection(null);
    } else if (state === State.ACTIVE) {
      // Finger is moving - week follows finger in real-time
      // This is handled in onGestureEvent
    } else if (state === State.END || state === State.CANCELLED) {
      // Finger lifted - decide whether to complete the swipe or snap back
      setIsGestureActive(false);
      
      const swipeThreshold = screenWidth * 0.25;
      const velocityThreshold = 500;
      
      
      if (translationX > swipeThreshold || velocityX > velocityThreshold) {
        // Swipe right - go to previous week
        goToPreviousWeek();
      } else if (translationX < -swipeThreshold || velocityX < -velocityThreshold) {
        // Swipe left - go to next week
        goToNextWeek();
      } else {
        // Snap back to original position
        setShowNextWeek(false);
        setSwipeDirection(null);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Get week dates for a specific date
  const getWeekDatesForDate = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday = 0
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      weekDates.push(weekDate);
    }
    return weekDates;
  };

  // Month view gesture handlers
  const onMonthGestureEvent = (event: any) => {
    if (isMonthGestureActive && !isMonthAnimating) {
      const { translationX } = event.nativeEvent;
      // Clamp the translation to prevent extreme values
      const clampedTranslation = Math.max(-screenWidth * 1.5, Math.min(screenWidth * 1.5, translationX));
      monthTranslateX.setValue(clampedTranslation);
    }
  };

  const onMonthHandlerStateChange = (event: any) => {
    const { state, translationX, velocityX } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      setIsMonthGestureActive(true);
      monthTranslateX.setValue(0);
    } else if (state === State.ACTIVE) {
      // Finger is moving - month follows finger in real-time
      // This is handled in onMonthGestureEvent
    } else if (state === State.END || state === State.CANCELLED) {
      // Finger lifted - decide whether to complete the swipe or snap back
      setIsMonthGestureActive(false);
      
      // Don't start new animation if one is already running
      if (isMonthAnimating) {
        return;
      }
      
      const swipeThreshold = screenWidth * 0.25;
      const velocityThreshold = 500;
      
      if (translationX > swipeThreshold || velocityX > velocityThreshold) {
        // Swipe right - go to previous month
        goToPreviousMonth();
      } else if (translationX < -swipeThreshold || velocityX < -velocityThreshold) {
        // Swipe left - go to next month
        goToNextMonth();
      } else {
        // Snap back to original position
        Animated.spring(monthTranslateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDurationText = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const tasksForSelectedDate = getTasksForDate(selectedDate);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading calendar...
        </Text>
      </View>
    );
  }

  const weekDates = getWeekDates();
  const { month, year } = formatMonthYear(currentDate);

  return (
    <View key={refreshKey} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        scrollEventThrottle={16}
      >
        {/* Canvas-style Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.yearText, { color: colors.textSecondary }]}>
              {year}
        </Text>
            <TouchableOpacity 
              style={styles.monthContainer}
              onPress={handleMonthClick}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthText, { color: colors.text }]}>
                {month}
              </Text>
              <ChevronDown 
                size={16} 
                color={colors.text} 
                style={[styles.chevronIcon, showMonthView && styles.chevronRotated]}
              />
            </TouchableOpacity>
          </View>
      </View>

      {/* Week View Calendar - only show when month is not expanded */}
      {!showMonthView && (
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <View style={styles.weekContainer}>
            {/* Days of the week */}
            <View style={styles.daysHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Text key={day} style={[styles.dayHeader, { color: colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>


            {/* Week dates with smooth sliding animation */}
            <View style={styles.weekSlidingContainer}>
              {/* Current week */}
              <Animated.View 
                style={[
                  styles.weekSlidingView,
                  { 
                    transform: [{ translateX }]
                  }
                ]}
              >
                <View style={styles.weekDates}>
                  {weekDates.map((date, index) => {
                    const dateString = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
                    const isSelected = dateString === selectedDate;
                    const eventCount = getEventCountForDate(date);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.dateContainer}
                        onPress={() => setSelectedDate(dateString)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.dateCircle,
                          isSelected && { backgroundColor: colors.primary },
                          !isCurrentMonth && styles.dateCircleInactive
                        ]}>
                          <Text style={[
                            styles.dateText,
                            { color: isSelected ? 'white' : (isCurrentMonth ? colors.text : colors.textSecondary) }
                          ]}>
                            {formatDateForDisplay(date)}
                          </Text>
                        </View>
                        
                        {/* Event indicators */}
                        {eventCount > 0 && (
                          <View style={styles.eventIndicators}>
                            {Array.from({ length: Math.min(eventCount, 3) }).map((_, dotIndex) => (
                              <View
                                key={dotIndex}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: colors.primary }
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>

              {/* Next week (shown during swipe) */}
              {showNextWeek && (
                <Animated.View 
                  style={[
                    styles.weekSlidingView,
                    { 
                      transform: [{ 
                        translateX: Animated.add(
                          translateX, 
                          swipeDirection === 'left' ? screenWidth : -screenWidth
                        ) 
                      }]
                    }
                  ]}
                >
                  <View style={styles.weekDates}>
                    {nextWeekDates.map((date, index) => {
                      const dateString = date.getFullYear() + '-' + 
                        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(date.getDate()).padStart(2, '0');
                      const isSelected = dateString === selectedDate;
                      const eventCount = getEventCountForDate(date);
                      const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.dateContainer}
                          onPress={() => setSelectedDate(dateString)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.dateCircle,
                            isSelected && { backgroundColor: colors.primary },
                            !isCurrentMonth && styles.dateCircleInactive
                          ]}>
                            <Text style={[
                              styles.dateText,
                              { color: isSelected ? 'white' : (isCurrentMonth ? colors.text : colors.textSecondary) }
                            ]}>
                              {formatDateForDisplay(date)}
                            </Text>
                          </View>
                          
                          {/* Event indicators */}
                          {eventCount > 0 && (
                            <View style={styles.eventIndicators}>
                              {Array.from({ length: Math.min(eventCount, 3) }).map((_, dotIndex) => (
                                <View
                                  key={dotIndex}
                                  style={[
                                    styles.eventDot,
                                    { backgroundColor: colors.primary }
                                  ]}
                                />
                              ))}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        </PanGestureHandler>
      )}

      {/* Month View (expanded weeks) */}
      {showMonthView && (
        <PanGestureHandler
          onGestureEvent={onMonthGestureEvent}
          onHandlerStateChange={onMonthHandlerStateChange}
        >
          <Animated.View 
            style={[
              styles.monthExpansionContainer,
              { 
                transform: [{ translateX: monthTranslateX }]
              }
            ]}
          >
            {/* Days of the week header */}
            <View style={styles.daysHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Text key={day} style={[styles.dayHeader, { color: colors.textSecondary }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* All weeks in the month */}
            {getMonthWeeks().map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                <View style={styles.weekDates}>
                  {week.map((date, dayIndex) => {
                    const dateString = date.getFullYear() + '-' + 
                      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(date.getDate()).padStart(2, '0');
                    const isSelected = dateString === selectedDate;
                    const eventCount = getEventCountForDate(date);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    
                    return (
                      <TouchableOpacity
                        key={dayIndex}
                        style={styles.dateContainer}
                        onPress={() => {
                          setSelectedDate(dateString);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.dateCircle,
                          isSelected && { backgroundColor: colors.primary },
                          !isCurrentMonth && styles.dateCircleInactive
                        ]}>
                          <Text style={[
                            styles.dateText,
                            { color: isSelected ? 'white' : (isCurrentMonth ? colors.text : colors.textSecondary) }
                          ]}>
                            {formatDateForDisplay(date)}
                          </Text>
                        </View>
                        
                        {/* Event indicators */}
                        {eventCount > 0 && (
                          <View style={styles.eventIndicators}>
                            {Array.from({ length: Math.min(eventCount, 3) }).map((_, dotIndex) => (
                              <View
                                key={dotIndex}
                                style={[
                                  styles.eventDot,
                                  { backgroundColor: colors.primary }
                                ]}
                              />
                            ))}
      </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </Animated.View>
        </PanGestureHandler>
      )}

        <View style={styles.tasksContainer}>
        <View style={[styles.selectedDateHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
          <CalendarIcon size={20} color={colors.primary} />
          <Text style={[styles.selectedDateText, { color: colors.text }]}>
            {(() => {
              // Parse the selected date string
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            })()}
          </Text>
        </View>

        {tasksForSelectedDate.length > 0 ? (
          <View style={styles.eventsList}>
            {tasksForSelectedDate.map((task) => {
              // Find the goal for this task from the goals state
              const taskGoal = goals.find(goal => 
                (goal.id === task.goal_id) || (goal.goal_id === task.goal_id)
              );
              const goalColor = taskGoal?.color || task.goal?.color || '#FF8C00';
              const goalTitle = taskGoal?.title || task.goal?.title || 'Unknown Goal';
              
              // Task colors now reference goal colors directly from goals state
              
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.eventCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  ]}
                  onPress={() => handleTaskToggle(task)}
                  activeOpacity={0.7}
                >
                  <View style={styles.eventContent}>
                    <View style={styles.eventCategoryContainer}>
                      <View style={[styles.eventColorIndicator, { backgroundColor: goalColor }]} />
                      <Text style={[styles.eventCategory, { color: goalColor }]}>
                        {goalTitle}
                      </Text>
                    </View>
                  
                      <Text
                        style={[
                      styles.eventTitle,
                          { color: colors.text },
                          task.status === 'done' && styles.completedText
                        ]}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>
                  
                  <View style={styles.eventFooter}>
                    <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                      {(() => {
                        const [year, month, day] = selectedDate.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                        return `${monthName} ${day}, ${year} at ${formatTime(task.due_at)}`;
                      })()}
                    </Text>
                    <Text style={[styles.eventSeparator, { color: colors.textSecondary }]}>
                      |
                      </Text>
                    <Text style={[styles.eventPoints, { color: colors.textSecondary }]}>
                      {task.duration_minutes ? `${Math.round(task.duration_minutes / 60 * 10)} points` : 'No duration'}
                      </Text>
                    </View>
                  </View>
                
                  <ChevronRight size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.pandaContainer}>
              <Text style={styles.pandaEmoji}>🐼</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Events Today!
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              It looks like a great day to rest, relax, and recharge.
            </Text>
          </View>
        )}
        </View>
      </ScrollView>

      <GoalModal
        visible={showGoalModal}
        goal={selectedGoal}
        onClose={() => setShowGoalModal(false)}
        onTaskToggle={handleTaskToggleForModal}
        onGoalUpdated={handleGoalUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  chevronIcon: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  weekContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    width: 40,
  },
  weekDates: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dateContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateCircleInactive: {
    opacity: 0.5,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  tasksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  eventsList: {
    gap: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  eventContent: {
    flex: 1,
  },
  eventCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventColorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  eventCategory: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 12,
    fontWeight: '400',
  },
  eventSeparator: {
    fontSize: 12,
    marginHorizontal: 8,
  },
  eventPoints: {
    fontSize: 12,
    fontWeight: '400',
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  pandaContainer: {
    marginBottom: 20,
  },
  pandaEmoji: {
    fontSize: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  // Month Expansion Styles
  monthExpansionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  weekRow: {
    marginBottom: 8,
  },
  swipeIndicator: {
    alignItems: 'center',
    marginBottom: 8,
  },
  swipeHint: {
    fontSize: 12,
    opacity: 0.6,
  },
  weekSlidingContainer: {
    overflow: 'hidden',
    position: 'relative',
    height: 80, // Fixed height to contain the week dates
  },
  weekSlidingView: {
    position: 'absolute',
    width: '100%',
    top: 0,
    left: 0,
    height: 80, // Match container height
  },
});
