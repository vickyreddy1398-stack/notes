import { publicProcedure, router } from "../../trpc/trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ ok: true as const })),
});
