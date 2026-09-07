# brnit-app — Target Architecture

The stack overhaul rebuilds brnit on the architecture proven in the sibling
repo `qpadel`. That repo is checked out at `../qpadel` and is the **reference
implementation** — when this document says "follow the qpadel pattern", read the
named file there rather than inventing a convention.

## Decisions

| Concern | Before | After |
| --- | --- | --- |
| Package manager | npm 10 workspaces | **Bun 1.3 workspaces + catalog** |
| Package scope | `@burn-app/*` | **`@brnit/*`** |
| API | Next.js route handlers in `apps/web/src/app/api` | **standalone Express server at `apps/server`** |
| Web | Next.js 16 App Router (fullstack) | **Vite 6 + TanStack Router SPA** consuming the API over HTTP |
| ORM | Drizzle | **Drizzle** (deliberately unchanged — see `data-layer.md`) |
| Auth | better-auth 1.4.9 in `packages/auth` | better-auth **1.5.5** in `@brnit/auth` |
| Lint/format | none | **Biome + Ultracite**, tabs, double quotes |
| Dead code | none | **Knip** |
| Shared UI | ad-hoc in `apps/web/src/components/ui` | **`@brnit/ui` + `@brnit/brand`** |
| Config | scattered `process.env` | **`@brnit/env`** (t3-oss, server/web/native splits) |
| Logging | `console` + custom server-logger | **`@brnit/logger`** (pino + OTel bridge) |
| Jobs | none | **BullMQ + Redis**, separate worker process |
| Realtime | none | **socket.io + Redis adapter**, `@brnit/realtime` contracts |
| Push | none | **`@brnit/push`** (firebase-admin) + Expo registration |
| Tracing | none | **OpenTelemetry**, opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Deploy | nixpacks, single service | **Dockerfiles + docker-compose**, api + worker + redis |

## Package map

```
apps/
  server/     Express API + BullMQ workers + socket.io      (new)
  web/        Vite + TanStack Router SPA                    (Next.js and API routes removed)
  native/     Expo app                                      (repointed at apps/server)
packages/
  api/        Zod input schemas, DTO types, business handlers   (new — the contract)
  audit/      audit-log writer + constants                      (new — extracted)
  auth/       better-auth config, emails, permissions
  brand/      design tokens + brand.css + assets               (new)
  config/     tsconfig.base.json only
  datetime/   luxon date helpers (replaces scattered dayjs/UTC) (new)
  db/         Drizzle schema, client, migrations, meal-totals
  domain/     framework-free domain rules, roles, units         (new)
  env/        t3-oss env-core: server / web / native            (rewritten)
  logger/     pino + OTel                                       (new)
  push/       firebase-admin send + shared schemas              (new)
  realtime/   socket event names, room builders, zod payloads   (new)
  ui/         shared React components                           (new)
```

## The contract rule

`@brnit/api` is the single source of truth for the HTTP contract.

- **Input** validation lives there as Zod schemas.
- **Output** types live there as DTOs plus `xToDto` mappers.
- **Business logic** lives there as handlers with the signature
  `(ctx: Context, input: Input) => Promise<Dto>`.
- `apps/server` controllers are *thin Express adapters* — parse, build context,
  call the handler, `res.json`, dispatch side effects, `handleHandlerError`.
- `apps/web` and `apps/native` import **types, schemas and pure helpers only**.
  They never import `./handlers/*`, so DB code is tree-shaken out of the clients.

This is what makes the contract compile-time checked on all three consumers.

### Side effects

Handlers are pure with respect to infrastructure. A handler that needs to send
an email, push, realtime event or job returns **intents** alongside its DTO:

```ts
return { dto, notificationInput, emailPayload };
```

The controller decides how to dispatch them, always **after** the handler
returns, always through a `*BestEffort` function that cannot reject the request.
`@brnit/api` must never import BullMQ, socket.io or firebase-admin — those are
wired in at boot by `apps/server/src/jobs/register-queue-handlers.ts` filling
registry slots the api package declares.

## Reference file index

Read these in `../qpadel` before writing the equivalent here.

### Server bootstrap
| Pattern | Reference |
| --- | --- |
| Entrypoint, TZ, instrumentation order | `apps/server/src/index.ts` |
| Express class wrapper, trust proxy | `apps/server/src/app-server.ts` |
| **Canonical middleware order** | `apps/server/src/startup/setup-app.ts` |
| Graceful shutdown | `apps/server/src/lib/process-handlers.ts` |
| OTel setup (idempotent, opt-in) | `apps/server/src/instrumentation.ts` |

