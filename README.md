# brnit

Nutrition and diet-plan management. Nutritionists build meals and diet plans,
assign them to members of an organisation, and track body composition over
time; members follow their plan, log what they eat, swap items for
macro-equivalent alternatives, and keep a streak.

A Bun + Turborepo monorepo: an Express API, a Vite SPA, and an Expo app, over a
shared contract.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime / package manager | Bun 1.3, workspaces with a shared catalog |
| Monorepo | Turborepo |
| API | Express, `apps/server` |
| Web | Vite 6 + TanStack Router (SPA) |
| Native | Expo + Expo Router |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better Auth (admin + organization + expo plugins) |
| Jobs | BullMQ + Redis, separate worker process |
| Realtime | Socket.IO with a Redis adapter |
| Push | Firebase Cloud Messaging |
| Observability | pino, OpenTelemetry (opt-in) |
| Lint / format | Biome + Ultracite — tabs, double quotes |
| Dead code | Knip |

## Layout

```
apps/
  server/     Express API, BullMQ workers, Socket.IO
  web/        Vite + TanStack Router SPA
  native/     Expo app
packages/
  api/        zod schemas, DTOs and business handlers — the contract
  audit/      request-level audit-log writer
  auth/       Better Auth configuration, emails, permissions
  brand/      design tokens (TS + CSS)
  config/     shared tsconfig base
  datetime/   UTC calendar-date helpers
  db/         Drizzle schema, client, migrations
  domain/     framework-free domain rules
  env/        validated environment, split server / web / native
  logger/     pino + OpenTelemetry
  push/       Firebase send + shared schemas
  realtime/   socket event contracts
  ui/         shared React components
```

## The contract

`@brnit/api` is the single source of truth for the HTTP contract. Input schemas,
output DTOs and business handlers all live there, so the server and both clients
are checked against one definition.

- `apps/server` controllers are thin Express adapters: parse, build context,
  call the handler, respond.
- `apps/web` and `apps/native` import **types, schemas and pure helpers only** —
  never `@brnit/api/handlers/*` or `@brnit/api/db/*`, which would pull Drizzle
  into a client bundle.

Handlers stay free of infrastructure. One that needs to send an email, a push,
a realtime event or a job returns an *intent* alongside its DTO, and the
controller dispatches it after the handler returns, through a function that
cannot reject the request.

## Getting started

```bash
bun install
```

Copy the environment template and fill it in:

```bash
cp .env.compose.example apps/server/.env
```

At minimum you need `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` and
`CORS_ORIGIN`. Everything else is optional and the affected feature degrades
rather than crashing — see `packages/env/src/server.ts`, where every variable is
declared with a comment explaining its purpose.

Apply migrations, then start everything:

```bash
bun run db:migrate
bun run dev
```

- API — http://localhost:3000
- Web — http://localhost:3001
- Native — the Expo dev server; open it in Expo Go

## Scripts

| Command | Does |
| --- | --- |
| `bun run dev` | every app in watch mode |
| `bun run dev:server` / `dev:web` / `dev:native` | one app |
| `bun run dev:workers` | the BullMQ worker process |
| `bun run build` | build every app |
| `bun run check-types` | typecheck the whole workspace |
| `bun run test` | tests, one process per workspace |
| `bun run check` / `bun run fix` | lint and format |
| `bun run knip` | find unused files, exports and dependencies |
| `bun run compose:up` | the full stack in Docker |

### Database

| Command | Does |
| --- | --- |
| `bun run db:generate` | generate a migration from schema changes |
| `bun run db:migrate` | apply migrations |
| `bun run db:deploy` | apply migrations only — **does not seed** |
| `bun run db:studio` | open Drizzle Studio |
| `bun run db:seed` | **destructive** — see below |

> `db:seed` resets the food catalogue and cascades into meals, diet plans and
> their consumption and override rows. It is deliberately not part of
> `db:deploy` and refuses to run without an explicit path:
> `bun run --cwd packages/db db:seed -- /path/to/FoodData_Central_foundation_food.json`.

## Testing

`bun:test`, co-located as `*.test.ts` next to the subject.

Run tests **per workspace** — `bun run test` at the root is `turbo test`, which
gives each workspace its own process. Running `bun test packages/ apps/` in a
single command fails tests that pass in isolation: `mock.module` is process-wide
and permanent, so the server's route mocks leak into handler tests that run
afterwards.

Environment placeholders live in `test-setup.ts`, preloaded via each workspace's
test script. Individual test files must not set `process.env` themselves —
`@brnit/env` validates and freezes on first import, so whichever file got there
first would decide what the rest of the suite sees.

## Deployment

`docker-compose.yml` runs Redis, a one-shot migrate job, the API and the worker.
`Dockerfile` builds the API; `Dockerfile.web` builds the SPA and serves it from
nginx. PostgreSQL is not in the compose file — it comes from
`docker-compose.local.yml` locally, or from your host in production.

## Documentation

| Where | What |
| --- | --- |
| `docs/handoff/README.md` | what the stack overhaul changed, with screenshots — start here |
| `docs/migration/architecture.md` | the target architecture and the decisions behind it |
| `docs/migration/api-surface.md` | every endpoint, guard and business rule |
| `docs/migration/data-layer.md` | the schema, and why the project stays on Drizzle |
| `docs/migration/frontend.md` | frontend conventions for web and native |
| `design-system/MASTER.md` | design tokens, components and the rules that govern them |
| `docs/ROLES.md` | app roles and organisation roles |

## Conventions

- Biome + Ultracite: tabs, double quotes, organized imports. `bun run fix`
  before committing.
- TypeScript strict, with `verbatimModuleSyntax` (so `import type` for
  type-only imports) and `noUncheckedIndexedAccess` (so `rows[0]?.x ?? fallback`).
- No barrel files, except a handful that are deliberate and exempted in
  `biome.json`.
- Dates cross boundaries as `'YYYY-MM-DD'` strings, computed in UTC via
  `@brnit/datetime`.
- Two rounding rules coexist and are **not** interchangeable: persisted meal
  totals round once at the end to 2dp, while everything a member sees rounds up
  to the nearest tenth at every step. `@brnit/domain` documents why.
