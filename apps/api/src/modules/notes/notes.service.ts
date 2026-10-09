import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { Db } from "../../db";
import { notes, noteTags, tags } from "../../db/schema";
import { notFound } from "../../lib/errors";
import type { CreateNoteInput, ListNotesInput, UpdateNoteInput } from "./notes.types";

function escapeLike(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function getTagNames(db: Db, ownerId: string, noteId: string) {
  const rows = await db
    .select({ name: tags.name })
    .from(noteTags)
    .innerJoin(tags, and(eq(tags.id, noteTags.tagId), eq(tags.ownerId, ownerId)))
    .where(eq(noteTags.noteId, noteId));
  return rows.map((row) => row.name);
}

async function replaceTagLinks(db: Db, ownerId: string, noteId: string, names: string[] = []) {
  const tagIds: string[] = [];
  for (const name of names) {
    await db
      .insert(tags)
      .values({ id: randomUUID(), ownerId, name })
      .onConflictDoNothing({ target: [tags.ownerId, tags.name] });
    const [tag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.ownerId, ownerId), eq(tags.name, name)));
    tagIds.push(tag.id);
  }
  await db.delete(noteTags).where(eq(noteTags.noteId, noteId));
  if (tagIds.length > 0) {
    await db.insert(noteTags).values(tagIds.map((tagId) => ({ noteId, tagId })));
  }
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

      if ("tagId" in input) {
        const [ownedTag] = await db
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.id, input.tagId), eq(tags.ownerId, ownerId)));
        if (!ownedTag) throw notFound("tag");

        const filtered = await db
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
          .where(and(...activeOwnerConditions, eq(noteTags.tagId, ownedTag.id)))
          .orderBy(...order);
        return Promise.all(
          filtered.map(async (note) => ({
            ...note,
            tags: await getTagNames(db, ownerId, note.id),
          })),
        );
      }

      const conditions = [...activeOwnerConditions];
      if ("search" in input) {
        const search = `%${escapeLike(input.search)}%`;
        const searchCondition = or(ilike(notes.title, search), ilike(notes.body, search));
        if (searchCondition) conditions.push(searchCondition);
      }
      const listed = await db
        .select()
        .from(notes)
        .where(and(...conditions))
        .orderBy(...order);
      return Promise.all(
        listed.map(async (note) => ({ ...note, tags: await getTagNames(db, ownerId, note.id) })),
      );
    },

    async getOwned(ownerId: string, id: string) {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
      if (!note) throw notFound("note");
      return { ...note, tags: await getTagNames(db, ownerId, id) };
    },

    async archived(ownerId: string) {
      return db
        .select()
        .from(notes)
        .where(and(eq(notes.ownerId, ownerId), eq(notes.archived, true)))
        .orderBy(desc(notes.updatedAt), desc(notes.createdAt), desc(notes.id));
    },

    async pin(ownerId: string, id: string) {
      const [note] = await db
        .update(notes)
        .set({ pinned: true })
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async unpin(ownerId: string, id: string) {
      const [note] = await db
        .update(notes)
        .set({ pinned: false })
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async delete(ownerId: string, id: string) {
      const [note] = await db
        .delete(notes)
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async archive(ownerId: string, id: string) {
      const [note] = await db
        .update(notes)
        .set({ archived: true })
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId), eq(notes.archived, false)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async restore(ownerId: string, id: string) {
      const [note] = await db
        .update(notes)
        .set({ archived: false })
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId), eq(notes.archived, true)))
        .returning();
      if (!note) throw notFound("note");
      return note;
    },

    async update(ownerId: string, input: UpdateNoteInput) {
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(notes)
          .where(and(eq(notes.id, input.id), eq(notes.ownerId, ownerId)));
        if (!current) throw notFound("note");

        const currentNames = await getTagNames(tx as unknown as Db, ownerId, input.id);
        const currentSorted = [...currentNames].sort();
        const inputSorted = [...input.tags].sort();
        const tagsChanged =
          currentSorted.length !== inputSorted.length ||
          currentSorted.some((name, index) => name !== inputSorted[index]);
        const contentChanged = current.title !== input.title || current.body !== input.body;
        const [note] = await tx
          .update(notes)
          .set({
            title: input.title,
            body: input.body,
            ...(contentChanged || tagsChanged ? { updatedAt: new Date() } : {}),
          })
          .where(and(eq(notes.id, input.id), eq(notes.ownerId, ownerId)))
          .returning();

        if (tagsChanged) {
          await replaceTagLinks(tx as unknown as Db, ownerId, input.id, input.tags);
        }
        return note;
      });
    },

    async create(ownerId: string, input: CreateNoteInput) {
      return db.transaction(async (tx) => {
        const [note] = await tx
          .insert(notes)
          .values({
            id: randomUUID(),
            ownerId,
            title: input.title,
            body: input.body ?? null,
            archived: false,
          })
          .returning();
        await replaceTagLinks(tx as unknown as Db, ownerId, note.id, input.tags ?? []);
        return { ...note, tags: input.tags ?? [] };
      });
    },
  };
}