Middleware order is load-bearing and must be replicated exactly: pino-http →
request context (AsyncLocalStorage) → CORS + preflight → **better-auth handler
before `express.json()`** → `express.json()` → api-error event → `/api/v1`
router → health router → 404 JSON → error middleware last.

### Routing & controllers
| Pattern | Reference |
| --- | --- |
| Router factory + mounting | `apps/server/src/routes/api.router.ts` |
| Route file with role guards | `apps/server/src/routes/court.routes.ts` |
| Shared middleware tuples (`as const`, declared **inside** the factory) | `apps/server/src/routes/desk.routes.ts` |
| better-auth mounting, unversioned | `apps/server/src/routes/auth.routes.ts` |
| Full controller, manual form | `apps/server/src/controllers/court.controller.ts` |
| Controller with side-effect dispatch | `apps/server/src/controllers/desk.controller.ts` |
| `runHandler` shortcut | `apps/server/src/utils/run-handler.ts` |
| `jsonApiError` / `handleHandlerError` / `parseJsonBody` | `apps/server/src/utils/http.ts` |

Controllers are classes with **only static methods**, prefixed by
`// biome-ignore lint/complexity/noStaticOnlyClass: intentional Express controller shape`.
Signature is always
`static async name(req: Request, res: Response, next: NextFunction): Promise<void>`.

### Middleware
| Pattern | Reference |
| --- | --- |
| Session + role guards | `apps/server/src/middlewares/auth-middleware.ts` |
| Org id resolution + conflict rules | `apps/server/src/middlewares/organization-id-resolution.ts` |
| Terminal error handler | `apps/server/src/middlewares/error.middleware.ts` |
| Pure error mapping helpers | `apps/server/src/middlewares/error-format.ts` |
| pino-http + ALS binding | `apps/server/src/middlewares/http-logger.middleware.ts` |
| Production-only rate limiters | `apps/server/src/middlewares/rate-limit.middleware.ts` |
| Multer memory upload | `apps/server/src/middlewares/image-upload.middleware.ts` |
| Express `Request` augmentation | `apps/server/src/types/express-augment.d.ts` |

There is **no validation middleware** — validation happens in controllers using
schemas from the api package.

### Error contract

`{ error: string; code?: string; details?: unknown; stack?: string }` —
`stack` only outside production. `HttpError(status, message, causeDetail?)` from
`@brnit/api` is the operational error type; anything else becomes a sanitized
500. Reference: `packages/api/src/http-error.ts`.

### Contract package
| Pattern | Reference |
| --- | --- |
| Subpath export map, no build step | `packages/api/package.json` |
| `HttpError` | `packages/api/src/http-error.ts` |
| Pagination helpers | `packages/api/src/pagination/cursor.ts` |
| Context construction | `packages/api/src/context.ts`, `context-from-request.ts` |
| Registry / dependency inversion | `packages/api/src/email/transactional-email.registry.ts` |

> **brnit deviation:** brnit's existing API is **offset-paginated**
> (`{ data, pagination: { page, perPage, totalItems, totalPages } }`), not
> cursor-paginated. Keep offset pagination — the clients depend on page numbers.
> Port the *shape* of qpadel's pagination module, not its cursor semantics.

### Infra
| Pattern | Reference |
| --- | --- |
| Job contract/queue/worker triplet | `apps/server/src/jobs/*-contract.ts`, `*-queue.ts`, `apps/server/src/workers/*.worker.ts` |
| Shared queue defaults | `apps/server/src/jobs/queue-defaults.ts` |
| Deterministic job ids | `apps/server/src/jobs/transactional-email-job-ids.ts` |
| Worker process entrypoint | `apps/server/src/worker-background.ts` |
| Registry wiring at boot | `apps/server/src/jobs/register-queue-handlers.ts` |
| socket.io server + redis adapter | `apps/server/src/sockets/socket-server.ts` |
| Socket auth + room authorization | `apps/server/src/sockets/middlewares/`, `handlers/join-rooms.handler.ts` |
| Validated emit, dual-path | `apps/server/src/sockets/realtime-emit.service.ts` |
| Realtime contracts package | `packages/realtime/src/` |
| Push send + stale token pruning | `packages/push/src/send-push.ts` |

