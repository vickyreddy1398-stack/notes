import { healthRouter } from "../modules/health/health.router";
import { usersRouter } from "../modules/users/users.router";
import { router } from "./trpc";

/** Every module router is merged here. */
export const appRouter = router({
  health: healthRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
