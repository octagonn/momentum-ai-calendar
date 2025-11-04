import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { X, Calendar, Clock, CheckCircle, Circle, Target, Edit3 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';
import { useGoals } from '../../providers/GoalsProvider';
import { useSubscription } from '../../providers/SubscriptionProvider';
import { shadowSm } from '@/ui/depth';
// GoalEditModal is now rendered at a higher level to avoid nested modals
import TaskEditModal from './TaskEditModal';
import TaskViewModal from './TaskViewModal';

interface Task {
  id: string;
  title: string;
  notes?: string;
  due_at: string;
  duration_minutes?: number;
  status: 'pending' | 'done' | 'skipped';
  completed_at?: string;
  seq: number;
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
  completion_ratio?: number;
  color?: string;
}

interface GoalModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onTaskToggle: (taskId: string, completed: boolean) => void;
  onGoalUpdated?: (updatedGoal: Goal) => void;
  onGoalDeleted?: (goalId: string) => void;
  onEditGoal?: (goal: Goal) => void; // open edit at top-level
}

export default function GoalModal({ visible, goal, onClose, onTaskToggle, onGoalUpdated, onGoalDeleted, onEditGoal }: GoalModalProps) {
  const { colors, isDark, isGalaxy } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  // Edit modal moved to parent to prevent nested native Modal stacking
  const [showTaskEditModal, setShowTaskEditModal] = useState(false);
  const [showTaskViewModal, setShowTaskViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(goal);
  
  // Use ref to store the callback to avoid stale closures
  const onGoalUpdatedRef = useRef(onGoalUpdated);
  onGoalUpdatedRef.current = onGoalUpdated;

  // Update current goal when prop changes
  useEffect(() => {
    setCurrentGoal(goal);
  }, [goal]);

  // Set up real-time subscription for goal updates
  useEffect(() => {
    if (!visible || (!goal?.id && !goal?.goal_id)) return;

    const goalId = goal.id || goal.goal_id;
    
    const goalSubscription = supabase
      .channel(`goal_${goalId}_changes`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'goals',
          filter: `id=eq.${goalId}`
        }, 
        (payload) => {
          if (payload.new) {
            setCurrentGoal(payload.new as Goal);
            // Also notify parent component
            if (onGoalUpdatedRef.current) {
              onGoalUpdatedRef.current(payload.new as Goal);
            }
          }
        }
      )
      .subscribe();

    return () => {
      goalSubscription.unsubscribe();
    };
  }, [visible, goal?.id, goal?.goal_id]);

  // Additional real-time listener for all user goals (backup)
  useEffect(() => {
    if (!visible || !user) return;

    const userGoalsSubscription = supabase
      .channel(`user_goals_${user.id}_changes`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'goals',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          if (payload.new && currentGoal && (payload.new.id === currentGoal.id || payload.new.id === currentGoal.goal_id)) {
            setCurrentGoal(payload.new as Goal);
            // Also notify parent component
            if (onGoalUpdatedRef.current) {
              onGoalUpdatedRef.current(payload.new as Goal);
            }
          }
        }
      )
      .subscribe();

    return () => {
      userGoalsSubscription.unsubscribe();
    };
  }, [visible, user, currentGoal]);

  useEffect(() => {
    if (visible && goal) {
      fetchTasks(goal);
      // Refresh goal data when modal becomes visible to ensure latest data
      if (onGoalUpdatedRef.current) {
        onGoalUpdatedRef.current(goal);
      }
    }
  }, [visible, goal]);

  const fetchTasks = async (goalToFetch?: Goal | null) => {
    const goalToUse = goalToFetch || currentGoal;
    if (!goalToUse || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('goal_id', goalToUse.goal_id || goalToUse.id)
        .eq('user_id', user.id)
        .order('status', { ascending: true })
        .order('due_at', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', task.id)
        .eq('user_id', user?.id);

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

      // Notify parent component
      onTaskToggle(task.id, newStatus === 'done');
      
      // Refresh goal data to update completion ratios immediately
      if (onGoalUpdatedRef.current && currentGoal) {
        onGoalUpdatedRef.current(currentGoal);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskEditModal(true);
  };

  const handleTaskPress = (task: Task) => {
    setSelectedTask(task);
    setShowTaskViewModal(true);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setShowTaskEditModal(false);
    setShowTaskViewModal(false);
    setSelectedTask(null);
    // Refresh goal data to update completion ratios
    if (onGoalUpdatedRef.current && currentGoal) {
      onGoalUpdatedRef.current(currentGoal);
    }
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setShowTaskEditModal(false);
    setShowTaskViewModal(false);
    setSelectedTask(null);
    // Refresh goal data to update completion ratios
    if (onGoalUpdatedRef.current && currentGoal) {
      onGoalUpdatedRef.current(currentGoal);
    }
  };

  const handleGoalUpdated = (updatedGoal: Goal) => {
    // Update local state immediately for instant UI update
    setCurrentGoal(updatedGoal);
    
    // Notify parent component
    if (onGoalUpdatedRef.current) {
      onGoalUpdatedRef.current(updatedGoal);
    }
    
    // Close the edit modal
    setShowGoalEditModal(false);
  };

  const handleGoalDeleted = (goalId: string) => {
    if (onGoalDeleted) {
      onGoalDeleted(goalId);
    }
    setShowGoalEditModal(false);
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
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

  const sortedTasks = tasks.sort((a, b) => {
    // Completed tasks go to bottom
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    
    // Within same status, sort by due date
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const pendingTasks = sortedTasks.filter(task => task.status !== 'done');
  const completedTasks = sortedTasks.filter(task => task.status === 'done');

  const { isGoalLocked } = useGoals();
  const { showUpgradeModal, isPremium } = useSubscription();
  const locked = !isPremium && isGoalLocked(goal?.id || (goal as any)?.goal_id);

  if (!currentGoal) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isGalaxy ? 'rgba(0, 0, 0, 0.5)' : colors.background }]}>
        {isGalaxy && (
          <ImageBackground 
            source={require('@/assets/images/background.png')} 
            style={StyleSheet.absoluteFillObject} 
            resizeMode="cover"
          />
        )}
        {locked && (
          <TouchableOpacity onPress={() => showUpgradeModal('goal_limit')} activeOpacity={0.8}>
            <View style={[styles.lockOverlay, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}>
              <Text style={[styles.lockText, { color: colors.text }]}>This goal is locked. Upgrade to access.</Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerContent}>
            <View style={[styles.goalColorIndicator, { backgroundColor: currentGoal.color || colors.primary }]} />
            <View style={styles.headerText}>
              <Text style={[styles.goalTitle, { color: colors.text }]} numberOfLines={2}>
                {currentGoal.title}
              </Text>
              {currentGoal.target_date && (
                <Text style={[styles.targetDate, { color: colors.textSecondary }]}>
                  Target: {new Date(currentGoal.target_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                if (onEditGoal && currentGoal) onEditGoal(currentGoal);
              }}
            >
              <Edit3 size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {currentGoal.description && (
          <View style={[styles.descriptionContainer, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
            <Text style={[styles.description, { color: colors.text }]}>
              {currentGoal.description}
            </Text>
          </View>
        )}

        <ScrollView style={styles.tasksContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading tasks...
              </Text>
            </View>
          ) : (
            <>
              {pendingTasks.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Upcoming Tasks ({pendingTasks.length})
                  </Text>
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleTaskToggle}
                      onPress={handleTaskPress}
                      colors={colors}
                      isDark={isDark}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getDurationText={getDurationText}
                    />
                  ))}
                </View>
              )}

              {completedTasks.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Completed ({completedTasks.length})
                  </Text>
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleTaskToggle}
                      onPress={handleTaskPress}
                      colors={colors}
                      isDark={isDark}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getDurationText={getDurationText}
                    />
                  ))}
                </View>
              )}

              {tasks.length === 0 && (
                <View style={styles.emptyState}>
                  <Calendar size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No Tasks Yet
                  </Text>
                  <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                    Tasks will appear here once your goal plan is generated.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Edit Modals moved to parent to avoid nested modal stacking */}

      <TaskViewModal
        visible={showTaskViewModal}
        task={selectedTask}
        onClose={() => setShowTaskViewModal(false)}
        onEdit={(task) => {
          setShowTaskViewModal(false);
          setSelectedTask(task);
          setShowTaskEditModal(true);
        }}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />

      <TaskEditModal
        visible={showTaskEditModal}
        task={selectedTask}
        onClose={() => setShowTaskEditModal(false)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </Modal>
  );
}

