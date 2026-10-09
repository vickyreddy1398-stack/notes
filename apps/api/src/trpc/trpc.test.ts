import { describe, expect, it } from "vitest";
import { db } from "../db";
import { notFound } from "../lib/errors";
import { createCallerFactory, protectedProcedure, publicProcedure, router } from "./trpc";

// The house primitives every module builds on (AGENTS.md §2–3), proven once here.
const probe = router({
  missing: publicProcedure.query(() => {
    throw notFound("note");
  }),
  whoAmI: protectedProcedure.query(({ ctx }) => ctx.userId),
});
const callerFor = (userId: string | null) => createCallerFactory(probe)({ userId, db });

describe("trpc house primitives", () => {
  it("translates a service's AppError into the tRPC error with the same code and message", async () => {
    await expect(callerFor("u1").missing()).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "note not found",
    });
  });

  it("protectedProcedure refuses a signed-out caller and hands a signed-in one its id", async () => {
    await expect(callerFor(null).whoAmI()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(callerFor("u1").whoAmI()).resolves.toBe("u1");
  });
});
