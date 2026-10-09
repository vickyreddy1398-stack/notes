import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { notes, noteTags, tags } from "../../db/schema";
import { createCallerFactory } from "../../trpc/trpc";
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
    expect(await callerFactory({ db, userId: other.user.id }).list()).toHaveLength(1);
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
    expect((await ownerCaller.archived()).map((note) => note.title)).toEqual(["New", "Old"]);
    expect(await callerFactory({ db, userId: other.user.id }).archived()).toHaveLength(1);
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
    await expect(ownerCaller.restore({ id: "restore-other" })).rejects.toThrow("note not found");
    await expect(ownerCaller.restore({ id: "missing-note" })).rejects.toThrow("note not found");
    await ownerCaller.restore({ id: "restore-owned" });
    expect((await ownerCaller.archived()).map((note) => note.id)).not.toContain("restore-owned");

    await expect(callerFactory({ db, userId: null }).archived()).rejects.toThrow();
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

  it("rejects unauthenticated creation", async () => {
    await expect(callerFactory({ db, userId: null }).create({ title: "no" })).rejects.toThrow();
  });
});
