import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

/** Applies every generated migration, in order, to the configured database. */
await migrate(db, { migrationsFolder: new URL("./migrations", import.meta.url).pathname });
await pool.end();
