import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../db";
import { sessions, users } from "../../db/schema";
import { createCallerFactory } from "../../trpc/trpc";
import { usersRouter } from "./users.router";
import { createUsersService } from "./users.service";

const callerFactory = createCallerFactory(usersRouter);
const cookieResponse = () => ({ cookie: () => undefined }) as never;

beforeAll(async () => {
  await db.delete(sessions);
  await db.delete(users);
});

describe("sign in", () => {
  it("protects passwords and creates a seven-day session", async () => {
    const email = `signin-${Date.now()}@example.com`;
    const created = await callerFactory({ db, userId: null, res: cookieResponse() }).signUp({
      email,
      password: "correct password",
    });
    const signedIn = await callerFactory({ db, userId: null, res: cookieResponse() }).signIn({
      email,
      password: "correct password",
    });
    expect(signedIn).toEqual({ id: created.id, email });
    const [user] = await db.select().from(users).where(eq(users.id, created.id));
    expect(user.passwordHash).not.toBe("correct password");
    const [session] = await db.select().from(sessions).where(eq(sessions.userId, created.id));
    expect(session.token).toBeTruthy();
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect((await createUsersService(db).findUserBySession(session.token))?.id).toBe(created.id);
    await db
      .update(sessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(sessions.id, session.id));
    expect(await createUsersService(db).findUserBySession(session.token)).toBeNull();
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
