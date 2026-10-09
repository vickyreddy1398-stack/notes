import { z } from "zod";

export const NOTE_TITLE_MAX = 200;
export const NOTE_BODY_MAX = 10_000;
export const NOTE_TAGS_MAX = 10;

const normalizedTags = z
  .string()
  .default("")
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]);

export const createNoteInput = z.object({
  title: z.string().min(1, "Title is required").max(NOTE_TITLE_MAX, "Title is too long"),
  body: z.string().max(NOTE_BODY_MAX, "Body is too long").optional(),
  tags: normalizedTags.optional().refine((value) => !value || value.length <= NOTE_TAGS_MAX, {
    message: "At most 10 tags are allowed",
  }),
});
export type CreateNoteInput = z.infer<typeof createNoteInput>;

export const getNoteInput = z
  .object({
    id: z.string().min(1),
  })
  .strict();
export type GetNoteInput = z.infer<typeof getNoteInput>;

export const noteIdInput = z.object({ id: z.string().min(1) }).strict();
export type NoteIdInput = z.infer<typeof noteIdInput>;

export const updateNoteInput = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required").max(NOTE_TITLE_MAX, "Title is too long"),
  body: z.string().max(NOTE_BODY_MAX, "Body is too long"),
  tags: normalizedTags.refine((value) => value.length <= NOTE_TAGS_MAX, {
    message: "At most 10 tags are allowed",
  }),
});
export type UpdateNoteInput = z.infer<typeof updateNoteInput>;

const unfilteredNotesInput = z.object({}).strict();
const searchedNotesInput = z.object({ search: z.string().min(1) }).strict();
const taggedNotesInput = z.object({ tagId: z.string().min(1) }).strict();

/** Exactly one active-list mode: all notes, a text search, or one tag. */
export const listNotesInput = z.union([unfilteredNotesInput, searchedNotesInput, taggedNotesInput]);
export type ListNotesInput = z.infer<typeof listNotesInput>;
