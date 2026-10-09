import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { notes } from "../../db/schema";
import { createCallerFactory } from "../../trpc/trpc";
import { createUsersService } from "../users/users.service";
import { notesRouter } from "./notes.router";

const callerFactory = createCallerFactory(notesRouter);
const users = createUsersService(db);

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

  it("rejects unauthenticated creation", async () => {
    await expect(callerFactory({ db, userId: null }).create({ title: "no" })).rejects.toThrow();
  });
});
