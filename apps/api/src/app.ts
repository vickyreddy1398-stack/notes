import {
  type CreateExpressContextOptions,
  createExpressMiddleware,
} from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { db } from "./db";
import { createUsersService } from "./modules/users/users.service";
import { appRouter } from "./trpc/app.router";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const token = req.cookies?.session_token as string | undefined;
  const user = await createUsersService(db).getUserByToken(token);
  return {
    userId: user?.id ?? null,
    setSession: (value: string) =>
      res.cookie("session_token", value, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }),
  };
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}
