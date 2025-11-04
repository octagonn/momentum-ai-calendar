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
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Save, Calendar, Clock, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';
import { shadowSm } from '@/ui/depth';

interface TaskCreationModalProps {
  visible: boolean;
  goalId: string;
  goalTitle: string;
  onClose: () => void;
  onTaskCreated: (task: any) => void;
}

export default function TaskCreationModal({ 
  visible, 
  goalId,
  goalTitle,
  onClose, 
  onTaskCreated 
}: TaskCreationModalProps) {
  const { colors, isDark, isGalaxy } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    // Initialize with today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [dueTime, setDueTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    // Set default date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDueDate(`${year}-${month}-${day}`);
    setDueTime('09:00');
    setDurationMinutes('');
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      console.log('TaskCreationModal opened, resetting form');
      resetForm();
    }
  }, [visible]);

  const handleSave = async () => {
    console.log('handleSave called with:', { title, dueDate, dueTime, goalId, user: !!user });
    
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your task.');
      return;
    }

    if (!dueDate) {
      Alert.alert('Error', 'Please select a due date for your task.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please make sure you\'re logged in.');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time - use local timezone to avoid date shifting
      const combinedDateTime = `${dueDate}T${dueTime}:00`;
      const dueAt = new Date(combinedDateTime).toISOString();

      const taskData = {
        goal_id: goalId,
        user_id: user.id,
        title: title.trim(),
        notes: notes.trim() || null,
        due_at: dueAt,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        all_day: false,
        status: 'pending',
        seq: 1, // Will be updated by the database
      };

      const { data: task, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Task created:', task);
      console.log('Final due date saved:', dueAt);
      onTaskCreated(task);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating task:', error);
      Alert.alert('Error', `Failed to create task: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Use local date to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      console.log('Date selected:', dateString);
      setDueDate(dateString);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      // Format time as 24-hour HH:MM for consistency
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setDueTime(`${hours}:${minutes}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: isGalaxy ? 'rgba(0, 0, 0, 0.5)' : colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {isGalaxy && (
          <ImageBackground 
            source={require('@/assets/images/background.png')} 
            style={StyleSheet.absoluteFillObject} 
            resizeMode="cover"
          />
        )}
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
          <View style={styles.headerContent}>
            <Plus size={24} color={colors.primary} />
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Add Task
              </Text>
              <Text style={[styles.goalTitle, { color: colors.textSecondary }]}>
                {goalTitle}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: 'transparent' }, shadowSm(isDark)]}
              value={title}
              onChangeText={(text) => {
                console.log('Title changed:', text);
                setTitle(text);
              }}
              placeholder="Enter task title"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: 'transparent' }, shadowSm(isDark)]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter task details or instructions"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Due Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Due Date *</Text>
            <TouchableOpacity
              style={[styles.dateInputContainer, { backgroundColor: colors.card, borderColor: 'transparent' }, shadowSm(isDark)]}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.dateInput, { color: dueDate ? colors.text : colors.textSecondary }]}>
                {dueDate || 'Select a date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate ? new Date(dueDate + 'T12:00:00') : new Date()}
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
              style={[styles.timeInputContainer, { backgroundColor: colors.card, borderColor: 'transparent' }, shadowSm(isDark)]}
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
                is24Hour={true}
              />
            )}
          </View>

          {/* Duration */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Duration (minutes)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: 'transparent' }, shadowSm(isDark)]}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="e.g., 60"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Leave empty for no specific duration
            </Text>
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { 
                backgroundColor: (loading || !title.trim() || !dueDate) ? colors.textSecondary : colors.primary,
                opacity: (loading || !title.trim() || !dueDate) ? 0.5 : 1
              }
            ]}
            onPress={() => {
              console.log('Save button pressed, disabled state:', { 
                loading, 
                title: title.trim(), 
                dueDate,
                disabled: loading || !title.trim() || !dueDate 
              });
              handleSave();
            }}
            disabled={loading || !title.trim() || !dueDate}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Save size={20} color={colors.background} />
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  Add Task
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  goalTitle: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
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
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
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
    borderWidth: 0,
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
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
