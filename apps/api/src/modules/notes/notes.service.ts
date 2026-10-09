import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { Db } from "../../db";
import { notes, noteTags, tags } from "../../db/schema";
import { notFound } from "../../lib/errors";
import type { CreateNoteInput, ListNotesInput } from "./notes.types";

function escapeLike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function createNotesService(db: Db) {
  return {
    async list(ownerId: string, input: ListNotesInput = {}) {
      const activeOwnerConditions = [eq(notes.ownerId, ownerId), eq(notes.archived, false)];
      const order = [
        desc(notes.pinned),
        desc(notes.updatedAt),
        desc(notes.createdAt),
        desc(notes.id),
      ] as const;

      if (input.tagId) {
        return db
          .select({
            id: notes.id,
            ownerId: notes.ownerId,
            title: notes.title,
            body: notes.body,
            pinned: notes.pinned,
            archived: notes.archived,
            createdAt: notes.createdAt,
            updatedAt: notes.updatedAt,
          })
          .from(notes)
          .innerJoin(noteTags, eq(noteTags.noteId, notes.id))
          .innerJoin(tags, eq(tags.id, noteTags.tagId))
          .where(
            and(
              ...activeOwnerConditions,
              eq(noteTags.tagId, input.tagId),
              eq(tags.ownerId, ownerId),
            ),
          )
          .orderBy(...order);
      }

      const conditions = [...activeOwnerConditions];
      if (input.search) {
        const search = `%${escapeLike(input.search)}%`;
        const searchCondition = or(ilike(notes.title, search), ilike(notes.body, search));
        if (searchCondition) conditions.push(searchCondition);
      }
      return db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(...order);
    },

    async getOwned(ownerId: string, id: string) {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
      if (!note) throw notFound("note");
      return note;
    },

    async archived(ownerId: string) {
      return db
        .select()
        .from(notes)
        .where(and(eq(notes.ownerId, ownerId), eq(notes.archived, true)))
        .orderBy(desc(notes.updatedAt), desc(notes.createdAt), desc(notes.id));
    },

    async delete(ownerId: string, id: string) {
      const [note] = await db
        .delete(notes)
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async restore(ownerId: string, id: string) {
      const [note] = await db
        .update(notes)
        .set({ archived: false, updatedAt: new Date() })
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId), eq(notes.archived, true)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async create(ownerId: string, input: CreateNoteInput) {
      const [note] = await db
        .insert(notes)
        .values({
          id: randomUUID(),
          ownerId,
          title: input.title,
          body: input.body ?? null,
          archived: false,
        })
        .returning();
      return note;
    },
  };
}
