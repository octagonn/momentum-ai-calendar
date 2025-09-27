export interface Goal {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  status: "active" | "paused" | "completed";
  progress: number;
}