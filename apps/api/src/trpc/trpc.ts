import { initTRPC } from "@trpc/server";
import type { Request, Response } from "express";
import type { Db } from "../db";

export type Context = {
  userId: string | null;
  db?: Db;
  req?: Request;
  res?: Response;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