Queue conventions: `SHARED_QUEUE_DEFAULT_JOB_OPTIONS` (5 attempts, exponential
backoff), lazy `Queue` singleton returning `null` when `REDIS_URL` is unset,
explicit deterministic `jobId` for dedup and cancellation, Zod re-validation
inside the worker, `attachWorkerLifecycleLogs`, cron via `upsertJobScheduler`
registered only from the worker process after workers are listening.

### Packages
| Pattern | Reference |
| --- | --- |
| env: three entrypoints, no barrel | `packages/env/src/{server,web,native}.ts` |
| logger: pino + OTel bridge | `packages/logger/src/logger.ts` |
| logger: ALS request context | `packages/logger/src/request-context.ts` |
| auth: better-auth config | `packages/auth/src/index.ts` |
| auth: role ranks | `packages/auth/src/role-ranks.ts` |

env conventions: every var gets a Zod schema **and** a doc comment; secrets are
`.optional()` so local dev boots; conditional requirements use `.refine()`;
native enumerates `runtimeEnv` explicitly (Metro only inlines literal
`process.env.X`) and gives every var a `.default()`.

logger conventions: `apps/server` entrypoints import `logger` directly;
everything deeper calls `getLogger()` — never thread a logger through arguments.
Call style is pino-native: `log.info({ field }, "lowercase message")`, errors
always `{ err }`.

### Tooling
| File | Reference |
| --- | --- |
| `biome.json` | extends `ultracite/biome/core` + `ultracite/biome/react`; tabs; double quotes |
| `bunfig.toml` | `linker = "hoisted"` — **required**, the Dockerfile depends on it |
| `packages/config/tsconfig.base.json` | `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `strict` |
| `turbo.json` | build/lint/check-types/dev + non-cached db and worker tasks |
| `Dockerfile` | 3-stage: `turbo prune --scope=server --docker` → install → build |
| `docker-compose.yml` | `x-app-env` anchor; redis + migrate + api + worker |

`noUncheckedIndexedAccess` is why the codebase is full of `rows[0]?.x ?? fallback`.
`verbatimModuleSyntax` is why every type import is `import type`.

## Testing

`bun test` (`bun:test`), no vitest/jest. Tests co-located as `*.test.ts` next to
the subject — never a `__tests__` directory. Three tiers:

1. **Pure unit** — no mocks, one `describe` per exported function.
2. **Module-mocked** — `mock.module(specifier, factory)` at the top, then a
   **dynamic `await import()`** of the subject so the mock registers first.
   Express `req`/`res` are hand-rolled fakes; no supertest.
3. **Route integration** — real Express app on an ephemeral port, real `fetch`.
   Follow the harness in `apps/server/src/routes/test-utils/`.

> **Run tests per workspace.** `bun run test` (= `turbo test`) gives each
> workspace its own process. Running `bun test packages/ apps/` in a single
> command fails ~14 tests that pass in isolation: `mock.module` is process-wide
> and permanent, so the server's route mocks of `@brnit/auth` and `@brnit/api`
> leak into handler tests that run afterwards.

Environment placeholders live in `test-setup.ts`, preloaded via `bunfig.toml`.
Individual test files must not set env vars themselves — `@brnit/env/server`
validates and freezes on first import, so whichever file loads it first would
decide what the rest of the suite sees.

> brnit currently uses **vitest** in `apps/web`. Those tests must be ported to
> `bun:test` as part of the overhaul.

## Checklist for new server code

1. Zod input schema + DTO in `packages/api/src/<feature>/{schemas,dto}.ts`.
2. Handler `(ctx, input) => Promise<Dto>` in
   `packages/api/src/handlers/<feature>.ts`; re-export from `src/index.ts`.
3. Static method on `apps/server/src/controllers/<feature>.controller.ts`.
4. Register in `routes/<feature>.routes.ts`; mount in `api.router.ts`.
5. Throw `HttpError` for operational failures; let unknown errors bubble.
6. Side effects after the handler returns, via `*BestEffort`.
7. New env var → declare in `packages/env/src/server.ts` with a doc comment, add
   to the compose `x-app-env` anchor and `.env.compose.example`.
8. `bun run fix` and `bun run check-types` before finishing.
