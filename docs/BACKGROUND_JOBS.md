# Background Jobs (BullMQ + Redis)

Work that a user should not wait for runs on a queue: sending email, nightly
cleanup, anything slow, flaky, or retryable. Jobs are defined once in
`@burn-app/queue` and executed by a separate `worker` process.

- **Queue library** — [`packages/queue`](../packages/queue)
- **Worker process** — [`apps/worker`](../apps/worker)
- **Email sending** — [`packages/email`](../packages/email)

---

## How the pieces fit

```
apps/web ──enqueue──▶ Redis ──▶ apps/worker ──▶ handler ──▶ @burn-app/email, @burn-app/db
@burn-app/auth ──┘                                (BullMQ Worker)
```

`@burn-app/queue` exposes two entry points:

| Import | Used by | Contains |
| --- | --- | --- |
| `@burn-app/queue` | `apps/web`, `@burn-app/auth` | Producers (`enqueue*`), `defineJob`, contracts |
| `@burn-app/queue/worker-runtime` | `apps/worker` only | `runWorkerProcess()` — starts workers and schedulers |

**`@burn-app/queue` is server-only.** It opens Redis and Postgres connections.
Import it from route handlers, server actions, and server components — never
from a client component.

### Why email lives in its own package

`@burn-app/auth` enqueues emails, and the worker's handler sends them. If the
sending code stayed in `@burn-app/auth`, the two packages would import each
other. `@burn-app/email` is a leaf package, so the graph stays acyclic:

```
env ◀── db ◀── queue ──▶ email ──▶ env
               ▲   ▲
               │   └── auth
               └────── web
```

Keep it that way: **a domain package may enqueue, but a job handler must never
import a package that enqueues.**

---

## Local development

Redis is optional locally. Without it, `enqueue()` runs the handler **inline**
and logs a warning, so every feature still works on a fresh checkout:

```
{"level":"warn","queue":"transactional-email","msg":"REDIS_URL is not set; running job inline"}
```

Inline mode has no retries, no concurrency, and no scheduled jobs — it exists so
you are not forced to run Redis, not as a substitute for it. In production a
missing `REDIS_URL` throws instead of silently degrading.

To run the real thing:

```bash
docker compose up -d
```

Add `REDIS_URL=redis://localhost:6379` to `apps/web/.env` — the worker reads the
same env file the web app does, resolved from its own location rather than the
working directory — then in a second terminal:

```bash
npm run dev:worker
```

If port 6379 is already taken, start Redis on another port with
`REDIS_PORT=16380 docker compose up -d` and point `REDIS_URL` at it.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | *(empty)* | Redis connection. Required in production. |
| `WORKER_CONCURRENCY` | `5` | Default jobs in flight per worker. |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error`. |
| `AUDIT_LOG_RETENTION_DAYS` | `90` | Used by the audit log retention job. |

---

## Adding a new job

A job is one directory under `packages/queue/src/jobs/` with two files, plus one
line in the registry. Copy
[`transactional-email`](../packages/queue/src/jobs/transactional-email) for an
event-driven job or
[`audit-log-retention`](../packages/queue/src/jobs/audit-log-retention) for a
scheduled one.

### 1. `contract.ts` — names and payload schemas

Queue names, job names, and Zod schemas. No BullMQ imports here, so anything can
import the contract without pulling in Redis.

```ts
import { z } from 'zod'

export const WEEKLY_DIGEST_QUEUE = 'weekly-digest'
export const SEND_DIGEST_JOB = 'send-digest'

export const sendDigestPayloadSchema = z.object({
  organizationId: z.string().min(1),
  weekStartIso: z.iso.date(),
})

export type SendDigestPayload = z.infer<typeof sendDigestPayloadSchema>
```

### 2. `index.ts` — the job definition

```ts
import { defineJob } from '../../lib/define-job'
import { SEND_DIGEST_JOB, sendDigestPayloadSchema, WEEKLY_DIGEST_QUEUE } from './contract'
import type { SendDigestPayload } from './contract'

export const weeklyDigestJob = defineJob({
  concurrency: 2,
  handlers: {
    [SEND_DIGEST_JOB]: {
      schema: sendDigestPayloadSchema,
      handle: async (payload, context) => {
        context.log.info({ organizationId: payload.organizationId }, 'building digest')
        await buildAndSendDigest(payload)
      },
    },
  },
  queueName: WEEKLY_DIGEST_QUEUE,
})

export function enqueueWeeklyDigest(payload: SendDigestPayload): Promise<void> {
  return weeklyDigestJob.enqueueBestEffort(SEND_DIGEST_JOB, payload)
}

