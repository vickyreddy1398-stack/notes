# AGENTS.md — how we build here

This repo is built **one GitHub issue at a time by autonomous agents** — a coder, an advisor
that approves the coder's plan, and a cold reviewer that reads the finished diff. No human is
in the loop. This file is the **house rulebook**: the coder follows it, the advisor and the
reviewer judge against it, and nothing outside it is a rule. Code must read as if one author
wrote all of it.

## 1 · Shape — slice by DOMAIN, never by technical layer

```
apps/api/src/
  modules/<domain>/
    <domain>.types.ts     Zod schemas — the ONE source of truth; types are z.infer'd
    <domain>.service.ts   business logic; createXService(db) factory; throws AppError
    <domain>.router.ts    tRPC procedures; thin — call the service, return its result
    <domain>.test.ts      real-Postgres tests through the router's createCaller
  db/schema/<domain>.ts   Drizzle tables for that domain (re-exported from db/schema/index.ts)
  db/migrations/          GENERATED — never hand-edited
  lib/errors.ts           AppError + helpers (notFound, conflict, badRequest, …)
  trpc/trpc.ts            router, publicProcedure, protectedProcedure, the ONE error translator
  trpc/app.router.ts      merges every module router
apps/web/src/
  screens/<screen>/       one folder per screen: <screen>.page.tsx
  lib/trpc.ts             the ONE client the web uses to call the API
apps/web/tests/           <screen>.browser.test.ts — Playwright, real browser
```

An issue's **`domain`** field names where you work: `modules/<domain>/`,
`db/schema/<domain>.ts`, and the matching screen under `apps/web/src/screens/`.

## 2 · The layers — exactly who does what

**Types** (`<domain>.types.ts`) — Zod schemas and `z.infer` types. Imports **nothing but
`zod`**: the web imports these files too, so they must stay browser-safe.

**Service** (`<domain>.service.ts`) — all business logic and every database query.
`createXService(db)` returns an object of async functions. A service **throws an `AppError`**
for every business outcome that is not success. It never returns a "no row" sentinel
(`null`, `undefined`, `false`) for its caller to interpret, and never imports `@trpc/server`.

```ts
import { and, eq } from "drizzle-orm";
import { notFound } from "../../lib/errors";

async getOwned(ownerId: string, id: string) {
  const [note] = await db.select().from(notes)
    .where(and(eq(notes.id, id), eq(notes.ownerId, ownerId)));
  if (!note) throw notFound("note"); // missing AND not-yours: the same answer
  return note;
}
```

**Router** (`<domain>.router.ts`) — thin: pick the procedure, validate the input with the
domain's Zod schema, call the service, return its result. Nothing else. A router does **not**
build `TRPCError`s for business outcomes and does **not** check `ctx.userId` by hand —
`protectedProcedure` does that.

```ts
export const notesRouter = router({
  get: protectedProcedure.input(getNoteInput)
    .query(({ ctx, input }) => createNotesService(ctx.db).getOwned(ctx.userId, input.id)),
});
```

**Errors** — the ONE translator lives in `trpc/trpc.ts`: every procedure built from
`publicProcedure` / `protectedProcedure` turns a thrown `AppError` into the tRPC error with the
same code and message. Add a new case to `lib/errors.ts`; never translate errors anywhere else.

## 3 · Rules every issue is held to

- **Signed-in work uses `protectedProcedure`.** It rejects a signed-out caller with
  `UNAUTHORIZED` and gives you `ctx.userId` as a string. The session cookie is resolved into
  `ctx.userId` once, in `app.ts`'s `createContext` — never read cookies in a router.
- **Scope every query by the owner.** Every read and write of user-owned data filters on the
  signed-in user's id **in the query itself**. Another user's row must behave **exactly** like
  a row that does not exist — the same `notFound(...)`, the same code, the same message — and a
  test must prove both cases give the identical error.
- **One Zod schema** validates the form, the tRPC input, and gives the inferred type. The web
  imports the schema from `apps/api/src/modules/<domain>/<domain>.types.ts` (relative import)
  and runs it on submit; HTML attributes like `maxLength` only supplement it.
- **Schema changes:** edit `db/schema/<domain>.ts`, then run `pnpm db:generate`. Commit the
  generated migration. Never hand-write or hand-edit migration SQL.
- **No absolute paths.** Never write this checkout's path or any absolute path into code,
  config, scripts or tests — the repo is checked out somewhere else on the merge gate and on
  every machine. Resolve from the file's own location; Playwright `webServer` uses a relative
  `cwd` (`cwd: "../api"`).
- **Discrete env vars** `DB_IP DB_PORT DB_USER DB_PASSWORD DB_DATABASE`, read only in `env.ts`.
- **kebab-case files** named `name.whatiam.ts`. No `utils/` folder — shared code goes in `lib/`.

## 4 · Tests — real, first, and proving every "Done when"

- **Test first:** write the failing test, then the code. Every "Done when" and acceptance
  point in the issue is proven by a test you can name.
- **API tests** call the router through `createCaller` with a real Postgres (running and
  empty in the sandbox; run `pnpm db:migrate` first). Build the caller with the context the
  procedure needs: `{ userId, db }` for signed-in work, `{ userId: null, db }` to prove
  `UNAUTHORIZED`. No mocks of our own code.
- **Browser tests** (`apps/web/tests/<screen>.browser.test.ts`, `@playwright/test` pinned to the
  version in `apps/web/package.json`) prove what a user sees or does on a screen. They run
  inside `pnpm test`. To act as a signed-in user, **sign up through the real UI** with a unique
  email (`` `who-${Date.now()}@example.com` ``) — there is no test-only login seam, and none
  is needed.
- **Owner-scope tests** always cover three callers: the owner (works), another signed-in user
  (gets the not-found error), and a missing id (gets the *same* error).

## 5 · What an approvable plan contains

The advisor approves a plan that names, for this issue:

1. the files it will create or change, per layer (types · service · router · schema · screen);
2. the tests it writes first, one or more per "Done when", including the owner-scope trio
   when user data is read or written;
3. which `AppError`s the service throws, and that the router stays thin;
4. any schema change and that its migration is generated;
5. how a browser test reaches the screen (sign up through the UI) when the issue is visual.

**Advisor:** judge the plan against the issue and this file only. In your first ruling, list
**every** change you require — you will not get to add new requirements later. In a second
ruling you check only that your first ruling's notes were addressed; anything new you notice
is guidance for the coder, not a reason to reject.

## 6 · Before you finish

`pnpm test`, `pnpm lint` and `pnpm typecheck` must all pass. `pnpm lint:fix` fixes formatting.
Do not push and do not touch git history — the build machine publishes your work.
