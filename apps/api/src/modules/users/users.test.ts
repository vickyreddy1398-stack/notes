import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool } from "../../db";
import { sessions, users } from "../../db/schema";
import { appRouter } from "../../trpc/app.router";
import { createCallerFactory } from "../../trpc/trpc";
import { createUsersService, verifyPassword } from "./users.service";

describe("users sign up", () => {
  beforeAll(async () => {
    await db.delete(sessions);
    await db.delete(users);
  });
  afterAll(async () => {
    await pool.end();
  });

  it("does not expose the bearer session token in the sign-up response", async () => {
    const caller = createCallerFactory(appRouter)({ userId: null });
    const result = await caller.users.signUp({
      email: "response@example.com",
      password: "secret",
    });

    expect(result.session).not.toHaveProperty("token");
  });

  it("creates a protected account and a valid seven-day session", async () => {
    const caller = createCallerFactory(appRouter)({ userId: null });
    const result = await caller.users.signUp({ email: "Mixed@Example.COM", password: "secret" });
    const [user] = await db.select().from(users).where(eq(users.id, result.user.id));
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, result.session.id), eq(sessions.userId, result.user.id)));
    expect(user?.email).toBe("mixed@example.com");
    expect(user?.passwordHash).not.toBe("secret");
    expect(await verifyPassword("secret", user?.passwordHash ?? "")).toBe(true);
    expect(session?.token).toBeTruthy();
    expect(session?.expiresAt.getTime() - session?.createdAt.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    await expect(createUsersService(db).getUserByToken(session?.token)).resolves.toMatchObject({
      id: result.user.id,
    });
  });
});
