import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../providers/NotificationProvider';
import { useGoals } from '../providers/GoalsProvider';
import { notificationScheduler } from '../services/notificationScheduler';

export const useNotificationIntegration = () => {
  const notificationService = useNotifications();
  const { tasks, goals } = useGoals();
  const [hasScheduledNotifications, setHasScheduledNotifications] = useState(false);
  const scheduledTasksRef = useRef<Set<string>>(new Set());
  const scheduledGoalsRef = useRef<Set<string>>(new Set());
  

  // Set up the notification service in the scheduler
  useEffect(() => {
    notificationScheduler.setNotificationService(notificationService);
    
    // Load persistent notification data on initialization
    notificationScheduler.loadPersistentNotificationData();
    
    // Don't clear notifications on app start - this was causing notifications to be sent every time
    // The notification system should only schedule new notifications when tasks actually change
  }, [notificationService]);

  // Schedule notifications when tasks change (with deduplication)
  useEffect(() => {
    if (tasks.length > 0 && notificationService.hasPermission && !hasScheduledNotifications) {
      const taskData = tasks.map(task => {
        // Use the goalTitle that was already fetched in the GoalsProvider
        // This should contain the actual goal title, not a fallback
        const goalTitle = task.goalTitle;
        
        return {
          id: task.id,
          title: task.title,
          due_at: task.due_at,
          goal_id: task.goal_id || '',
          goal_title: goalTitle,
          completed: task.completed,
        };
      });

      // Only schedule notifications for today's tasks
      notificationScheduler.scheduleTaskNotifications(taskData);
      setHasScheduledNotifications(true);
    }
  }, [tasks, goals, notificationService.hasPermission, hasScheduledNotifications]);

  // Don't automatically reschedule when reminder time changes - this was causing notifications to be sent every time
  // Users can manually reschedule if they want to change their reminder preferences

  // Overdue monitoring removed - no longer needed

  // Daily notifications removed - no longer needed

  // Function to reset scheduling state (useful for logout/login scenarios)
  const resetSchedulingState = () => {
    setHasScheduledNotifications(false);
    notificationScheduler.clearScheduledNotifications();
  };

  // Function to force reschedule notifications (useful when settings change)
  const forceRescheduleNotifications = () => {
    setHasScheduledNotifications(false);
    // The useEffect will trigger and reschedule notifications
  };

  return {
    notificationService,
    scheduleTaskNotifications: notificationScheduler.scheduleTaskNotifications,
    scheduleGoalNotifications: notificationScheduler.scheduleGoalNotifications,
    resetSchedulingState,
    forceRescheduleNotifications,
    hasScheduledNotifications,
  };
};
