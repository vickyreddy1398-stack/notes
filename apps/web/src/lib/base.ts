/// <reference types="vite/client" />
// Where this app lives in the URL. Deployed behind ABCD's front door it sits under its own
// prefix (http://<host>/<app>/…); in dev and tests it sits at the root. The prefix comes from
// the build (vite.config.ts `base`, from BASE_PATH) — never hard-code an app path: write
// appPath("/farmers"), and route on currentPath().

/** The prefix without its trailing slash: "/napm-azure", or "" at the root. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** An app path ("/farmers", "/api/trpc") as the browser must request it. */
export function appPath(p: string): string {
  return `${BASE}${p}`;
}

/** The current path with the prefix taken off — what the app routes on. */
export function currentPath(): string {
  const p = window.location.pathname;
  if (!BASE) return p;
  if (p === BASE) return "/";
  return p.startsWith(`${BASE}/`) ? p.slice(BASE.length) : p;
}
