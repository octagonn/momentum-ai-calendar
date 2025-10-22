import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { X, Filter, ArrowUpDown, Clock, CheckCircle, Circle, ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/providers/ThemeProvider';
import { useGoals } from '@/providers/GoalsProvider';
import TaskDetailModal from './TaskDetailModal';

interface ViewAllTasksModalProps {
  visible: boolean;
  onClose: () => void;
}

type FilterType = 'all' | 'completed' | 'incomplete';
type SortType = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'goal-asc' | 'goal-desc';

const { width } = Dimensions.get('window');

export default function ViewAllTasksModal({ visible, onClose }: ViewAllTasksModalProps) {
  const { colors, isDark, isGalaxy } = useTheme();
  const { tasks, goals, toggleTask } = useGoals();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('incomplete');
  const [selectedSort, setSelectedSort] = useState<SortType>('date-asc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailVisible, setIsTaskDetailVisible] = useState(false);

  // Process all tasks with goal information
  const allTasksWithGoals = useMemo(() => {
    return tasks.map(task => {
      const relatedGoal = task.goal_id ? goals.find(g => g.id === task.goal_id) : null;
      return {
        ...task,
        goalTitle: relatedGoal?.title || 'No Goal',
        goalColor: relatedGoal?.color || colors.primary,
        dueDate: task.due_at ? new Date(task.due_at) : null,
      };
    });
  }, [tasks, goals, colors.primary]);

  // Filter tasks based on selected filter
  const filteredTasks = useMemo(() => {
    switch (selectedFilter) {
      case 'completed':
        return allTasksWithGoals.filter(task => task.completed);
      case 'incomplete':
        return allTasksWithGoals.filter(task => !task.completed);
      default:
        return allTasksWithGoals;
    }
  }, [allTasksWithGoals, selectedFilter]);

  // Sort tasks based on selected sort option
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      switch (selectedSort) {
        case 'date-asc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'date-desc':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return -1;
          if (!b.dueDate) return 1;
          return b.dueDate.getTime() - a.dueDate.getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'goal-asc':
          return a.goalTitle.localeCompare(b.goalTitle);
        case 'goal-desc':
          return b.goalTitle.localeCompare(a.goalTitle);
        default:
          return 0;
      }
    });
  }, [filteredTasks, selectedSort]);

  const handleFilterSelect = async (filter: FilterType) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedFilter(filter);
    setShowFilterMenu(false);
  };

  const handleSortSelect = async (sort: SortType) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSort(sort);
    setShowSortMenu(false);
  };

  const handleTaskPress = async (task: any) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedTask(task);
    setIsTaskDetailVisible(true);
  };

  const handleTaskToggle = async (taskId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleTask(taskId);
  };

  const handleCloseTaskDetail = () => {
    setIsTaskDetailVisible(false);
    setSelectedTask(null);
  };

  const getFilterLabel = (filter: FilterType) => {
    switch (filter) {
      case 'completed': return 'Completed';
      case 'incomplete': return 'Incomplete';
      default: return 'All Tasks';
    }
  };

  const getSortLabel = (sort: SortType) => {
    switch (sort) {
      case 'date-asc': return 'Date (Oldest First)';
      case 'date-desc': return 'Date (Newest First)';
      case 'title-asc': return 'Title (A-Z)';
      case 'title-desc': return 'Title (Z-A)';
      case 'goal-asc': return 'Goal (A-Z)';
      case 'goal-desc': return 'Goal (Z-A)';
      default: return 'Date (Newest First)';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (taskDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (taskDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderTaskItem = ({ item: task, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.taskItem,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)',
          borderLeftColor: task.goalColor,
        }
      ]}
      onPress={() => handleTaskPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <Text style={[styles.taskTitle, { color: colors.text }]} numberOfLines={2}>
              {task.title}
            </Text>
            {task.description && (
              <Text style={[styles.taskDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                {task.description}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.checkbox,
              task.completed ? styles.checkboxChecked : styles.checkboxUnchecked,
              { borderColor: task.completed ? task.goalColor : colors.border }
            ]}
            onPress={() => handleTaskToggle(task.id)}
          >
            {task.completed ? (
              <CheckCircle size={20} color="white" />
            ) : (
              <Circle size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.taskFooter}>
          <View style={styles.goalContainer}>
            <View 
              style={[
                styles.goalColorIndicator, 
                { backgroundColor: task.goalColor }
              ]} 
            />
            <Text style={[styles.goalTitle, { color: task.goalColor }]}>
              {task.goalTitle}
            </Text>
          </View>
          
          {task.dueDate && (
            <View style={styles.dateContainer}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDate(task.dueDate)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterMenu = () => (
    <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {(['all', 'completed', 'incomplete'] as FilterType[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.dropdownItem,
            selectedFilter === filter && { backgroundColor: `${colors.primary}15` }
          ]}
          onPress={() => handleFilterSelect(filter)}
        >
          <Text style={[
            styles.dropdownItemText,
            { color: selectedFilter === filter ? colors.primary : colors.text }
          ]}>
            {getFilterLabel(filter)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSortMenu = () => (
    <View style={[styles.dropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {(['date-desc', 'date-asc', 'title-asc', 'title-desc', 'goal-asc', 'goal-desc'] as SortType[]).map((sort) => (
        <TouchableOpacity
          key={sort}
          style={[
            styles.dropdownItem,
            selectedSort === sort && { backgroundColor: `${colors.primary}15` }
          ]}
          onPress={() => handleSortSelect(sort)}
        >
          <Text style={[
            styles.dropdownItemText,
            { color: selectedSort === sort ? colors.primary : colors.text }
          ]}>
            {getSortLabel(sort)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: isGalaxy ? 'rgba(0, 0, 0, 0.5)' : colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      height: '95%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    controlButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    controlButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      borderRadius: 12,
      borderWidth: 1,
      zIndex: 1000,
      marginTop: 4,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    dropdownItemText: {
      fontSize: 14,
      fontWeight: '500',
    },
    taskList: {
      flex: 1,
      paddingHorizontal: 20,
    },
    taskItem: {
      borderRadius: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    taskContent: {
      padding: 16,
    },
    taskHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    taskTitleContainer: {
      flex: 1,
      marginRight: 12,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    taskDescription: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    checkbox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
    },
    checkboxUnchecked: {
      backgroundColor: 'transparent',
    },
    taskFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    goalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    goalColorIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    goalTitle: {
      fontSize: 12,
      fontWeight: '600',
    },
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 12,
      marginLeft: 4,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {isGalaxy && (
              <ImageBackground 
                source={require('@/assets/images/background.png')} 
                style={StyleSheet.absoluteFillObject} 
                resizeMode="cover"
              />
            )}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>All Tasks</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.controlsContainer}>
              <View style={{ flex: 1, position: 'relative' }}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => setShowFilterMenu(!showFilterMenu)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Filter size={16} color={colors.primary} />
                    <Text style={[styles.controlButtonText, { marginLeft: 8 }]}>
                      {getFilterLabel(selectedFilter)}
                    </Text>
                  </View>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {showFilterMenu && renderFilterMenu()}
              </View>

              <View style={{ flex: 1, position: 'relative' }}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => setShowSortMenu(!showSortMenu)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ArrowUpDown size={16} color={colors.primary} />
                    <Text style={[styles.controlButtonText, { marginLeft: 8 }]}>
                      Sort
                    </Text>
                  </View>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {showSortMenu && renderSortMenu()}
              </View>
            </View>

            <FlatList
              data={sortedTasks}
              renderItem={renderTaskItem}
              keyExtractor={(item) => item.id}
              style={styles.taskList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No tasks found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {selectedFilter === 'all' 
                      ? 'Create your first task to get started!'
                      : `No ${selectedFilter} tasks found.`
                    }
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <TaskDetailModal
        visible={isTaskDetailVisible}
        task={selectedTask}
        onClose={handleCloseTaskDetail}
        onToggleComplete={handleTaskToggle}
      />
    </>
  );
}
