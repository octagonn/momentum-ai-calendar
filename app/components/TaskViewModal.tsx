import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Edit3, Trash2, Calendar, Clock, CheckCircle, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';

interface Task {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  notes?: string;
  due_at: string;
  duration_minutes?: number;
  all_day: boolean;
  status: 'pending' | 'done' | 'skipped';
  completed_at?: string;
  seq: number;
  created_at: string;
  updated_at: string;
}

interface TaskViewModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

export default function TaskViewModal({ visible, task, onClose, onEdit, onTaskUpdated, onTaskDeleted }: TaskViewModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
    if (!minutes) return 'No duration set';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleToggleTask = async () => {
    if (!task || !user) return;

    const newStatus = task.status === 'done' ? 'pending' : 'done';
    
    setLoading(true);
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

      const updatedTask = {
        ...task,
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : undefined,
      };

      onTaskUpdated(updatedTask);
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!task) return;

    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!task || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      onTaskDeleted(task.id);
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Error', 'Failed to delete task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  const isCompleted = task.status === 'done';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Task Details
          </Text>
          <TouchableOpacity 
            onPress={() => onEdit(task)} 
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            disabled={loading}
          >
            <Edit3 size={20} color={colors.background} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Title and Status */}
          <View style={styles.section}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={handleToggleTask}
                activeOpacity={0.7}
                disabled={loading}
              >
                {isCompleted ? (
                  <CheckCircle size={24} color={colors.primary} />
                ) : (
                  <Circle size={24} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              <Text
                style={[
                  styles.taskTitle,
                  { color: colors.text },
                  isCompleted && styles.completedText
                ]}
              >
                {task.title}
              </Text>
            </View>
            {loading && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIndicator} />
            )}
          </View>

          {/* Task Notes */}
          {task.notes && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
              <Text
                style={[
                  styles.taskNotes,
                  { color: colors.textSecondary },
                  isCompleted && styles.completedText
                ]}
              >
                {task.notes}
              </Text>
            </View>
          )}

          {/* Due Date and Time */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Due Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatDate(task.due_at)}
              </Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Clock size={20} color={colors.textSecondary} />
              <Text style={[styles.dateTimeText, { color: colors.text }]}>
                {formatTime(task.due_at)}
              </Text>
            </View>
          </View>

          {/* Duration */}
          {task.duration_minutes && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Duration</Text>
              <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                {getDurationText(task.duration_minutes)}
              </Text>
            </View>
          )}

          {/* Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: isCompleted ? colors.success : colors.warning }]}>
              <Text style={[styles.statusText, { color: colors.background }]}>
                {isCompleted ? 'Completed' : 'Pending'}
              </Text>
            </View>
          </View>

          {/* Delete Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.danger }]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Trash2 size={20} color={colors.danger} />
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                Delete Task
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  taskTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  loadingIndicator: {
    marginTop: 8,
  },
  taskNotes: {
    fontSize: 16,
    lineHeight: 24,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeText: {
    marginLeft: 12,
    fontSize: 16,
  },
  durationText: {
    fontSize: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
