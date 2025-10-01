import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';
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
  };
}

interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
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

  const fetchTasks = useCallback(async () => {
    if (!user) return;

    console.log('Fetching tasks for user:', user.id);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          goal:goals(id, title, description)
        `)
        .eq('user_id', user.id)
        .order('due_at', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      console.log('Fetched tasks:', data?.length || 0, 'tasks');
      console.log('Sample task:', data?.[0]);
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

  // Set up Realtime listeners
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
        () => {
          console.log('Tasks changed, refreshing calendar...');
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
        () => {
          console.log('Goals changed, refreshing calendar...');
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      goalsSubscription.unsubscribe();
    };
  }, [user, fetchTasks, fetchGoals]);

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

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const getTasksForDate = (date: string) => {
    return tasks.filter(task => {
      // Parse the task date and convert to local date string
      const taskDate = new Date(task.due_at);
      const taskDateString = taskDate.getFullYear() + '-' + 
        String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(taskDate.getDate()).padStart(2, '0');
      console.log('Comparing dates:', { selectedDate: date, taskDate: taskDateString, taskDueAt: task.due_at });
      return taskDateString === date;
    });
  };

  const getMarkedDates = () => {
    const marked: any = {};
    
    tasks.forEach(task => {
      // Use the same date conversion logic as getTasksForDate
      const taskDate = new Date(task.due_at);
      const date = taskDate.getFullYear() + '-' + 
        String(taskDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(taskDate.getDate()).padStart(2, '0');
      
      const tasksForDate = getTasksForDate(date);
      const completedCount = tasksForDate.filter(t => t.status === 'done').length;
      const totalCount = tasksForDate.length;
      
      if (totalCount > 0) {
        marked[date] = {
          marked: true,
          dotColor: completedCount === totalCount ? colors.success : colors.primary,
          activeOpacity: 0.7,
        };
      }
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Calendar
        </Text>
      </View>

      <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
        <Calendar
          current={selectedDate}
          onDayPress={(day) => setSelectedDate(day.dateString)}
          markedDates={getMarkedDates()}
          theme={{
            backgroundColor: colors.card,
            calendarBackground: colors.card,
            textSectionTitleColor: colors.text,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: 'white',
            todayTextColor: colors.primary,
            dayTextColor: colors.text,
            textDisabledColor: colors.textSecondary,
            dotColor: colors.primary,
            selectedDotColor: 'white',
            arrowColor: colors.primary,
            monthTextColor: colors.text,
            indicatorColor: colors.primary,
            textDayFontWeight: '500',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
          renderArrow={(direction) => {
            if (direction === 'left') {
              return <ChevronLeft size={20} color={colors.primary} />;
            } else {
              return <ChevronRight size={20} color={colors.primary} />;
            }
          }}
        />
      </View>

      <ScrollView style={styles.tasksContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.selectedDateHeader, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
          <CalendarIcon size={20} color={colors.primary} />
          <Text style={[styles.selectedDateText, { color: colors.text }]}>
            {(() => {
              // Parse the selected date string
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              console.log('Displaying date for selectedDate:', selectedDate, 'parsed as:', date);
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
          <View style={styles.tasksList}>
            {tasksForSelectedDate.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskItem,
                  { 
                    backgroundColor: colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  }
                ]}
                onPress={() => handleTaskToggle(task)}
                activeOpacity={0.7}
              >
                <View style={styles.taskContent}>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleContainer}>
                      {task.status === 'done' ? (
                        <CheckCircle size={20} color={colors.primary} style={styles.taskIcon} />
                      ) : (
                        <Circle size={20} color={colors.textSecondary} style={styles.taskIcon} />
                      )}
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: colors.text },
                          task.status === 'done' && styles.completedText
                        ]}
                        numberOfLines={2}
                      >
                        {task.title}
                      </Text>
                    </View>
                  </View>

                  {task.notes && (
                    <Text
                      style={[
                        styles.taskNotes,
                        { color: colors.textSecondary },
                        task.status === 'done' && styles.completedText
                      ]}
                      numberOfLines={2}
                    >
                      {task.notes}
                    </Text>
                  )}

                  {task.goal && (
                    <TouchableOpacity
                      style={styles.goalLink}
                      onPress={() => handleGoalPress(task.goal!)}
                    >
                      <Text style={[styles.goalTitle, { color: colors.primary }]}>
                        {task.goal.title}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.taskFooter}>
                    <View style={styles.taskTimeContainer}>
                      <Clock size={14} color={colors.textSecondary} />
                      <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
                        {formatTime(task.due_at)}
                      </Text>
                    </View>
                    
                    {task.duration_minutes && (
                      <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                        {getDurationText(task.duration_minutes)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <CalendarIcon size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Tasks Today
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              Create a goal to see tasks scheduled for this day.
            </Text>
          </View>
        )}
      </ScrollView>

      <GoalModal
        visible={showGoalModal}
        goal={selectedGoal}
        onClose={() => setShowGoalModal(false)}
        onTaskToggle={handleTaskToggle}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tasksContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
  tasksList: {
    gap: 12,
  },
  taskItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    marginBottom: 8,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  taskNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    marginLeft: 32,
  },
  goalLink: {
    marginLeft: 32,
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 32,
  },
  taskTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskTime: {
    fontSize: 12,
    marginLeft: 6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
