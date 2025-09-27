import { createTRPCRouter } from "./create-context";
import { hiProcedure } from "./routes/example/hi/route";
import { tasksRouter } from "./routes/tasks/route";
import { goalsRouter } from "./routes/goals/route";
import { userRouter } from "./routes/user/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiProcedure,
  }),
  tasks: tasksRouter,
  goals: goalsRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;