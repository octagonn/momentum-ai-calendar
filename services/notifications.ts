import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase-client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationData {
  taskId: string;
  goalId: string;
  title: string;
  body: string;
  scheduledTime: Date;
}

export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Get push token (skip in development to avoid projectId issues)
      if (Device.isDevice && __DEV__ === false) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          });
          this.pushToken = token.data;
        } catch (error) {
          // Continue without push token - local notifications will still work
        }
      } else if (Device.isDevice) {
        console.warn('Push notifications disabled in development mode');
      } else {
        console.warn('Must use physical device for push notifications');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async scheduleTaskNotification(data: NotificationData): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            taskId: data.taskId,
            goalId: data.goalId,
          },
        },
        trigger: {
          date: data.scheduledTime,
        },
      });

      console.log(`Scheduled notification ${notificationId} for task ${data.taskId}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleMultipleTaskNotifications(tasks: Array<{
    id: string;
    title: string;
    due_at: string;
    goal_id: string;
    goal_title: string;
  }>, reminderMinutes: number = 15): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const task of tasks) {
      const dueTime = new Date(task.due_at);
      
      // Only schedule if the task is in the future
      if (dueTime > new Date()) {
        // Calculate reminder time (X minutes before due time)
        const reminderTime = new Date(dueTime.getTime() - (reminderMinutes * 60 * 1000));
        
        // Only schedule if the reminder time is in the future
        if (reminderTime > new Date()) {
          const notificationId = await this.scheduleTaskNotification({
            taskId: task.id,
            goalId: task.goal_id,
            title: task.title,
            body: `Time for your task: ${task.title}`,
            scheduledTime: reminderTime,
          });

          if (notificationId) {
            notificationIds.push(notificationId);
          }
        }
      }
    }

    return notificationIds;
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Cancelled notification ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async savePushTokenToDatabase(userId: string): Promise<void> {
    if (!this.pushToken) {
      console.warn('No push token available to save');
      return;
    }

    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: this.pushToken,
          platform: Platform.OS,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved to database');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from Momentum!',
        },
        trigger: { seconds: 2 },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  // Listen for notification events
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  removeNotificationSubscription(subscription: Notifications.Subscription) {
    Notifications.removeNotificationSubscription(subscription);
  }

  getPushToken(): string | null {
    return this.pushToken;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

