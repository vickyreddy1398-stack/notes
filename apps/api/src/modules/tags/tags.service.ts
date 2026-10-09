import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../../db";
import { notes, noteTags, tags } from "../../db/schema";

export function createTagsService(db: Db) {
  return {
    async listUsed(ownerId: string) {
      return db
        .selectDistinct({ id: tags.id, name: tags.name })
        .from(tags)
        .innerJoin(noteTags, eq(noteTags.tagId, tags.id))
        .innerJoin(
          notes,
          and(eq(notes.id, noteTags.noteId), eq(notes.ownerId, ownerId), eq(notes.archived, false)),
        )
        .where(eq(tags.ownerId, ownerId))
        .orderBy(asc(tags.name), asc(tags.id));
    },
  };
}
