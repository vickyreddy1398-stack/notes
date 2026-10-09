import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { db } from "./db";
import { createUsersService } from "./modules/users/users.service";
import { appRouter } from "./trpc/app.router";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: async ({ req, res }) => ({
        userId: req.cookies?.session
          ? ((await createUsersService(db).findUserBySession(req.cookies.session))?.id ?? null)
          : null,
        db,
        req,
        res,
      }),
    }),
  );
  return app;
}
