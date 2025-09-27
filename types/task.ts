export interface Task {
  id: string;
  title: string;
  time: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}