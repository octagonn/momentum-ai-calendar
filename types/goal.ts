export interface Goal {
  id: string;
  title: string;
  description: string;
  current: number; // For backward compatibility
  target: number; // For backward compatibility
  unit: string;
  status: "active" | "paused" | "completed";
  progress: number; // For backward compatibility
  // New database fields
  category?: string;
  current_value?: number;
  target_value?: number;
  progress_percentage?: number;
  plan?: any;
  user_id?: string;
  start_date?: string;
  target_date?: string;
  created_at?: string;
  updated_at?: string;
  color?: string; // Goal color for visual identification
}