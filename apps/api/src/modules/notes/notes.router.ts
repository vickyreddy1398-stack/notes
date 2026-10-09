import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../../trpc/trpc";
import { createNotesService } from "./notes.service";
import { createNoteInput } from "./notes.types";

export const notesRouter = router({
  create: publicProcedure.input(createNoteInput).mutation(async ({ ctx, input }) => {
    if (!ctx.db || !ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    return createNotesService(ctx.db).create(ctx.userId, input);
  }),
});
