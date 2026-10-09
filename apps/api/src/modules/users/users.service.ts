import { scrypt as nodeScrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import type { Db } from "../../db";
import { sessions, users } from "../../db/schema";
import type { SignUpInput } from "./users.types";

const scrypt = promisify(nodeScrypt);
const SESSION_DAYS = 7;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [, salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return actual.toString("hex") === expected;
}

export function createUsersService(db: Db) {
  return {
    async signUp(input: SignUpInput) {
      const email = input.email.toLowerCase();
      const passwordHash = await hashPassword(input.password);
      const [user] = await db.insert(users).values({ email, passwordHash }).returning();
      if (!user) throw new Error("Unable to create account");
      const token = randomBytes(32).toString("base64url");
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      const [session] = await db
        .insert(sessions)
        .values({ userId: user.id, token, createdAt, expiresAt })
        .returning();
      if (!session) throw new Error("Unable to create session");
      return {
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
        session: {
          id: session.id,
          token: session.token,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      };
    },
    async getUserByToken(token: string | undefined) {
      if (!token) return null;
      const [row] = await db
        .select({ user: users, session: sessions })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.token, token))
        .limit(1);
      if (!row || row.session.expiresAt <= new Date()) return null;
      return row.user;
    },
  };
}
