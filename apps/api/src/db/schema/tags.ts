import { pgTable, text, unique } from "drizzle-orm/pg-core";
import { notes } from "./notes";
import { users } from "./users";

export const tags = pgTable(
  "Tag",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [unique("Tag_owner_id_name_unique").on(table.ownerId, table.name)],
);

export const noteTags = pgTable(
  "Note tag",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [unique("Note_tag_note_id_tag_id_unique").on(table.noteId, table.tagId)],
);
