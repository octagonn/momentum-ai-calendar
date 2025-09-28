export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed" | "cancelled";
  completed: boolean; // For backward compatibility
  category?: string;
  estimated_duration?: number;
  goal_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}