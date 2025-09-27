import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/backend/trpc/create-context";
import { fromTable, upsert, patch } from "@/lib/supabase";

const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  current: z.number(),
  target: z.number(),
  unit: z.string(),
  status: z.enum(["active", "paused", "completed"]),
  progress: z.number(),
});

export const goalsRouter = createTRPCRouter({
  getGoals: publicProcedure.query(async () => {
    try {
      const goals = await fromTable("goals");
      return goals.map((goal) => {
        if (!goal || typeof goal !== 'object') {
          throw new Error('Invalid goal data');
        }
        return GoalSchema.parse(goal);
      });
    } catch (error) {
      console.error("Error fetching goals:", error);
      throw new Error("Failed to fetch goals");
    }
  }),

  updateGoal: publicProcedure
    .input(z.object({
      id: z.string(),
      updates: GoalSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      try {
        const updatedCount = await patch("goals", { id: input.id }, input.updates);
        if (updatedCount === 0) {
          throw new Error("Goal not found");
        }
        return { success: true };
      } catch (error) {
        console.error("Error updating goal:", error);
        throw new Error("Failed to update goal");
      }
    }),

  createGoal: publicProcedure
    .input(GoalSchema.omit({ id: true }))
    .mutation(async ({ input }) => {
      try {
        const newGoal = { ...input, id: Date.now().toString() };
        await upsert("goals", newGoal);
        return newGoal;
      } catch (error) {
        console.error("Error creating goal:", error);
        throw new Error("Failed to create goal");
      }
    }),

  deleteGoal: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Note: Supabase doesn't have a direct delete via REST API in this setup
        // You might need to implement this differently or use RPC
        throw new Error("Delete not implemented");
      } catch (error) {
        console.error("Error deleting goal:", error);
        throw new Error("Failed to delete goal");
      }
    }),
});