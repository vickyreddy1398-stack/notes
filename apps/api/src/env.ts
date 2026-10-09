import { z } from "zod";

/** The only place process.env is read. Discrete DB_* values — never a URL string. */
const schema = z.object({
  PORT: z.coerce.number().default(3001),
  DB_IP: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default("app"),
  DB_PASSWORD: z.string().default("app"),
  DB_DATABASE: z.string().default("app"),
});

export const env = schema.parse(process.env);
