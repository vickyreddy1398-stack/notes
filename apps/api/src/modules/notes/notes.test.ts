import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { notes } from "../../db/schema";
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
  it("persists a note with owner and timestamps", async () => {
    const { user } = await users.signUp({
      email: `note-${Date.now()}@example.com`,
      password: "password123",
    });
    const note = callerFactory({ db, userId: user.id });
    const created = await note.create({ title: "A title" });
    const [row] = await db.select().from(notes).where(eq(notes.id, created.id));
    expect(row).toMatchObject({ id: created.id, title: "A title", body: null, ownerId: user.id });
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

  it("lists only the owner's notes in newest-first order", async () => {
    const first = await users.signUp({
      email: `list-owner-${Date.now()}@example.com`,
      password: "password123",
    });
    const other = await users.signUp({
      email: `list-other-${Date.now()}@example.com`,
      password: "password123",
    });
    const older = new Date("2025-01-01T00:00:00.000Z");
    const newer = new Date("2025-01-02T00:00:00.000Z");
    await db.insert(notes).values([
      {
        id: "list-older",
        ownerId: first.user.id,
        title: "Older",
        createdAt: older,
        updatedAt: older,
      },
      {
        id: "list-newer",
        ownerId: first.user.id,
        title: "Newer",
        createdAt: newer,
        updatedAt: newer,
      },
      {
        id: "list-other",
        ownerId: other.user.id,
        title: "Other user",
        createdAt: newer,
        updatedAt: newer,
      },
    ]);

    const result = await callerFactory({ db, userId: first.user.id }).list();
    expect(result.map((note) => note.title)).toEqual(["Newer", "Older"]);
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

  it("rejects unauthenticated creation", async () => {
    await expect(callerFactory({ db, userId: null }).create({ title: "no" })).rejects.toThrow();
  });
});
