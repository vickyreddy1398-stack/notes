import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { appRouter } from "./trpc/app.router";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext: () => ({ userId: null }) }));
  return app;
}
