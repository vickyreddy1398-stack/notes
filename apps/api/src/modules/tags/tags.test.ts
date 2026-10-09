import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { noteTags, tags, users as userTable } from "../../db/schema";
import { createNotesService } from "../notes/notes.service";
import { createUsersService } from "../users/users.service";

const users = createUsersService(db);
const notes = createNotesService(db);
const createdUserIds: string[] = [];

async function createUser(label: string) {
  const { user } = await users.signUp({
    email: `${label}-${randomUUID()}@example.com`,
    password: "password123",
  });
  createdUserIds.push(user.id);
  return user;
}

describe("tag persistence", () => {
  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await db.delete(userTable).where(inArray(userTable.id, createdUserIds));
    }
  });
  it("allows the same tag name for different owners and stores its columns", async () => {
    const ownerOne = await createUser("tag-owner-one");
    const ownerTwo = await createUser("tag-owner-two");
    const name = "work";

    const [first] = await db
      .insert(tags)
      .values({ id: randomUUID(), ownerId: ownerOne.id, name })
      .returning();
    const [second] = await db
      .insert(tags)
      .values({ id: randomUUID(), ownerId: ownerTwo.id, name })
      .returning();
    const stored = await db.select().from(tags).where(eq(tags.name, name));

    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.id, ownerId: ownerOne.id, name }),
        expect.objectContaining({ id: second.id, ownerId: ownerTwo.id, name }),
      ]),
    );
  });

  it("rejects duplicate tag names for one owner", async () => {
    const owner = await createUser("duplicate-tag-owner");
    const name = "personal";
    await db.insert(tags).values({ id: randomUUID(), ownerId: owner.id, name });

    await expect(
      db.insert(tags).values({ id: randomUUID(), ownerId: owner.id, name }),
    ).rejects.toThrow();
  });

  it("associates one tag with two notes and rejects a duplicate pair", async () => {
    const owner = await createUser("association-owner");
    const [tag] = await db
      .insert(tags)
      .values({ id: randomUUID(), ownerId: owner.id, name: "shared" })
      .returning();
    const noteOne = await notes.create(owner.id, { title: "First note" });
    const noteTwo = await notes.create(owner.id, { title: "Second note" });

    await db.insert(noteTags).values([
      { noteId: noteOne.id, tagId: tag.id },
      { noteId: noteTwo.id, tagId: tag.id },
    ]);
    const stored = await db.select().from(noteTags).where(eq(noteTags.tagId, tag.id));

    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ noteId: noteOne.id, tagId: tag.id }),
        expect.objectContaining({ noteId: noteTwo.id, tagId: tag.id }),
      ]),
    );
    await expect(
      db.insert(noteTags).values({ noteId: noteOne.id, tagId: tag.id }),
    ).rejects.toThrow();
  });

  it("rejects associations and tags that reference missing rows", async () => {
    const owner = await createUser("foreign-key-owner");
    const note = await notes.create(owner.id, { title: "Existing note" });
    const [tag] = await db
      .insert(tags)
      .values({ id: randomUUID(), ownerId: owner.id, name: "valid" })
      .returning();
    const missingId = randomUUID();

    await expect(
      db.insert(noteTags).values({ noteId: missingId, tagId: tag.id }),
    ).rejects.toThrow();
    await expect(
      db.insert(noteTags).values({ noteId: note.id, tagId: missingId }),
    ).rejects.toThrow();
    await expect(
      db.insert(tags).values({ id: randomUUID(), ownerId: missingId, name: "orphan" }),
    ).rejects.toThrow();
  });
});
