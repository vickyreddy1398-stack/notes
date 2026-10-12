# The generated app's production images — one file, two targets (docker-compose.yml picks):
#   api  the Express + tRPC server; applies every migration, then serves on :3001
#   web  the built SPA on nginx, with /api forwarded to the api (deploy/nginx.conf)
# The whole workspace is installed once: the web build imports the api's Zod schemas.

FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
# Manifests first, so a code-only change reuses the installed dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY . .

FROM deps AS web-build
RUN pnpm --filter web build

FROM deps AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3001
# Migrate-then-serve on every start: a deploy that adds a migration needs no extra step,
# and the migrator skips what is already applied.
CMD ["sh", "-c", "pnpm db:migrate && exec pnpm exec tsx src/server.ts"]

FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
