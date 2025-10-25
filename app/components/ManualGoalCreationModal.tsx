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
  ImageBackground,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Save, Calendar, Target, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useUser } from '../../providers/UserProvider';
import { useSubscription } from '../../providers/SubscriptionProvider';
import { useGoals } from '../../providers/GoalsProvider';
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
  const { colors, isDark, isGalaxy } = useTheme();
  const { user } = useAuth();
  const { user: userProfile } = useUser();
  const { isPremium: subscriptionPremium, showUpgradeModal } = useSubscription();
  const { addGoal, refreshGoals, refreshTasks } = useGoals();
  const insets = useSafeAreaInsets();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Helpers to avoid timezone shifts when converting between string and Date
  const toYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Create a local Date for the given YYYY-MM-DD, using noon to avoid UTC rollbacks
  const localNoonFromYMD = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10));
    return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  };

  
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
      
      const newGoal: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'active',
        color: goalColor,
        user_id: user.id,
        target_date: targetDate ? localNoonFromYMD(targetDate).toISOString() : undefined,
      };

      // Use GoalsProvider for optimistic UI update and persistence
      await addGoal(newGoal);
      onGoalCreated({ id: newGoal.id, ...newGoal });
      // Ensure all dashboards reflect immediately
      await refreshGoals();
      await refreshTasks();
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
      // Normalize to YYYY-MM-DD string in local time
      setTargetDate(toYMD(selectedDate));
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
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', 
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
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)', 
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
                // Use local date object (no parsing of YYYY-MM-DD as UTC)
                value={targetDate ? localNoonFromYMD(targetDate) : new Date()}
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