export * from './contract'
```

Export a named `enqueue*` helper rather than making callers pass the job name —
call sites stay readable and the retry policy stays a decision of the job, not
the caller.

### 3. Register it

Add the job to [`packages/queue/src/jobs/index.ts`](../packages/queue/src/jobs/index.ts):

```ts
export const registeredJobs: readonly RegisteredJob[] = [
  transactionalEmailJob,
  auditLogRetentionJob,
  weeklyDigestJob,
]
```

That is the only wiring step. The worker process starts a worker for every entry
and registers its schedulers automatically — there is no second list to update.

### 4. Re-export from the package entry point

Add the producer to [`packages/queue/src/index.ts`](../packages/queue/src/index.ts)
so `apps/web` can import it.

---

## `enqueue` vs `enqueueBestEffort`

Both validate the payload before touching Redis, so a bad payload throws at the
call site instead of failing five times inside a worker.

| | Throws on failure | Use for |
| --- | --- | --- |
| `enqueue` | yes | Work the user is waiting on. A verification email that cannot be queued should fail the signup, not report success. |
| `enqueueBestEffort` | no — logs | Side effects the request must survive without. Analytics, digests, cache warming. |

Never call `enqueueBestEffort` for something a user was told would happen.

---

## Scheduled (cron) jobs

Add a `schedulers` entry to the definition. Patterns are always evaluated in
**UTC**:

```ts
export const weeklyDigestJob = defineJob({
  handlers: { /* ... */ },
  queueName: WEEKLY_DIGEST_QUEUE,
  schedulers: [
    {
      data: { organizationId: 'all', weekStartIso: '1970-01-01' },
      id: 'weekly-digest-monday',
      jobName: SEND_DIGEST_JOB,
      pattern: '0 6 * * 1',
    },
  ],
})
```

`data` is type-checked against the payload schema of `jobName`.

The `id` must stay stable across deploys. Registration uses BullMQ's
`upsertJobScheduler`, so re-deploying updates the existing schedule rather than
creating a duplicate. Renaming an `id` leaves the old schedule running in Redis
— remove it with `queue.removeJobScheduler(oldId)` before you delete the code.

Only the worker process registers schedulers, so scaling to several worker
replicas does not multiply the schedule.

---

## Retries and failure

Defaults from [`lib/job-options.ts`](../packages/queue/src/lib/job-options.ts)
apply to every queue:

```ts
attempts: 5
backoff: { delay: 3_000, type: 'exponential' }   // 3s, 6s, 12s, 24s
removeOnComplete: { age: 3 days, count: 1_000 }
removeOnFail: { age: 30 days, count: 5_000 }
```

Override per job with `defaultJobOptions`, or per enqueue with the third argument.

When a third party caps your call rate, use `limiter` rather than lowering
`concurrency` — it bounds jobs per interval across the whole worker:

```ts
defineJob({
  limiter: { duration: 1_000, max: 10 }, // at most 10 jobs per second
  // ...
})
```

**Handlers must be idempotent.** A job can run twice — a worker killed
mid-execution is retried after its lock expires. Write handlers so a second run
is harmless.

Invalid payloads are thrown as BullMQ's `UnrecoverableError`, which fails the job
immediately instead of retrying a payload that can never become valid. Do the
same in your own handler for permanent failures:

```ts
import { UnrecoverableError } from 'bullmq'

if (!organization) {
  throw new UnrecoverableError(`Organization ${payload.organizationId} no longer exists`)
}
```

Anything else you throw is retried.

### Deduplicating with `jobId`

Passing a `jobId` makes an enqueue idempotent — BullMQ ignores a second job with
an id that already exists:

```ts
await weeklyDigestJob.enqueue(SEND_DIGEST_JOB, payload, {
  jobId: `digest:${payload.organizationId}:${payload.weekStartIso}`,
})
```

The catch: the id stays reserved while the finished job is still in Redis
(`removeOnComplete` above keeps it for 3 days). Use `jobId` when the work should
genuinely happen **once per entity** — a per-week digest, a per-booking
confirmation. Do *not* use it for actions a user can legitimately repeat, such as
resending a verification email; the resend would be silently dropped.

---

## Logging

Handlers get a `context.log` already bound to the queue, job name, and job id:

```ts
handle: async (payload, context) => {
  context.log.info({ organizationId: payload.organizationId }, 'digest sent')
}
```

Output is one JSON object per line, `pino`-shaped, so
[`lib/logger.ts`](../packages/queue/src/lib/logger.ts) can be swapped for real
`pino` later without touching call sites.

**Never log PII.** Log ids, counts, and durations — not email addresses, names,
or payload dumps.

---

## Deployment

The worker is a **second process**, not a second copy of the web app. Both need
the same `DATABASE_URL` and `REDIS_URL`. Locally those come from `apps/web/.env`;
in production, set them in the environment — real environment variables always
win over the file.

```bash
npm run start --workspace=worker   # or: tsx apps/worker/src/index.ts
```

Requirements:

- **Redis must persist.** Delayed and scheduled jobs live in Redis; an
  in-memory-only instance loses them on restart. Use AOF (the local
  `docker-compose.yml` enables `--appendonly yes`) and set `maxmemory-policy` to
  `noeviction` — BullMQ data must never be evicted.
- **Send `SIGTERM` to stop it.** The process stops accepting new jobs, waits for
  in-flight ones, closes every connection, then exits. It force-exits after 30
  seconds, so give the container a `stop_grace_period` of at least that.
- **Scale by running more replicas.** Workers coordinate through Redis; jobs are
  not processed twice. Schedulers are idempotent across replicas.
- Set `WORKER_CONCURRENCY` to what your database connection pool can absorb, not
  to the largest number that runs.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `REDIS_URL is required ... in production` | `NODE_ENV=production` without `REDIS_URL`. Inline fallback is development-only. |
| Jobs enqueue but never run | The worker process is not running, or points at a different `REDIS_URL`. |
| `no handler registered; discarding job` | A job outlived its handler. Harmless — the job is dropped, not retried. |
| Scheduled job fires twice | Two schedulers with different `id`s. Remove the stale one with `queue.removeJobScheduler`. |
| `maxRetriesPerRequest must be null` | A worker was given a producer connection. Use `createWorkerConnection`, not `getProducerConnection`. |

Inspect a queue from a script:

```ts
import { transactionalEmailJob } from '@burn-app/queue'

const queue = transactionalEmailJob.getQueue()
console.log(await queue?.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'))
console.log(await queue?.getFailed(0, 10))
```
