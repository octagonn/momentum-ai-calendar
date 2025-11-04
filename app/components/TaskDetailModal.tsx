import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { X, Clock, Calendar, Target, CheckCircle, Circle } from 'lucide-react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { shadowSm } from '@/ui/depth';

interface Task {
  id: string;
  title: string;
  description?: string;
  time?: string;
  completed: boolean;
  goalId?: string;
  goalTitle?: string;
  goalColor?: string;
  estimated_duration?: number;
}

interface TaskDetailModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onToggleComplete?: (taskId: string) => void;
}

const { width, height } = Dimensions.get('window');

export default function TaskDetailModal({
  visible,
  task,
  onClose,
  onToggleComplete,
}: TaskDetailModalProps) {
  const { colors, isGalaxy } = useTheme();

  if (!task) return null;


  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${remainingMinutes}m`;
  };

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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 0 }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Task Details
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Task Title */}
          <View style={styles.section}>
            <Text style={[styles.taskTitle, { color: colors.text }]}>
              {task.title}
            </Text>
            {task.completed && (
              <View style={[styles.completedBadge, { backgroundColor: colors.success }]}>
                <CheckCircle size={16} color="white" />
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>

          {/* Description */}
          {task.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Description
              </Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {task.description}
              </Text>
            </View>
          )}

          {/* Goal Information */}
          {task.goalTitle && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Related Goal
              </Text>
              <View style={[styles.goalContainer, { backgroundColor: colors.card }, shadowSm(false)]}>
                <Target size={20} color={task.goalColor || colors.primary} />
                <Text style={[styles.goalTitle, { color: task.goalColor || colors.primary }]}>
                  {task.goalTitle}
                </Text>
              </View>
            </View>
          )}

          {/* Task Details Grid */}
          <View style={styles.detailsGrid}>

            {/* Time */}
            {task.time && (
              <View style={[styles.detailCard, { backgroundColor: colors.card }, shadowSm(false)]}>
                <Clock size={20} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Time
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {task.time}
                </Text>
              </View>
            )}

            {/* Duration */}
            {task.estimated_duration && (
              <View style={[styles.detailCard, { backgroundColor: colors.card }, shadowSm(false)]}>
                <Calendar size={20} color={colors.primary} />
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  Duration
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatDuration(task.estimated_duration)}
                </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          {onToggleComplete && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                onPress={() => onToggleComplete(task.id)}
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: task.completed ? colors.error : colors.primary,
                  },
                ]}
              >
                {task.completed ? (
                  <>
                    <Circle size={20} color="white" />
                    <Text style={styles.toggleButtonText}>Mark as Incomplete</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} color="white" />
                    <Text style={styles.toggleButtonText}>Mark as Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    gap: 12,
  },
  detailCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSection: {
    marginTop: 32,
    marginBottom: 40,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
