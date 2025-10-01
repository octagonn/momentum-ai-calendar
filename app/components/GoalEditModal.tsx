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
import { X, Save, Trash2, Calendar } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase-client';

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
}

interface GoalEditModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onGoalUpdated: (updatedGoal: Goal) => void;
  onGoalDeleted: (goalId: string) => void;
}

export default function GoalEditModal({ visible, goal, onClose, onGoalUpdated, onGoalDeleted }: GoalEditModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (visible && goal) {
      setTitle(goal.title || '');
      setDescription(goal.description || '');
      setTargetDate(goal.target_date ? goal.target_date.split('T')[0] : '');
    }
  }, [visible, goal]);

  const handleSave = async () => {
    if (!goal || !user || !title.trim()) {
      Alert.alert('Error', 'Please enter a title for your goal.');
      return;
    }

    setLoading(true);
    try {
      const goalId = goal.goal_id || goal.id;
      if (!goalId) {
        throw new Error('Goal ID not found');
      }

      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (targetDate) {
        updateData.target_date = new Date(targetDate).toISOString();
      }

      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      const updatedGoal = {
        ...goal,
        title: title.trim(),
        description: description.trim() || undefined,
        target_date: targetDate ? new Date(targetDate).toISOString() : undefined,
      };

      onGoalUpdated(updatedGoal);
      onClose();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    console.log('Delete button pressed');
    if (!goal) {
      console.log('No goal to delete');
      return;
    }

    console.log('Showing delete confirmation modal');
    setShowDeleteConfirm(true);
  };


  const confirmDelete = async () => {
    console.log('Confirm delete called');
    console.log('Goal object:', goal);
    console.log('User object:', user);
    
    if (!goal || !user) {
      console.log('Missing goal or user:', { goal: !!goal, user: !!user });
      return;
    }

    setLoading(true);
    try {
      const goalId = goal.goal_id || goal.id;
      console.log('Goal ID to delete:', goalId);
      console.log('Goal ID type:', typeof goalId);
      
      if (!goalId) {
        throw new Error('Goal ID not found');
      }

      console.log('Attempting to delete goal from Supabase...');
      // Delete the goal (tasks will be deleted automatically due to CASCADE)
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      console.log('Goal deleted successfully from database');
      onGoalDeleted(goalId);
      onClose();
    } catch (error) {
      console.error('Error deleting goal:', error);
      Alert.alert('Error', `Failed to delete goal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
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
            Edit Goal
          </Text>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            disabled={loading || !title.trim()}
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
              placeholder="Enter goal title"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: colors.surface, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter goal description"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Target Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Target Date</Text>
            <View style={[styles.dateInputContainer, { borderColor: colors.border }]}>
              <Calendar size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.dateInput, { color: colors.text }]}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Leave empty for no target date
            </Text>
          </View>

          {/* Delete Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.deleteButton, 
                { 
                  borderColor: colors.danger,
                  backgroundColor: loading ? colors.surface : 'transparent'
                }
              ]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Trash2 size={20} color={colors.danger} />
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                Delete Goal
              </Text>
            </TouchableOpacity>
            
            
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              This will also delete all associated tasks
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>
              Delete Goal
            </Text>
            <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
              Are you sure you want to delete this goal? This will also delete all associated tasks and cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  console.log('Delete cancelled');
                  setShowDeleteConfirm(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton, { backgroundColor: colors.danger }]}
                onPress={() => {
                  console.log('Delete confirmed by user');
                  setShowDeleteConfirm(false);
                  confirmDelete();
                }}
              >
                <Text style={[styles.deleteConfirmButtonText, { color: colors.background }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInput: {
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
    minHeight: 48,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteConfirmButton: {
    // backgroundColor set dynamically
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
