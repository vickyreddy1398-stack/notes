import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { sessions, users } from "../../db/schema";
import { createCallerFactory } from "../../trpc/trpc";
import { notesRouter } from "../notes/notes.router";
import { usersRouter } from "./users.router";
import { createUsersService } from "./users.service";

const callerFactory = createCallerFactory(usersRouter);
const notesCallerFactory = createCallerFactory(notesRouter);
const cookieResponse = () => ({ cookie: () => undefined }) as never;
const requestWithSession = (token: string) => ({ cookies: { session: token } }) as never;
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await db.delete(sessions);
  await db.delete(users);
});

describe("sessions", () => {
  it("creates a seven-day session when signing up", async () => {
    const email = `signup-session-${Date.now()}@example.com`;
    const created = await callerFactory({ db, userId: null, res: cookieResponse() }).signUp({
      email,
      password: "correct password",
    });
    const [session] = await db.select().from(sessions).where(eq(sessions.userId, created.id));

    expect(session.id).toBeTruthy();
    expect(session.token).toBeTruthy();
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(sessionDurationMs);
    expect((await createUsersService(db).findUserBySession(session.token))?.id).toBe(created.id);
  });

  it("protects passwords and creates a seven-day session when signing in", async () => {
    const email = `signin-${Date.now()}@example.com`;
    const created = await callerFactory({ db, userId: null, res: cookieResponse() }).signUp({
      email,
      password: "correct password",
    });
    const existingSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, created.id));
    const signedIn = await callerFactory({ db, userId: null, res: cookieResponse() }).signIn({
      email,
      password: "correct password",
    });
    expect(signedIn).toEqual({ id: created.id, email });
    const [user] = await db.select().from(users).where(eq(users.id, created.id));
    expect(user.passwordHash).not.toBe("correct password");
    const sessionsAfterSignIn = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, created.id));
    const session = sessionsAfterSignIn.find(
      (candidate) => !existingSessions.some((existing) => existing.id === candidate.id),
    );
    if (!session) throw new Error("sign-in did not create a session");
    expect(session.token).toBeTruthy();
    expect(session.id).toBeTruthy();
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(sessionDurationMs);
    expect((await createUsersService(db).findUserBySession(session.token))?.id).toBe(created.id);
    await db
      .update(sessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(sessions.id, session.id));
    expect(await createUsersService(db).findUserBySession(session.token)).toBeNull();

    const expiredContext = {
      db,
      userId: null,
      req: requestWithSession(session.token),
      res: cookieResponse(),
    };
    await expect(callerFactory(expiredContext).currentUser()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("does not let a signed-out caller enter protected Notes routes", async () => {
    await expect(notesCallerFactory({ db, userId: null }).list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("does not authenticate an unknown email or wrong password", async () => {
    const email = `invalid-${Date.now()}@example.com`;
    await callerFactory({ db, userId: null, res: cookieResponse() }).signUp({
      email,
      password: "secret",
    });
    const context = { db, userId: null, res: cookieResponse() };
    await expect(callerFactory(context).signIn({ email, password: "wrong" })).rejects.toMatchObject(
      { code: "UNAUTHORIZED" },
    );
    await expect(
      callerFactory(context).signIn({ email: `${email}x`, password: "secret" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
