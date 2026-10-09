import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "../../db";
import { sessions, users } from "../../db/schema";
import type { SignUpInput } from "./users.types";

const scrypt = promisify(scryptCallback);
const SESSION_DAYS = 7;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export function createUsersService(db: Db) {
  return {
    async signUp(input: SignUpInput) {
      const email = input.email.toLowerCase();
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      const [user] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          email,
          passwordHash: await hashPassword(input.password),
          createdAt,
        })
        .returning();
      const token = randomBytes(32).toString("hex");
      const [session] = await db
        .insert(sessions)
        .values({
          id: randomUUID(),
          userId: user.id,
          token,
          expiresAt,
          createdAt,
        })
        .returning();
      return { user, session };
    },
    async findUserBySession(token: string) {
      const result = await db
        .select({ user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
        .limit(1);
      return result[0]?.user ?? null;
    },
  };
}

export const sessionMaxAge = SESSION_DAYS * 24 * 60 * 60;
