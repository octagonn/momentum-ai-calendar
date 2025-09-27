import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { fromTable, upsert } from "@/lib/supabase";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  dayStreak: z.number(),
  activeGoals: z.number(),
  settings: z.object({
    goalReminders: z.boolean(),
    weeklyReports: z.boolean(),
    achievementBadges: z.boolean(),
  }),
  created_at: z.string(),
  updated_at: z.string(),
});

const CreateUserSchema = UserSchema.omit({ id: true, created_at: true, updated_at: true });

export const userRouter = createTRPCRouter({
  getUser: publicProcedure.query(async () => {
    try {
      // For now, return a default user since we don't have user authentication set up
      // In a real app, you would get the user ID from the session/auth context
      const defaultUser = {
        id: "default-user",
        name: "",
        email: "",
        dayStreak: 0,
        activeGoals: 0,
        settings: {
          goalReminders: true,
          weeklyReports: true,
          achievementBadges: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      return defaultUser;
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new Error("Failed to fetch user data");
    }
  }),

  updateUser: publicProcedure
    .input(z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      dayStreak: z.number().optional(),
      activeGoals: z.number().optional(),
      settings: z.object({
        goalReminders: z.boolean().optional(),
        weeklyReports: z.boolean().optional(),
        achievementBadges: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // For now, just return the updated user data
        // In a real app, you would update the user in the database
        const updatedUser = {
          id: "default-user",
          name: input.name || "",
          email: input.email || "",
          dayStreak: input.dayStreak || 0,
          activeGoals: input.activeGoals || 0,
          settings: {
            goalReminders: input.settings?.goalReminders ?? true,
            weeklyReports: input.settings?.weeklyReports ?? true,
            achievementBadges: input.settings?.achievementBadges ?? true,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        return updatedUser;
      } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user data");
      }
    }),
});
