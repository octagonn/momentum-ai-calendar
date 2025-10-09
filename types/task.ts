export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean; // For backward compatibility
  due_at: string; // ISO date string
  goal_id?: string;
  goalTitle?: string; // Goal title for notifications
  duration_minutes?: number;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}