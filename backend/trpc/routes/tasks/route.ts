import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/backend/trpc/create-context";
import { fromTable, upsert, patch } from "@/lib/supabase";

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  time: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  completed: z.boolean(),
});

export const tasksRouter = createTRPCRouter({
  getTasks: publicProcedure.query(async () => {
    try {
      const tasks = await fromTable("tasks");
      return tasks.map((task) => {
        if (!task || typeof task !== 'object') {
          throw new Error('Invalid task data');
        }
        return TaskSchema.parse(task);
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      throw new Error("Failed to fetch tasks");
    }
  }),

  updateTask: publicProcedure
    .input(z.object({
      id: z.string(),
      updates: TaskSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      try {
        const updatedCount = await patch("tasks", { id: input.id }, input.updates);
        if (updatedCount === 0) {
          throw new Error("Task not found");
        }
        return { success: true };
      } catch (error) {
        console.error("Error updating task:", error);
        throw new Error("Failed to update task");
      }
    }),

  createTask: publicProcedure
    .input(TaskSchema.omit({ id: true }))
    .mutation(async ({ input }) => {
      try {
        const newTask = { ...input, id: Date.now().toString() };
        await upsert("tasks", newTask);
        return newTask;
      } catch (error) {
        console.error("Error creating task:", error);
        throw new Error("Failed to create task");
      }
    }),

  deleteTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Note: Supabase doesn't have a direct delete via REST API in this setup
        // You might need to implement this differently or use RPC
        throw new Error("Delete not implemented");
      } catch (error) {
        console.error("Error deleting task:", error);
        throw new Error("Failed to delete task");
      }
    }),
});