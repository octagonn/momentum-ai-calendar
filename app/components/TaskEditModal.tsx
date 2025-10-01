import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Save, Trash2, Calendar, Clock } from 'lucide-react-native';
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

interface TaskEditModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted: (taskId: string) => void;
}

export default function TaskEditModal({ visible, task, onClose, onTaskUpdated, onTaskDeleted }: TaskEditModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible && task) {
      setTitle(task.title || '');
      setNotes(task.notes || '');
      
      const taskDate = new Date(task.due_at);
      // Use local date to avoid timezone issues
      const year = taskDate.getFullYear();
      const month = String(taskDate.getMonth() + 1).padStart(2, '0');
      const day = String(taskDate.getDate()).padStart(2, '0');
      setDueDate(`${year}-${month}-${day}`);
      setDueTime(taskDate.toTimeString().split(' ')[0].substring(0, 5));
      setDuration(task.duration_minutes?.toString() || '');
    }
  }, [visible, task]);

  const handleSave = async () => {
    if (!task || !user || !title.trim()) {
      Alert.alert('Error', 'Please enter a title for your task.');
      return;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Please enter a due date for your task.');
      return;
    }

    setLoading(true);
    try {
      const dueDateTime = new Date(`${dueDate}T${dueTime}:00`);
      const updateData: any = {
        title: title.trim(),
        notes: notes.trim() || null,
        due_at: dueDateTime.toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (duration) {
        const durationMinutes = parseInt(duration);
        if (!isNaN(durationMinutes) && durationMinutes > 0) {
          updateData.duration_minutes = durationMinutes;
        }
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const updatedTask = {
        ...task,
        title: title.trim(),
        notes: notes.trim() || undefined,
        due_at: dueDateTime.toISOString(),
        duration_minutes: duration ? parseInt(duration) : undefined,
      };

      onTaskUpdated(updatedTask);
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Use local date to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDueDate(`${year}-${month}-${day}`);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setDueTime(selectedTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Edit Task
          </Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            disabled={loading || !title.trim() || !dueDate}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Save size={20} color={colors.background} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter task notes"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Due Date *</Text>
            <TouchableOpacity
              style={[styles.dateInputContainer, { borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.dateInput, { color: dueDate ? colors.text : colors.textSecondary }]}>
                {dueDate || 'Select a date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate ? new Date(dueDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Due Time */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Due Time</Text>
            <TouchableOpacity
              style={[styles.timeInputContainer, { borderColor: colors.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={20} color={colors.textSecondary} />
              <Text style={[styles.timeInput, { color: dueTime ? colors.text : colors.textSecondary }]}>
                {dueTime || 'Select a time'}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${dueTime || '09:00'}:00`)}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                is24Hour={false}
              />
            )}
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={duration}
              onChangeText={setDuration}
              placeholder="Enter duration in minutes"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Leave empty for no specific duration
            </Text>
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
      </KeyboardAvoidingView>
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
  saveButton: {
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dateInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  timeInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 4,
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
