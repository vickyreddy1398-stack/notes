import { describe, expect, it } from "vitest";
import { appRouter } from "../../trpc/app.router";
import { createCallerFactory } from "../../trpc/trpc";

describe("health", () => {
  it("answers ping", async () => {
    const caller = createCallerFactory(appRouter)({ userId: null });
    await expect(caller.health.ping()).resolves.toEqual({ ok: true });
  });
});
