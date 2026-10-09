import { protectedProcedure, router } from "../../trpc/trpc";
import { createNotesService } from "./notes.service";
import { createNoteInput, getNoteInput, listNotesInput, noteIdInput } from "./notes.types";

export const notesRouter = router({
  list: protectedProcedure
    .input(listNotesInput.optional())
    .query(({ ctx, input }) => createNotesService(ctx.db).list(ctx.userId, input)),
  get: protectedProcedure
    .input(getNoteInput)
    .query(({ ctx, input }) => createNotesService(ctx.db).getOwned(ctx.userId, input.id)),
  archived: protectedProcedure.query(({ ctx }) => createNotesService(ctx.db).archived(ctx.userId)),
  restore: protectedProcedure
    .input(noteIdInput)
    .mutation(({ ctx, input }) => createNotesService(ctx.db).restore(ctx.userId, input.id)),
  create: protectedProcedure
    .input(createNoteInput)
    .mutation(({ ctx, input }) => createNotesService(ctx.db).create(ctx.userId, input)),
});
