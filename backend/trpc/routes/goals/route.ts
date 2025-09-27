import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/backend/trpc/create-context";
import { fromTable, upsert, patch, deleteFromTable } from "@/lib/supabase";

const GoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  current: z.number(),
  target: z.number(),
  unit: z.string(),
  status: z.enum(["active", "paused", "completed"]),
  progress: z.number(),
  plan: z.any().optional(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
});

const CreateGoalSchema = GoalSchema.omit({ id: true, progress: true });

export const goalsRouter = createTRPCRouter({
  getGoals: publicProcedure.query(async () => {
    try {
      const goals = await fromTable("momentum_goals");
      return goals.map((goal) => {
        if (!goal || typeof goal !== 'object') {
          throw new Error('Invalid goal data');
        }
        
        // Calculate progress percentage
        const progress = goal.target_value > 0 
          ? Math.round((goal.current_value / goal.target_value) * 100)
          : 0;
        
        // Map database fields to expected format
        const mappedGoal = {
          id: goal.id,
          title: goal.title,
          description: goal.description || '',
          current: goal.current_value,
          target: goal.target_value,
          unit: goal.unit,
          status: goal.status,
          progress: progress,
          plan: goal.plan,
          start_date: goal.start_date,
          target_date: goal.target_date,
        };
        
        return GoalSchema.parse(mappedGoal);
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
        // Map frontend fields to database fields
        const dbUpdates: any = {};
        if (input.updates.current !== undefined) dbUpdates.current_value = input.updates.current;
        if (input.updates.target !== undefined) dbUpdates.target_value = input.updates.target;
        if (input.updates.title !== undefined) dbUpdates.title = input.updates.title;
        if (input.updates.description !== undefined) dbUpdates.description = input.updates.description;
        if (input.updates.unit !== undefined) dbUpdates.unit = input.updates.unit;
        if (input.updates.status !== undefined) dbUpdates.status = input.updates.status;
        if (input.updates.plan !== undefined) dbUpdates.plan = input.updates.plan;
        if (input.updates.start_date !== undefined) dbUpdates.start_date = input.updates.start_date;
        if (input.updates.target_date !== undefined) dbUpdates.target_date = input.updates.target_date;

        const updatedCount = await patch("momentum_goals", { id: input.id }, dbUpdates);
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
    .input(CreateGoalSchema)
    .mutation(async ({ input }) => {
      try {
        // Map frontend fields to database fields
        const dbGoal = {
          title: input.title,
          description: input.description || null,
          current_value: input.current,
          target_value: input.target,
          unit: input.unit,
          status: input.status,
          plan: input.plan || null,
          start_date: input.start_date || null,
          target_date: input.target_date || null,
        };

        const newGoal = await upsert("momentum_goals", dbGoal);
        
        // Map back to frontend format
        const mappedGoal = {
          id: newGoal.id,
          title: newGoal.title,
          description: newGoal.description || '',
          current: newGoal.current_value,
          target: newGoal.target_value,
          unit: newGoal.unit,
          status: newGoal.status,
          progress: newGoal.target_value > 0 
            ? Math.round((newGoal.current_value / newGoal.target_value) * 100)
            : 0,
          plan: newGoal.plan,
          start_date: newGoal.start_date,
          target_date: newGoal.target_date,
        };
        
        return mappedGoal;
      } catch (error) {
        console.error("Error creating goal:", error);
        throw new Error("Failed to create goal");
      }
    }),

  deleteGoal: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const deletedCount = await deleteFromTable("momentum_goals", { id: input.id });
        if (deletedCount === 0) {
          throw new Error("Goal not found");
        }
        return { success: true };
      } catch (error) {
        console.error("Error deleting goal:", error);
        throw new Error("Failed to delete goal");
      }
    }),
});