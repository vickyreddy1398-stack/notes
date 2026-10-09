import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import type { Db } from "../db";
import { AppError } from "../lib/errors";

export type Context = {
  userId: string | null;
  db?: Db;
  req?: Request;
  res?: Response;
};

const t = initTRPC.context<Context>().create();

/**
 * The ONE place a typed business error becomes a tRPC error (AGENTS.md §2). A service throws
 * `AppError`; this turns it into the tRPC error with the same code and message. Anything else
 * a procedure throws stays a 500 whose details never reach the client.
 */
const translateErrors = t.middleware(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.cause instanceof AppError) {
    const { code, message } = result.error.cause;
    throw new TRPCError({ code, message, cause: result.error.cause });
  }
  return result;
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure.use(translateErrors);

/**
 * Signed-in work. Rejects a signed-out caller with UNAUTHORIZED and hands the procedure a
 * `ctx.userId` that is a string and a `ctx.db` that is present — so no router checks either.
 */
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "no database in the request context",
    });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId, db: ctx.db } });
});
