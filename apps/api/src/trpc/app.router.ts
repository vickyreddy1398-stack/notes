import { healthRouter } from "../modules/health/health.router";
import { notesRouter } from "../modules/notes/notes.router";
import { usersRouter } from "../modules/users/users.router";
import { router } from "./trpc";

/** Every module router is merged here. */
export const appRouter = router({
  health: healthRouter,
  users: usersRouter,
  notes: notesRouter,
});

export type AppRouter = typeof appRouter;
