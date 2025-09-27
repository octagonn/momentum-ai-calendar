import { createTRPCRouter } from "./create-context";
import { hiProcedure } from "./routes/example/hi/route";
import { tasksRouter } from "./routes/tasks/route";
import { goalsRouter } from "./routes/goals/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
  }),
  tasks: tasksRouter,
  goals: goalsRouter,
});

export type AppRouter = typeof appRouter;