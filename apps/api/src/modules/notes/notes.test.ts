import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { notes, noteTags, tags } from "../../db/schema";
import { createCallerFactory } from "../../trpc/trpc";
import { tagsRouter } from "../tags/tags.router";
import { createUsersService } from "../users/users.service";
import { notesRouter } from "./notes.router";

const callerFactory = createCallerFactory(notesRouter);
const users = createUsersService(db);
type ErrorShape = { code: string; message: string };

async function captureError(promise: Promise<unknown>): Promise<ErrorShape> {
  try {
    await promise;
    throw new Error("expected promise to reject");
  } catch (error) {
    return error as ErrorShape;
  }
}

beforeAll(async () => {
  await db.delete(notes);
});

describe("notes", () => {
  it("pins and unpins only for the owner without changing updatedAt", async () => {
    const owner = await users.signUp({
      email: `pin-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `pin-other-${Date.now()}@example.com`,
      password: "password123",
    });
    const ownerCaller = callerFactory({ db, userId: owner.user.id });
    const otherCaller = callerFactory({ db, userId: other.user.id });
    const created = await ownerCaller.create({ title: "Pin me" });
    const [before] = await db.select().from(notes).where(eq(notes.id, created.id));

    await expect(ownerCaller.pin({ id: created.id })).resolves.toMatchObject({ pinned: true });
    const [pinned] = await db.select().from(notes).where(eq(notes.id, created.id));
    expect(pinned.pinned).toBe(true);
    expect(pinned.updatedAt).toEqual(before.updatedAt);

    await expect(ownerCaller.unpin({ id: created.id })).resolves.toMatchObject({ pinned: false });
    const [unpinned] = await db.select().from(notes).where(eq(notes.id, created.id));
    expect(unpinned.pinned).toBe(false);
    expect(unpinned.updatedAt).toEqual(before.updatedAt);

    const privateError = await captureError(otherCaller.pin({ id: created.id }));
    const missingError = await captureError(ownerCaller.pin({ id: "missing-pin-note" }));
    expect(privateError).toMatchObject({ code: "NOT_FOUND", message: "note not found" });
    expect(missingError).toMatchObject({ code: privateError.code, message: privateError.message });
    await expect(callerFactory({ db, userId: null }).pin({ id: created.id })).rejects.toMatchObject(
      {
        code: "UNAUTHORIZED",
      },
    );
  });
  it("persists a note with owner, active status, and timestamps", async () => {
    const { user } = await users.signUp({
      email: `note-${Date.now()}@example.com`,
      password: "password123",
    });
    const note = callerFactory({ db, userId: user.id });
    const created = await note.create({ title: "A title" });
    const [row] = await db.select().from(notes).where(eq(notes.id, created.id));
    expect(row).toMatchObject({
      id: created.id,
      title: "A title",
      body: null,
      ownerId: user.id,
      pinned: false,
      archived: false,
    });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it("stores literal plain text and enforces limits", async () => {
    const { user } = await users.signUp({
      email: `literal-${Date.now()}@example.com`,
      password: "password123",
    });
    const caller = callerFactory({ db, userId: user.id });
    const body = "<b>literal</b>\n![image](x)";
    const created = await caller.create({ title: "  unchanged  ", body });
    expect(created.body).toBe(body);
    await expect(caller.create({ title: "" })).rejects.toThrow();
    await expect(caller.create({ title: "x".repeat(201) })).rejects.toThrow();
    await expect(caller.create({ title: "ok", body: "x".repeat(10001) })).rejects.toThrow();
  });

  it("lists only active owner notes, pinned first, then updated and created newest-first", async () => {
    const first = await users.signUp({
      email: `list-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `list-other-${Date.now()}@example.com`,
      password: "password123",
    });
    const oldest = new Date("2025-01-01T00:00:00.000Z");
    const newer = new Date("2025-01-02T00:00:00.000Z");
    const newest = new Date("2025-01-03T00:00:00.000Z");
    await db.insert(notes).values([
      {
        id: "list-pinned-old",
        ownerId: first.user.id,
        title: "Pinned",
        pinned: true,
        createdAt: oldest,
        updatedAt: oldest,
      },
      {
        id: "list-updated",
        ownerId: first.user.id,
        title: "Updated",
        createdAt: oldest,
        updatedAt: newest,
      },
      {
        id: "list-tie-old",
        ownerId: first.user.id,
        title: "Tie old",
        createdAt: oldest,
        updatedAt: newer,
      },
      {
        id: "list-tie-new",
        ownerId: first.user.id,
        title: "Tie new",
        createdAt: newest,
        updatedAt: newer,
      },
      {
        id: "list-archived",
        ownerId: first.user.id,
        title: "Archived",
        archived: true,
        createdAt: newest,
        updatedAt: newest,
      },
      {
        id: "list-other",
        ownerId: other.user.id,
        title: "Other user",
        createdAt: newest,
        updatedAt: newest,
      },
    ]);

    const result = await callerFactory({ db, userId: first.user.id }).list();
    expect(result.map((note) => note.title)).toEqual(["Pinned", "Updated", "Tie new", "Tie old"]);
    expect(result.map((note) => note.body)).toEqual([null, null, null, null]);
    expect(result.every((note) => note.archived === false)).toBe(true);
    expect(await callerFactory({ db, userId: other.user.id }).list()).toHaveLength(1);
  });

  it("searches active owner notes by case-insensitive title or body substring", async () => {
    const owner = await users.signUp({
      email: `search-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `search-other-${Date.now()}@example.com`,
      password: "password123",
    });
    await db.insert(notes).values([
      { id: `search-title-${owner.user.id}`, ownerId: owner.user.id, title: "Quarterly PLAN" },
      {
        id: `search-body-${owner.user.id}`,
        ownerId: owner.user.id,
        title: "Unrelated title",
        body: "The planning notes are here",
      },
      {
        id: `search-archived-${owner.user.id}`,
        ownerId: owner.user.id,
        title: "Quarterly archived plan",
        archived: true,
      },
      { id: `search-other-${other.user.id}`, ownerId: other.user.id, title: "Quarterly plan" },
      { id: `search-wildcard-${owner.user.id}`, ownerId: owner.user.id, title: "%_\\" },
    ]);

    const ownerCaller = callerFactory({ db, userId: owner.user.id });
    const matching = await ownerCaller.list({ search: "PlAn" });
    expect(matching.map((note) => note.id).sort()).toEqual(
      [`search-body-${owner.user.id}`, `search-title-${owner.user.id}`].sort(),
    );
    expect(await ownerCaller.list({ search: "does not exist" })).toEqual([]);
    expect(await callerFactory({ db, userId: other.user.id }).list({ search: "plan" })).toEqual([
      expect.objectContaining({ id: `search-other-${other.user.id}` }),
    ]);
    expect((await ownerCaller.list({ search: "%_\\" })).map((note) => note.id)).toEqual([
      `search-wildcard-${owner.user.id}`,
    ]);
  });

  it("retrieves notes only for their owner", async () => {
    const { user: ownerA } = await users.signUp({
      email: `retrieve-a-${Date.now()}@example.com`,
      password: "password123",
    });
    const { user: ownerB } = await users.signUp({
      email: `retrieve-b-${Date.now()}@example.com`,
      password: "password123",
    });
    const callerA = callerFactory({ db, userId: ownerA.id });
    const callerB = callerFactory({ db, userId: ownerB.id });
    const noteA = await callerA.create({ title: "A private title", body: "A private body" });
    const noteB = await callerB.create({ title: "B private title", body: "B private body" });

    await expect(callerA.get({ id: noteA.id })).resolves.toMatchObject(noteA);
    await expect(callerB.get({ id: noteB.id })).resolves.toMatchObject(noteB);

    const errorA = await captureError(callerA.get({ id: noteB.id }));
    const errorB = await captureError(callerB.get({ id: noteA.id }));
    const missingA = await captureError(callerA.get({ id: "missing-note" }));
    const missingB = await captureError(callerB.get({ id: "missing-note" }));

    for (const error of [errorA, errorB, missingA, missingB]) {
      expect(error).toMatchObject({ code: "NOT_FOUND", message: "note not found" });
      expect(JSON.stringify(error)).not.toContain("private");
    }
    expect(errorA).toMatchObject({ code: errorB.code, message: errorB.message });
    expect(missingA).toMatchObject({ code: errorA.code, message: errorA.message });
    expect(missingB).toMatchObject({ code: errorB.code, message: errorB.message });
  });

  it("rejects unauthenticated retrieval", async () => {
    await expect(callerFactory({ db, userId: null }).get({ id: "any-note" })).rejects.toMatchObject(
      {
        code: "UNAUTHORIZED",
      },
    );
  });

  it("lists archived notes for the owner in updated-first order", async () => {
    const owner = await users.signUp({
      email: `archived-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `archived-other-${Date.now()}@example.com`,
      password: "password123",
    });
    const createdAt = new Date("2025-01-01T00:00:00.000Z");
    await db.insert(notes).values([
      {
        id: "archived-old",
        ownerId: owner.user.id,
        title: "Old",
        archived: true,
        createdAt,
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      },
      {
        id: "archived-tie-old",
        ownerId: owner.user.id,
        title: "Tie old",
        archived: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      },
      {
        id: "archived-tie-new",
        ownerId: owner.user.id,
        title: "Tie new",
        archived: true,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-01-02T00:00:00.000Z"),
      },
      {
        id: "archived-new",
        ownerId: owner.user.id,
        title: "New",
        archived: true,
        createdAt,
        updatedAt: new Date("2025-01-03T00:00:00.000Z"),
      },
      {
        id: "active",
        ownerId: owner.user.id,
        title: "Active",
        archived: false,
        createdAt,
        updatedAt: new Date("2025-01-04T00:00:00.000Z"),
      },
      {
        id: "archived-other",
        ownerId: other.user.id,
        title: "Other",
        archived: true,
        createdAt,
        updatedAt: new Date("2025-01-05T00:00:00.000Z"),
      },
    ]);

    const ownerCaller = callerFactory({ db, userId: owner.user.id });
    expect((await ownerCaller.archived()).map((note) => note.title)).toEqual([
      "New",
      "Tie old",
      "Tie new",
      "Old",
    ]);
    expect(await callerFactory({ db, userId: other.user.id }).archived()).toHaveLength(1);
    await expect(callerFactory({ db, userId: null }).archived()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("restores only the owner's archived note and hides other or missing notes", async () => {
    const owner = await users.signUp({
      email: `restore-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `restore-other-${Date.now()}@example.com`,
      password: "password123",
    });
    await db.insert(notes).values([
      { id: "restore-owned", ownerId: owner.user.id, title: "Owned", archived: true },
      { id: "restore-other", ownerId: other.user.id, title: "Other", archived: true },
    ]);
    const ownerCaller = callerFactory({ db, userId: owner.user.id });
    const otherCaller = callerFactory({ db, userId: other.user.id });
    const privateError = await captureError(otherCaller.restore({ id: "restore-owned" }));
    const missingError = await captureError(ownerCaller.restore({ id: "missing-note" }));
    expect(privateError).toMatchObject({ code: "NOT_FOUND", message: "note not found" });
    expect(missingError).toMatchObject({ code: privateError.code, message: privateError.message });
    await ownerCaller.restore({ id: "restore-owned" });
    expect((await ownerCaller.archived()).map((note) => note.id)).not.toContain("restore-owned");
    await expect(
      callerFactory({ db, userId: null }).restore({ id: "restore-other" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects combining search and tag filtering", async () => {
    const { user } = await users.signUp({
      email: `filter-input-${Date.now()}@example.com`,
      password: "password123",
    });
    await expect(
      callerFactory({ db, userId: user.id }).list({ tagId: "tag", search: "text" }),
    ).rejects.toThrow();
    await expect(callerFactory({ db, userId: user.id }).list({ tagId: "tag" })).resolves.toEqual(
      [],
    );
    await expect(callerFactory({ db, userId: user.id }).list({ search: "text" })).resolves.toEqual(
      [],
    );
    await expect(callerFactory({ db, userId: null }).list({ tagId: "tag" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("filters to one owned tag and excludes archived notes while preserving order", async () => {
    const { user } = await users.signUp({
      email: `filter-${Date.now()}@example.com`,
      password: "password123",
    });
    const [work] = await db
      .insert(tags)
      .values({ id: `tag-${user.id}`, ownerId: user.id, name: "work" })
      .returning();
    const [unused] = await db
      .insert(tags)
      .values({ id: `unused-${user.id}`, ownerId: user.id, name: "unused" })
      .returning();
    await db.insert(notes).values([
      {
        id: `tagged-${user.id}`,
        ownerId: user.id,
        title: "Tagged",
        createdAt: new Date("2025-01-02"),
        updatedAt: new Date("2025-01-02"),
      },
      { id: `archived-${user.id}`, ownerId: user.id, title: "Archived", archived: true },
      {
        id: `untagged-${user.id}`,
        ownerId: user.id,
        title: "Untagged",
        createdAt: new Date("2025-01-03"),
        updatedAt: new Date("2025-01-03"),
      },
    ]);
    await db.insert(noteTags).values({ noteId: `tagged-${user.id}`, tagId: work.id });

    const caller = callerFactory({ db, userId: user.id });
    expect((await caller.list({ tagId: work.id })).map((note) => note.title)).toEqual(["Tagged"]);
    expect((await caller.list()).map((note) => note.title)).not.toContain("Archived");
    expect(await caller.list({ tagId: unused.id })).toEqual([]);
  });

  it("permanently deletes an owned note, cascades associations, and removes unused filter tags", async () => {
    const { user: owner } = await users.signUp({
      email: `delete-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const [unusedTag, usedTag] = await db
      .insert(tags)
      .values([
        { id: `delete-unused-${owner.id}`, ownerId: owner.id, name: "unused" },
        { id: `delete-used-${owner.id}`, ownerId: owner.id, name: "used" },
      ])
      .returning();
    const ownerCaller = callerFactory({ db, userId: owner.id });
    const deleted = await ownerCaller.create({ title: "Delete me" });
    const remaining = await ownerCaller.create({ title: "Keep me" });
    await db.insert(noteTags).values([
      { noteId: deleted.id, tagId: unusedTag.id },
      { noteId: deleted.id, tagId: usedTag.id },
      { noteId: remaining.id, tagId: usedTag.id },
    ]);

    await expect(ownerCaller.delete({ id: deleted.id })).resolves.toMatchObject({ id: deleted.id });
    expect(await db.select().from(notes).where(eq(notes.id, deleted.id))).toEqual([]);
    expect(await db.select().from(noteTags).where(eq(noteTags.noteId, deleted.id))).toEqual([]);
    const filterTags = await createCallerFactory(tagsRouter)({ db, userId: owner.id }).list();
    expect(filterTags.map((tag) => tag.name)).toEqual(["used"]);
  });

  it("only allows the owner to permanently delete and rejects unauthenticated callers", async () => {
    const owner = await users.signUp({
      email: `delete-auth-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `delete-auth-other-${Date.now()}@example.com`,
      password: "password123",
    });
    const ownerCaller = callerFactory({ db, userId: owner.user.id });
    const otherCaller = callerFactory({ db, userId: other.user.id });
    const note = await ownerCaller.create({ title: "Private delete" });
    const otherError = await captureError(otherCaller.delete({ id: note.id }));
    const missingError = await captureError(ownerCaller.delete({ id: "missing-delete" }));
    expect(otherError).toMatchObject({ code: "NOT_FOUND", message: "note not found" });
    expect(otherError).toMatchObject({ code: missingError.code, message: missingError.message });
    await expect(ownerCaller.get({ id: note.id })).resolves.toMatchObject({ id: note.id });
    await expect(callerFactory({ db, userId: null }).delete({ id: note.id })).rejects.toMatchObject(
      {
        code: "UNAUTHORIZED",
      },
    );
  });

  it("explicitly saves owner edits, updates only updatedAt, and hides non-owned notes", async () => {
    const owner = await users.signUp({
      email: `update-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `update-other-${Date.now()}@example.com`,
      password: "password123",
    });
    const ownerCaller = callerFactory({ db, userId: owner.user.id });
    const otherCaller = callerFactory({ db, userId: other.user.id });
    const created = await ownerCaller.create({ title: "Original", body: "Original body" });
    const before = (await db.select().from(notes).where(eq(notes.id, created.id)))[0];
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = await ownerCaller.update({
      id: created.id,
      title: "<b>Saved</b>",
      body: "![literal](x)",
    });
    expect(updated).toMatchObject({
      id: created.id,
      title: "<b>Saved</b>",
      body: "![literal](x)",
      createdAt: before.createdAt,
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(await db.select().from(notes).where(eq(notes.id, created.id))).toMatchObject([updated]);

    const otherError = await captureError(
      otherCaller.update({ id: created.id, title: "Nope", body: "" }),
    );
    const missingError = await captureError(
      ownerCaller.update({ id: "missing-update", title: "Nope", body: "" }),
    );
    expect(otherError).toMatchObject({ code: "NOT_FOUND", message: "note not found" });
    expect(missingError).toMatchObject({ code: otherError.code, message: otherError.message });
    await expect(
      callerFactory({ db, userId: null }).update({ id: created.id, title: "Nope", body: "" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("validates update content before saving", async () => {
    const { user } = await users.signUp({
      email: `update-validation-${Date.now()}@example.com`,
      password: "password123",
    });
    const caller = callerFactory({ db, userId: user.id });
    const note = await caller.create({ title: "Valid" });
    await expect(caller.update({ id: note.id, title: "", body: "" })).rejects.toThrow();
    await expect(
      caller.update({ id: note.id, title: "x".repeat(201), body: "" }),
    ).rejects.toThrow();
    await expect(
      caller.update({ id: note.id, title: "Valid", body: "x".repeat(10001) }),
    ).rejects.toThrow();
    await expect(caller.get({ id: note.id })).resolves.toMatchObject({
      title: "Valid",
      body: null,
    });
  });

  it("rejects unauthenticated creation", async () => {
    await expect(callerFactory({ db, userId: null }).create({ title: "no" })).rejects.toThrow();
  });
});
