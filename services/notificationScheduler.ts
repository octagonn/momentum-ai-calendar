import { useNotifications } from '../providers/NotificationProvider';
import { getItem, setItem } from '../lib/storage';

export interface TaskNotificationData {
  id: string;
  title: string;
  due_at: string;
  goal_id: string;
  goal_title: string;
  completed: boolean;
}

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private notificationService: any = null;
  private scheduledTasks: Set<string> = new Set();
  private scheduledGoals: Set<string> = new Set();
  private overdueCheckInterval: NodeJS.Timeout | null = null;
  private lastOverdueCheck: Date = new Date();
  private overdueNotificationsSent: Map<string, Date> = new Map(); // goalId -> last notification time
  private sentTaskReminders: Map<string, Date> = new Map(); // taskId -> last reminder time
  private sentGoalReminders: Map<string, Date> = new Map(); // goalId -> last reminder time
  private persistentNotificationStorage: Map<string, Date> = new Map(); // taskId -> notification sent date

  static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  setNotificationService(service: any) {
    this.notificationService = service;
  }

  // Load persistent notification data from storage
  async loadPersistentNotificationData(): Promise<void> {
    try {
      const storedData = await getItem('sentNotifications');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        this.persistentNotificationStorage = new Map(Object.entries(parsedData).map(([key, value]) => [key, new Date(value as string)]));
      }
    } catch (error) {
      console.error('Error loading persistent notification data:', error);
    }
  }

  // Save persistent notification data to storage
  async savePersistentNotificationData(): Promise<void> {
    try {
      const dataToStore = Object.fromEntries(
        Array.from(this.persistentNotificationStorage.entries()).map(([key, value]) => [key, value.toISOString()])
      );
      await setItem('sentNotifications', JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Error saving persistent notification data:', error);
    }
  }

  // Check if a notification has already been sent for a task
  hasNotificationBeenSent(taskId: string): boolean {
    return this.persistentNotificationStorage.has(taskId);
  }

  // Mark a notification as sent for a task
  markNotificationAsSent(taskId: string): void {
    this.persistentNotificationStorage.set(taskId, new Date());
    this.savePersistentNotificationData(); // Save immediately
  }

  async scheduleTaskNotifications(tasks: TaskNotificationData[]): Promise<void> {
    if (!this.notificationService) {
      console.warn('Notification service not available');
      return;
    }

    // Keep the set for deduplication across calls; do not clear to avoid resending
    const now = new Date();
    const daysAhead = 14; // schedule up to 14 days ahead to ensure delivery even if app is closed
    const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    for (const task of tasks) {
      const dueDate = new Date(task.due_at);
      // Only schedule for tasks within the next N days
      if (!(dueDate > now && dueDate <= cutoff)) continue;
      
      // Calculate reminder time using user preference (default 15 minutes before due time)
      const reminderMinutes = this.notificationService?.preferences?.taskReminderMinutes || 15;
      const reminderTime = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000));
      
      // Only schedule if the reminder time is in the future
      if (reminderTime > now) {
        // Check if we've already sent a notification for this task (persistent check)
        if (this.hasNotificationBeenSent(task.id)) continue;
        
        try {
          const notificationId = await this.notificationService.scheduleTaskReminder(
            task.id,
            task.title,
            reminderTime, // Use reminder time instead of due time
            task.goal_title
          );
          
          if (notificationId) {
            this.scheduledTasks.add(task.id);
            this.markNotificationAsSent(task.id); // Persist to avoid duplicates across restarts
          }
        } catch (error) {
          console.error(`Error scheduling notification for task ${task.id}:`, error);
        }
      }
    }
  }

  // Overdue monitoring system removed - no longer needed

  // Overdue task checking and reminder system removed - no longer needed

  async scheduleDailyNotifications(): Promise<void> {
    if (!this.notificationService) {
      console.warn('Notification service not available');
      return;
    }

    // Daily notifications removed - no longer needed
    console.log('Daily notifications feature removed');
  }

  // Clear all scheduled notifications and reset tracking
  clearScheduledNotifications(): void {
    this.scheduledTasks.clear();
    this.scheduledGoals.clear();
    this.overdueNotificationsSent.clear();
    this.sentTaskReminders.clear();
    this.sentGoalReminders.clear();
    this.persistentNotificationStorage.clear();
    this.savePersistentNotificationData(); // Save the cleared state
  }

  // Get count of scheduled notifications
  getScheduledCount(): { tasks: number; goals: number } {
    return {
      tasks: this.scheduledTasks.size,
      goals: this.scheduledGoals.size,
    };
  }
}

// Export singleton instance
export const notificationScheduler = NotificationScheduler.getInstance();
