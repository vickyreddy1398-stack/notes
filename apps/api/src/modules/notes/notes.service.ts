import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../../db";
import { notes } from "../../db/schema";
import { notFound } from "../../lib/errors";
import type { CreateNoteInput } from "./notes.types";

export function createNotesService(db: Db) {
  return {
    async list(ownerId: string) {
      return db
        .select()
        .from(notes)
        .where(eq(notes.ownerId, ownerId))
        .orderBy(desc(notes.createdAt), desc(notes.id));
    },

    async getOwned(ownerId: string, id: string) {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
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
        })
        .returning();
      return note;
    },
  };
}
