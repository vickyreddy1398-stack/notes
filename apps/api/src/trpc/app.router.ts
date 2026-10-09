import { healthRouter } from "../modules/health/health.router";
import { router } from "./trpc";

/** Every module router is merged here. */
export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
