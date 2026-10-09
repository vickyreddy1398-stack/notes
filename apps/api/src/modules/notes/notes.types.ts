import { z } from "zod";

export const NOTE_TITLE_MAX = 200;
export const NOTE_BODY_MAX = 10_000;

export const createNoteInput = z
  .object({
    title: z.string().min(1, "Title is required").max(NOTE_TITLE_MAX, "Title is too long"),
    body: z.string().max(NOTE_BODY_MAX, "Body is too long").optional(),
  })
  .strict();
export type CreateNoteInput = z.infer<typeof createNoteInput>;

export const getNoteInput = z
  .object({
    id: z.string().min(1),
  })
  .strict();
export type GetNoteInput = z.infer<typeof getNoteInput>;

export const noteIdInput = z.object({ id: z.string().min(1) }).strict();
export type NoteIdInput = z.infer<typeof noteIdInput>;

export const listNotesInput = z
  .object({ tagId: z.string().optional(), search: z.string().optional() })
  .strict()
  .refine(({ tagId, search }) => !(tagId && search), {
    message: "Search and tag filtering cannot be combined",
  });
export type ListNotesInput = z.infer<typeof listNotesInput>;
