# Monorepo API image (Express API + BullMQ workers). Keep this file at the repo
# root so the Docker build context includes bun.lock, the workspace package.json
# and packages/*.
#
# Dokploy: Build path / context = repository root (empty or "/"). Dockerfile path = "Dockerfile".
# Do not set build path to apps/server — that breaks workspace resolution.
#
ARG BUN_VERSION=1.3.12

FROM oven/bun:${BUN_VERSION} AS pruner
WORKDIR /app

ENV CI=true

COPY . .

RUN bunx turbo prune --scope=server --docker


FROM oven/bun:${BUN_VERSION} AS builder
WORKDIR /app

ENV CI=true

COPY --from=pruner /app/out/json/ .

# --ignore-scripts skips the root `postinstall` (db:generate). Unlike Prisma,
# Drizzle has no generated client: `drizzle-kit generate` only emits SQL
# migration files, and those are committed under packages/db. Nothing needs to
# be generated at build time — the migrations are copied in with the source.
RUN bun install --ignore-scripts

COPY --from=pruner /app/out/full/ .

RUN bun run turbo build --filter=server


FROM oven/bun:${BUN_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/apps/server/dist ./apps/server/dist
# Workspace symlinks in node_modules/@brnit/* point at packages/* (Bun's hoisted
# linker does not create apps/server/node_modules), so the package sources have
# to travel with the image or every @brnit/* import resolves to a dangling link.
# `turbo prune --scope=server` already narrowed packages/ to the server's
# dependency graph, and the one-shot `migrate` service runs drizzle-kit out of
# packages/db, which needs its schema, drizzle.config.ts and SQL migrations.
COPY --from=builder /app/packages ./packages

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["bun", "run", "dist/index.mjs"]
