import { protectedProcedure, router } from "../../trpc/trpc";
import { createTagsService } from "./tags.service";

export const tagsRouter = router({
  list: protectedProcedure.query(({ ctx }) => createTagsService(ctx.db).listUsed(ctx.userId)),
});
