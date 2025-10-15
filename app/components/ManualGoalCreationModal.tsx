import React, { useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Save, Calendar, Target, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useUser } from '../../providers/UserProvider';
import { useSubscription } from '../../providers/SubscriptionProvider';
import { supabase, createNewSupabaseClient } from '../../lib/supabase-client';
import ColorPicker from './ColorPicker';
import { getNextAvailableColor } from '../../lib/colorUtils';
import { featureGate, Feature } from '../../services/featureGate';

interface ManualGoalCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onGoalCreated: (goal: any) => void;
}

export default function ManualGoalCreationModal({ 
  visible, 
  onClose, 
  onGoalCreated 
}: ManualGoalCreationModalProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { user: userProfile } = useUser();
  const { isPremium: subscriptionPremium, showUpgradeModal } = useSubscription();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Use both sources of premium status for maximum compatibility  
  const isPremium = userProfile?.isPremium || subscriptionPremium || false;

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your goal.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please make sure you\'re logged in.');
      return;
    }

    setLoading(true);
    try {
      // Only use custom color if user is premium
      const goalColor = isPremium ? color : featureGate.getDefaultGoalColor();
      
      const goalData = {
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate ? new Date(targetDate).toISOString() : null,
        status: 'active',
        color: goalColor,
      };

      // Try to insert with color field first
      let { data: goal, error } = await supabase
        .from('goals')
        .insert([{
          user_id: user.id,
          ...goalData,
        }])
        .select()
        .single();

      // If color field doesn't exist, try without it
      if (error && error.message.includes('color')) {
        console.log('Color column not available, creating goal without color field');
        const fallbackResult = await supabase
          .from('goals')
          .insert([{
            user_id: user.id,
            title: goalData.title,
            description: goalData.description,
            target_date: goalData.target_date,
            status: goalData.status,
          }])
          .select()
          .single();
        
        goal = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        throw error;
      }

      console.log('Manual goal created:', goal);
      onGoalCreated(goal);
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error creating manual goal:', error);
      Alert.alert('Error', `Failed to create goal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetDate('');
    setColor('#3B82F6');
    setShowDatePicker(false);
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
      setTargetDate(`${year}-${month}-${day}`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Target size={24} color={colors.primary} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Create Goal Manually
            </Text>
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
            <TouchableOpacity
              style={[styles.dateInputContainer, { borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.dateInput, { color: targetDate ? colors.text : colors.textSecondary }]}>
                {targetDate || 'Select a target date'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Leave empty for no target date
            </Text>
            {showDatePicker && (
              <DateTimePicker
                value={targetDate ? new Date(targetDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Color Picker */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Goal Color</Text>
            {isPremium ? (
              <ColorPicker
                selectedColor={color}
                onColorSelect={setColor}
              />
            ) : (
              <TouchableOpacity
                style={[styles.premiumColorSection, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  console.log('ManualGoalCreationModal: User wants to upgrade for color picker');
                  // Close this modal first to prevent stacking
                  onClose();
                  // Wait a bit then show upgrade modal
                  setTimeout(() => {
                    showUpgradeModal('color_picker');
                  }, 300);
                }}
              >
                <View style={styles.premiumColorContent}>
                  <View style={[styles.defaultColorPreview, { backgroundColor: featureGate.getDefaultGoalColor() }]} />
                  <View style={styles.premiumColorTextContainer}>
                    <Text style={[styles.premiumColorText, { color: colors.text }]}>
                      Default Color (Blue)
                    </Text>
                    <Text style={[styles.premiumColorSubtext, { color: colors.textSecondary }]}>
                      Upgrade to customize colors
                    </Text>
                  </View>
                  <Lock size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            )}
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
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Save size={20} color={colors.background} />
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  Create Goal
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
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
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
    minHeight: 48,
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
  premiumColorSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  premiumColorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  defaultColorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  premiumColorTextContainer: {
    flex: 1,
  },
  premiumColorText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  premiumColorSubtext: {
    fontSize: 14,
  },
});
