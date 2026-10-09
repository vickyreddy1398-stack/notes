import { protectedProcedure, router } from "../../trpc/trpc";
import { createNotesService } from "./notes.service";
import { createNoteInput, getNoteInput } from "./notes.types";

export const notesRouter = router({
  list: protectedProcedure.query(({ ctx }) => createNotesService(ctx.db).list(ctx.userId)),
  get: protectedProcedure
    .input(getNoteInput)
    .query(({ ctx, input }) => createNotesService(ctx.db).getOwned(ctx.userId, input.id)),
  create: protectedProcedure
    .input(createNoteInput)
    .mutation(({ ctx, input }) => createNotesService(ctx.db).create(ctx.userId, input)),
});
