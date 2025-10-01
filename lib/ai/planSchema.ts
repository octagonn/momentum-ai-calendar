import { z } from "zod";

export const TaskZ = z.object({
  title: z.string(),
  notes: z.string().optional(),
  due_at: z.string(), // ISO 8601
  duration_minutes: z.number().int().positive().optional(),
  all_day: z.boolean().optional(),
  status: z.enum(['pending','done','skipped']).optional(),
  seq: z.number().int().optional(),
});

export const GoalZ = z.object({
  title: z.string(),
  description: z.string().optional(),
  target_date: z.string().optional(),
  status: z.enum(['active','paused','completed','archived']).optional(),
});

export const PlanZ = z.object({
  goal: GoalZ,
  tasks: z.array(TaskZ).min(1)
});

export type Plan = z.infer<typeof PlanZ>;
export type Task = z.infer<typeof TaskZ>;
export type Goal = z.infer<typeof GoalZ>;

// Interview fields schema
export const InterviewFieldsZ = z.object({
  goal_title: z.string(),
  target_date: z.string(), // ISO 8601
  days_per_week: z.number().int().min(1).max(7),
  session_minutes: z.number().int().positive(),
  preferred_days: z.array(z.string()),
  time_of_day: z.string().optional(), // HH:mm format or null
});

export type InterviewFields = z.infer<typeof InterviewFieldsZ>;

// Scheduled slot schema for client-side scheduling
export const ScheduledSlotZ = z.object({
  title: z.string(),
  due_at: z.string(), // ISO 8601
  duration_minutes: z.number().int().positive(),
  seq: z.number().int(),
});

export type ScheduledSlot = z.infer<typeof ScheduledSlotZ>;

