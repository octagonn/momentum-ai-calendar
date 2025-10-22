import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { Plus, Target, Calendar, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useGoals } from '../../providers/GoalsProvider';
import { supabase } from '../../lib/supabase-client';
import { router } from 'expo-router';
import GoalModal from '../components/GoalModal';
import GoalEditModal from '../components/GoalEditModal';
import GoalCreationChoiceModal from '../components/GoalCreationChoiceModal';
import ManualGoalCreationModal from '../components/ManualGoalCreationModal';
import TaskCreationModal from '../components/TaskCreationModal';

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

interface GoalWithProgress extends Goal {
  completion_ratio: number;
}

export default function GoalsScreen() {
  const { colors, isDark, isGalaxy } = useTheme();
  const { user } = useAuth();
  const { updateGoal } = useGoals();
  const insets = useSafeAreaInsets();
  
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showManualGoalModal, setShowManualGoalModal] = useState(false);
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);
  const [selectedGoalForTask, setSelectedGoalForTask] = useState<GoalWithProgress | null>(null);
  const [showGoalEditModal, setShowGoalEditModal] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    console.log('Fetching goals for user:', user.id);
    try {
      // Try to fetch with color field first, fallback to without color if it fails
      let { data, error } = await supabase
        .from('goal_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // If color field doesn't exist, try without it
      if (error && (error.message.includes('color does not exist') || error.message.includes('color') || error.message.includes('column') || error.message.includes('schema'))) {
        console.log('Color column not available in goal_progress view, falling back to basic query. Error:', error.message);
        const fallbackResult = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
        
        data = fallbackResult.data;
        error = fallbackResult.error;
        
        // Add default color to goals if color field is not available
        if (data) {
          data = data.map(goal => ({
            ...goal,
            color: goal.color || '#3B82F6'
          }));
        }
      }

      if (error) {
        console.error('Error fetching goals:', error);
        return;
      }

      console.log('Fetched goals:', data?.length || 0, 'goals');
      console.log('Sample goal with color:', data?.[0]);
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Set up Realtime listeners
  useEffect(() => {
    if (!user) return;

    // Listen for changes to goals
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
          console.log('Goals changed, refreshing...', payload);
          fetchGoals();
          
          // If it's an update and includes color change, update goals immediately
          if (payload.eventType === 'UPDATE' && payload.new && payload.new.color !== payload.old?.color) {
            console.log('Goal color changed, updating goal in real-time');
            setGoals(prevGoals => 
              prevGoals.map(goal => 
                goal.goal_id === payload.new.id || goal.id === payload.new.id
                  ? { ...goal, color: payload.new.color }
                  : goal
              )
            );
          }
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
        () => {
          console.log('Tasks changed, refreshing...');
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      goalsSubscription.unsubscribe();
      tasksSubscription.unsubscribe();
    };
  }, [user, fetchGoals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGoals();
  }, [fetchGoals]);

  const handleGoalPress = (goal: GoalWithProgress) => {
    setSelectedGoal(goal);
    setShowGoalModal(true);
  };

  const handleGoalCreated = (newGoal: any) => {
    console.log('Goal created:', newGoal);
    // Refresh the goals list
    fetchGoals();
    // The GoalsProvider will automatically update via real-time listener
  };

  const handleCreateGoalPress = () => {
    setShowChoiceModal(true);
  };

  const handleChooseAI = () => {
    setShowChoiceModal(false);
    router.push('/(tabs)/chat');
  };

  const handleChooseManual = () => {
    setShowChoiceModal(false);
    setShowManualGoalModal(true);
  };

  const handleAddTask = (goal: GoalWithProgress) => {
    setSelectedGoalForTask(goal);
    setShowTaskCreationModal(true);
  };

  const handleTaskCreated = (task: any) => {
    console.log('Task created:', task);
    // Refresh goals to update task counts
    fetchGoals();
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: completed ? 'done' : 'pending',
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating task:', error);
        Alert.alert('Error', 'Failed to update task');
        return;
      }

      // Refresh goals to update progress
      fetchGoals();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleGoalUpdated = (updatedGoal: Goal) => {
    // Convert Goal to GoalWithProgress for local state
    const goalWithProgress: GoalWithProgress = {
      ...updatedGoal,
      completion_ratio: updatedGoal.completion_ratio || 0,
    };
    
    // Update local state
    setGoals(prev => prev.map(goal => 
      (goal.goal_id || goal.id) === (updatedGoal.goal_id || updatedGoal.id) 
        ? goalWithProgress 
        : goal
    ));
    
    // Also update GoalsProvider for real-time updates across the app
    const goalId = updatedGoal.goal_id || updatedGoal.id;
    if (goalId) {
      updateGoal(goalId, {
        title: updatedGoal.title,
        description: updatedGoal.description,
        target_date: updatedGoal.target_date,
        status: updatedGoal.status as "active" | "paused" | "completed",
        color: updatedGoal.color,
      });
    }
  };

  const handleGoalDeleted = (goalId: string) => {
    setGoals(prev => prev.filter(goal => 
      (goal.goal_id || goal.id) !== goalId
    ));
  };

  const renderGoalCard = ({ item }: { item: GoalWithProgress }) => {
    const progressPercentage = Math.round((item.completion_ratio || 0) * 100);
    
    return (
      <TouchableOpacity
        style={[styles.goalCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}
        onPress={() => handleGoalPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <View style={[styles.goalColorIndicator, { backgroundColor: item.color || colors.primary }]} />
            <Text style={[styles.goalTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.color || colors.primary }]}>
            <Text style={styles.statusText}>{progressPercentage}%</Text>
          </View>
        </View>

        {item.description && (
          <Text style={[styles.goalDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]}>
            <View
              style={[
                styles.progressFill,
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: item.color || colors.primary,
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progressPercentage}% complete
          </Text>
        </View>

        {item.target_date && (
          <View style={styles.goalFooter}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={[styles.targetDate, { color: colors.textSecondary }]}>
              Target: {new Date(item.target_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.goalActions}>
          <TouchableOpacity
            style={[styles.addTaskButton, { borderColor: colors.primary }]}
            onPress={() => handleAddTask(item)}
            activeOpacity={0.7}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[styles.addTaskText, { color: colors.primary }]}>
              Add Task
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Target size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Goals Yet
      </Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        Create your first goal with AI assistance to get started on your journey.
      </Text>
      <TouchableOpacity
        style={[styles.createFirstGoalButton, { backgroundColor: colors.primary }]}
        onPress={handleCreateGoalPress}
      >
        <Text style={styles.createFirstGoalText}>Create Your First Goal</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your goals...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isGalaxy && (
        <ImageBackground 
          source={require('@/assets/images/background.png')} 
          style={StyleSheet.absoluteFillObject} 
          resizeMode="cover"
        />
      )}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          My Goals
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateGoalPress}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        renderItem={renderGoalCard}
        keyExtractor={(item) => item.id || item.goal_id || `goal-${item.title}-${item.created_at}`}
        contentContainerStyle={[
          styles.goalsList,
          goals.length === 0 && styles.emptyList
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

        <GoalModal
          visible={showGoalModal}
          goal={selectedGoal}
          onClose={() => setShowGoalModal(false)}
          onTaskToggle={handleTaskToggle}
          onGoalUpdated={handleGoalUpdated}
          onGoalDeleted={handleGoalDeleted}
          onEditGoal={(goal) => {
            // Close view modal first to prevent stacking, then open edit
            setShowGoalModal(false);
            setTimeout(() => {
              setSelectedGoal(goal as any);
              setShowGoalEditModal(true);
            }, 250);
          }}
        />

        <GoalEditModal
          visible={showGoalEditModal}
          goal={selectedGoal as any}
          onClose={() => setShowGoalEditModal(false)}
          onGoalUpdated={(g) => {
            handleGoalUpdated(g);
            setShowGoalEditModal(false);
          }}
          onGoalDeleted={(id) => {
            handleGoalDeleted(id);
            setShowGoalEditModal(false);
          }}
        />

      <GoalCreationChoiceModal
        visible={showChoiceModal}
        onClose={() => setShowChoiceModal(false)}
        onChooseAI={handleChooseAI}
        onChooseManual={handleChooseManual}
      />

      <ManualGoalCreationModal
        visible={showManualGoalModal}
        onClose={() => setShowManualGoalModal(false)}
        onGoalCreated={handleGoalCreated}
      />

      <TaskCreationModal
        visible={showTaskCreationModal}
        goalId={selectedGoalForTask?.goal_id || selectedGoalForTask?.id || ''}
        goalTitle={selectedGoalForTask?.title || ''}
        onClose={() => setShowTaskCreationModal(false)}
        onTaskCreated={handleTaskCreated}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  goalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  goalColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 6,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  goalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetDate: {
    fontSize: 12,
    marginLeft: 6,
  },
  goalActions: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addTaskText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  createFirstGoalButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createFirstGoalText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
