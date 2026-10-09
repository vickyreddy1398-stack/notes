import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../env";
import * as schema from "./schema";

export const pool = new pg.Pool({
  host: env.DB_IP,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_DATABASE,
});

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;
