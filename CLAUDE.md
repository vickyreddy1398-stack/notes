# How we build here

This repo is built **one GitHub issue at a time by autonomous agents**. There is no human
in the loop. Read this file first; follow it exactly. Code must look like it was written
by one author.

## Shape — slice by DOMAIN, never by technical layer

```
apps/api/src/
  modules/<domain>/
    <domain>.types.ts     Zod schemas — the ONE source of truth; types are z.infer'd
    <domain>.service.ts   business logic; createXService(db) factory; throws typed errors
    <domain>.router.ts    tRPC procedures; thin — validate, call service, return
    <domain>.test.ts      real-Postgres tests through the router's createCaller
  db/schema/<domain>.ts   Drizzle tables for that domain (re-exported from db/schema/index.ts)
  db/migrations/          GENERATED — never hand-edited
  trpc/app.router.ts      merges every module router
apps/web/src/
  screens/<screen>/       one folder per screen; <screen>.page.tsx + <screen>.test.tsx
  lib/trpc.ts             the tRPC client
```

An issue's **`domain`** field names the folder you work in: `modules/<domain>/`,
`db/schema/<domain>.ts`, and the matching screen under `apps/web/src/screens/`.

## Rules

- **Scope every query by the owner.** Every read/write of user-owned data filters on the
  signed-in user's id. Another user's row must behave exactly like "not found".
- **One Zod schema** validates the form, the tRPC input, and gives the inferred type.
- **Schema changes:** edit `db/schema/<domain>.ts`, then run `pnpm db:generate` to produce the
  migration. Commit the generated migration. Never hand-write or hand-edit migration SQL.
- **Tests are real.** Postgres is running and empty in your sandbox (`DB_*` env is set).
  Call `pnpm db:migrate` before tests that need tables. No mocks of our own code.
- **Test first.** Write the failing test, then the code. Every "Done when" in the issue
  must be proven by a test.
- **Discrete env vars** `DB_IP DB_PORT DB_USER DB_PASSWORD DB_DATABASE` — read only in `env.ts`.
- **kebab-case files** named `name.whatiam.ts`. No `utils/` folder.

## Before you finish

`pnpm test`, `pnpm lint` and `pnpm typecheck` must all pass. `pnpm lint:fix` fixes formatting.
