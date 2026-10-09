import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { Db } from "../../db";
import { notes } from "../../db/schema";
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