interface TaskItemProps {
  task: Task;
  onToggle: (task: Task) => void;
  onPress: (task: Task) => void;
  colors: any;
  isDark: boolean;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  getDurationText: (minutes?: number) => string;
}

function TaskItem({ task, onToggle, onPress, colors, isDark, formatDate, formatTime, getDurationText }: TaskItemProps) {
  const isCompleted = task.status === 'done';
  
  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        { backgroundColor: colors.card, borderColor: 'transparent' },
        shadowSm(isDark),
      ]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => onToggle(task)}
              activeOpacity={0.7}
            >
              {isCompleted ? (
                <CheckCircle size={20} color={colors.primary} style={styles.taskIcon} />
              ) : (
                <Circle size={20} color={colors.textSecondary} style={styles.taskIcon} />
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.taskTitle,
                { color: colors.text },
                isCompleted && styles.completedText
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
              isCompleted && styles.completedText
            ]}
            numberOfLines={2}
          >
            {task.notes}
          </Text>
        )}

        <View style={styles.taskFooter}>
          <View style={styles.taskDateTime}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.taskDate, { color: colors.textSecondary }]}>
              {formatDate(task.due_at)}
            </Text>
            <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
              at {formatTime(task.due_at)}
            </Text>
          </View>
          
          {task.duration_minutes && (
            <View style={styles.taskDuration}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                {getDurationText(task.duration_minutes)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 16,
  },
  goalColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 4,
  },
  headerText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  targetDate: {
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  tasksContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  taskItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0,
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
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 32,
  },
  taskDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskDate: {
    fontSize: 12,
    marginLeft: 6,
  },
  taskTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  taskDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    fontSize: 12,
    marginLeft: 4,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
    marginRight: 8,
  },
  checkboxContainer: {
    padding: 4,
  },
  lockOverlay: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  lockText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

