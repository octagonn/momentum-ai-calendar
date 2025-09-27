import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Calendar, Clock, Target, TrendingUp, Edit, Pause, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';

interface GoalDetailModalProps {
  visible: boolean;
  goal: any;
  onClose: () => void;
  onEdit?: () => void;
  onPause?: () => void;
  onDelete?: () => void;
}

export default function GoalDetailModal({ 
  visible, 
  goal, 
  onClose, 
  onEdit, 
  onPause, 
  onDelete 
}: GoalDetailModalProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  if (!goal) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "completed":
        return colors.primary;
      case "paused":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const statusColor = getStatusColor(goal.status);
  const progressPercentage = Math.round((goal.current / goal.target) * 100);

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      flex: 1,
      backgroundColor: colors.background,
      marginTop: insets.top + 50,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    goalHeader: {
      paddingVertical: 20,
    },
    goalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    goalDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
      marginBottom: 16,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginRight: 12,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    progressSection: {
      marginBottom: 24,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    progressPercentage: {
      fontSize: 16,
      fontWeight: '700',
      color: statusColor,
    },
    progressBar: {
      height: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 6,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 6,
      backgroundColor: statusColor,
      width: `${Math.min(progressPercentage, 100)}%`,
    },
    progressDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    milestoneItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    milestoneIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${statusColor}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    milestoneContent: {
      flex: 1,
    },
    milestoneTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    milestoneDescription: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    weeklyPlanItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
    weeklyPlanDay: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    weeklyPlanActivities: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    weeklyPlanDuration: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    tipsSection: {
      marginBottom: 24,
    },
    tipItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 8,
    },
    tipBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginTop: 6,
      marginRight: 12,
    },
    tipText: {
      flex: 1,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    actionsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    editButton: {
      backgroundColor: colors.primary,
    },
    pauseButton: {
      backgroundColor: colors.warning,
    },
    deleteButton: {
      backgroundColor: colors.danger,
    },
    actionText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Goal Details</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Text style={styles.goalDescription}>{goal.description}</Text>
              
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {goal.status}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Progress</Text>
                <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <View style={styles.progressDetails}>
                <Text style={styles.progressText}>
                  {goal.current} / {goal.target} {goal.unit}
                </Text>
              </View>
            </View>

            {goal.plan?.milestones && goal.plan.milestones.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Milestones</Text>
                {goal.plan.milestones.map((milestone: any, index: number) => (
                  <View key={index} style={styles.milestoneItem}>
                    <View style={styles.milestoneIcon}>
                      <Target size={16} color={statusColor} />
                    </View>
                    <View style={styles.milestoneContent}>
                      <Text style={styles.milestoneTitle}>
                        Week {milestone.week} - {milestone.target} {goal.unit}
                      </Text>
                      <Text style={styles.milestoneDescription}>
                        {milestone.description}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {goal.plan?.weeklyPlan && goal.plan.weeklyPlan.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Plan</Text>
                {goal.plan.weeklyPlan.map((plan: any, index: number) => (
                  <View key={index} style={styles.weeklyPlanItem}>
                    <Text style={styles.weeklyPlanDay}>{plan.day}</Text>
                    <Text style={styles.weeklyPlanActivities}>
                      {plan.activities.join(', ')}
                    </Text>
                    <Text style={styles.weeklyPlanDuration}>{plan.duration}</Text>
                  </View>
                ))}
              </View>
            )}

            {goal.plan?.tips && goal.plan.tips.length > 0 && (
              <View style={styles.tipsSection}>
                <Text style={styles.sectionTitle}>Tips & Recommendations</Text>
                {goal.plan.tips.map((tip: string, index: number) => (
                  <View key={index} style={styles.tipItem}>
                    <View style={styles.tipBullet} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={onEdit}
            >
              <Edit size={16} color="white" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.pauseButton]}
              onPress={onPause}
            >
              <Pause size={16} color="white" />
              <Text style={styles.actionText}>
                {goal.status === 'paused' ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={onDelete}
            >
              <Trash2 size={16} color="white" />
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
