import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../api/src/trpc/app.router";

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      fetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
    }),
  ],
});
