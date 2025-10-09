import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { useAuth } from './AuthProvider';
import { notificationService } from '../services/notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSettings {
  goalReminders: boolean;
  taskReminders: boolean;
}

export interface NotificationPreferences {
  morningReminderTime: string; // HH:MM format
  eveningReminderTime: string; // HH:MM format
  weekendReminders: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
  taskReminderMinutes: number; // Minutes before task to remind user
}

interface NotificationContextType {
  // Permission state
  hasPermission: boolean;
  permissionStatus: Notifications.PermissionStatus;
  
  // Settings
  settings: NotificationSettings;
  preferences: NotificationPreferences;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  updateSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  updatePreferences: (newPreferences: Partial<NotificationPreferences>) => Promise<void>;
  
  // Notification management
  scheduleTaskReminder: (taskId: string, taskTitle: string, dueDate: Date, goalTitle: string) => Promise<string | null>;
  scheduleGoalReminder: (goalId: string, goalTitle: string, reminderDate: Date) => Promise<string | null>;
  cancelNotification: (notificationId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  
  // Test functions
  sendTestNotification: () => Promise<void>;
  
  // Status
  isInitialized: boolean;
  pushToken: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const defaultSettings: NotificationSettings = {
  goalReminders: true,
  taskReminders: true,
};

const defaultPreferences: NotificationPreferences = {
  morningReminderTime: '09:00',
  eveningReminderTime: '18:00',
  weekendReminders: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  taskReminderMinutes: 15, // 15 minutes before task
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus>('undetermined');
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Initialize notifications
  const initializeNotifications = useCallback(async () => {
    try {
      
      // Initialize the notification service
      await notificationService.initialize();
      
      // Get permission status
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        // Skip push token in development mode to avoid projectId issues
        // Local notifications will still work perfectly
        if (Device.isDevice && __DEV__ === false) {
          try {
            const token = await Notifications.getExpoPushTokenAsync();
            setPushToken(token.data);
            
            // Save token to database if user is logged in
            if (user) {
              await notificationService.savePushTokenToDatabase(user.id);
            }
          } catch (tokenError) {
            // Continue without push token - local notifications will still work
          }
        }
        
        // Set up notification channels for Android
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          
          await Notifications.setNotificationChannelAsync('task-reminders', {
            name: 'Task Reminders',
            description: 'Notifications for upcoming tasks',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          
          await Notifications.setNotificationChannelAsync('goal-reminders', {
            name: 'Goal Reminders',
            description: 'Notifications for goal milestones',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          
          await Notifications.setNotificationChannelAsync('motivation', {
            name: 'Daily Motivation',
            description: 'Daily motivational messages',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setIsInitialized(true); // Still mark as initialized to prevent infinite loading
    }
  }, [user]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      
      setPermissionStatus(status);
      setHasPermission(status === 'granted');
      
      if (status === 'granted') {
        await initializeNotifications();
      }
      
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [initializeNotifications]);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Save to user profile if available
    if (user) {
      // This would typically save to the database
      console.log('Saving notification settings:', updatedSettings);
    }
  }, [settings, user]);

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);
    
    // Save to user profile if available
    if (user) {
      // This would typically save to the database
      console.log('Saving notification preferences:', updatedPreferences);
    }
  }, [preferences, user]);

  // Schedule task reminder
  const scheduleTaskReminder = useCallback(async (
    taskId: string, 
    taskTitle: string, 
    reminderDate: Date, 
    goalTitle: string
  ): Promise<string | null> => {
    if (!settings.taskReminders || !hasPermission) {
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Task Reminder',
          body: `Time to work on: ${taskTitle}${goalTitle ? ` (${goalTitle})` : ''}`,
          data: { taskId, type: 'task_reminder' },
          sound: 'default',
        },
        trigger: {
          date: reminderDate,
          channelId: Platform.OS === 'android' ? 'task-reminders' : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      return null;
    }
  }, [settings.taskReminders, hasPermission]);

  // Schedule goal reminder
  const scheduleGoalReminder = useCallback(async (
    goalId: string, 
    goalTitle: string, 
    reminderDate: Date
  ): Promise<string | null> => {
    if (!settings.goalReminders || !hasPermission) {
      return null;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎯 Goal Reminder',
          body: `Don't forget about your goal: ${goalTitle}`,
          data: { goalId, type: 'goal_reminder' },
          sound: 'default',
        },
        trigger: {
          date: reminderDate,
          channelId: Platform.OS === 'android' ? 'goal-reminders' : undefined,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling goal reminder:', error);
      return null;
    }
  }, [settings.goalReminders, hasPermission]);



  // Cancel notification
  const cancelNotification = useCallback(async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please enable notifications in settings to send test notifications.');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from Momentum!',
          data: { type: 'test' },
          sound: 'default',
        },
        trigger: { seconds: 2 },
      });
      
      Alert.alert('Test Sent', 'Check your notification panel in 2 seconds!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  }, [hasPermission]);

  // Initialize on mount
  useEffect(() => {
    if (user && !isInitialized) {
      initializeNotifications();
    }
  }, [user, isInitialized, initializeNotifications]);

  // Set up notification listeners
  useEffect(() => {
    if (!hasPermission) return;

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // Handle notification received
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap - could navigate to specific screens
      const data = response.notification.request.content.data;
      if (data?.type === 'task_reminder') {
        // Navigate to task or goals screen
      } else if (data?.type === 'goal_reminder') {
        // Navigate to goal
      }
    });

    return () => {
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, [hasPermission]);

  const value: NotificationContextType = {
    hasPermission,
    permissionStatus,
    settings,
    preferences,
    requestPermission,
    updateSettings,
    updatePreferences,
    scheduleTaskReminder,
    scheduleGoalReminder,
    cancelNotification,
    cancelAllNotifications,
    sendTestNotification,
    isInitialized,
    pushToken,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
