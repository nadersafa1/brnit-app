import { env } from '@burn-app/env/server'
import type { Job, JobsOptions, WorkerOptions } from 'bullmq'
import { Queue, UnrecoverableError, Worker } from 'bullmq'
import type { ZodType } from 'zod'
import { DEFAULT_JOB_OPTIONS } from './job-options'
import { createLogger, type Logger } from './logger'
import { createWorkerConnection, getProducerConnection, isRedisConfigured } from './redis'

export interface JobContext {
  /** 1 on the first run, 2 on the first retry, and so on. */
  attempt: number
  jobId: string | undefined
  log: Logger
}

export interface JobHandler<TPayload> {
  /** Validates the payload on enqueue *and* before the handler runs. */
  schema: ZodType<TPayload>
  handle(payload: TPayload, context: JobContext): Promise<void>
}

/**
 * `any` is the only workable constraint for a map of handlers with differing
 * payloads; each key's real payload type is recovered by `PayloadOf` below, so
 * callers never see `any`.
 */
type JobHandlers = Record<string, JobHandler<any>>

type PayloadOf<THandler> = THandler extends JobHandler<infer TPayload> ? TPayload : never

type JobName<THandlers extends JobHandlers> = keyof THandlers & string

/** A cron entry, typed so `data` must match the payload of the job it triggers. */
type SchedulerConfig<THandlers extends JobHandlers> = {
  [TName in JobName<THandlers>]: {
    /** Stable across deploys — reusing an id updates the existing schedule. */
    id: string
    jobName: TName
    /** Cron expression, always evaluated in UTC. */
    pattern: string
    data: PayloadOf<THandlers[TName]>
  }
}[JobName<THandlers>]

export interface JobDefinition<THandlers extends JobHandlers> {
  queueName: string
  handlers: THandlers
  /** Jobs processed in parallel by one worker. Defaults to WORKER_CONCURRENCY. */
  concurrency?: number
  defaultJobOptions?: JobsOptions
  limiter?: WorkerOptions['limiter']
  schedulers?: readonly SchedulerConfig<THandlers>[]
}

/** The non-generic surface the worker runtime needs, so jobs can share one list. */
export interface RegisteredJob {
  queueName: string
  close(): Promise<void>
  registerSchedulers(): Promise<void>
  startWorker(): Worker
}

export interface DefinedJob<THandlers extends JobHandlers> extends RegisteredJob {
  /** Null when REDIS_URL is unset. */
  getQueue(): Queue | null
  /** Validates, then enqueues. Throws if the payload is invalid or Redis is unreachable. */
  enqueue<TName extends JobName<THandlers>>(
    jobName: TName,
    payload: PayloadOf<THandlers[TName]>,
    options?: JobsOptions
  ): Promise<void>
  /** Same as `enqueue` but logs instead of throwing — for work the request must not fail over. */
  enqueueBestEffort<TName extends JobName<THandlers>>(
    jobName: TName,
    payload: PayloadOf<THandlers[TName]>,
    options?: JobsOptions
  ): Promise<void>
}

function formatIssues(error: { issues: readonly { message: string; path: readonly PropertyKey[] }[] }): string {
  return error.issues.map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`).join('; ')
}

export function defineJob<THandlers extends JobHandlers>(definition: JobDefinition<THandlers>): DefinedJob<THandlers> {
  const { queueName } = definition
  const log = createLogger({ component: 'queue', queue: queueName })

  let queue: Queue | undefined

  function getQueue(): Queue | null {
    if (!isRedisConfigured()) return null
    queue ??= new Queue(queueName, {
      connection: getProducerConnection(),
      defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...definition.defaultJobOptions },
    })
    return queue
  }

  function requireHandler<TName extends JobName<THandlers>>(jobName: TName): THandlers[TName] {
    const handler = definition.handlers[jobName]
    if (!handler) {
      throw new Error(`No handler registered for ${queueName}/${String(jobName)}`)
    }
    return handler
  }

  async function enqueue<TName extends JobName<THandlers>>(
    jobName: TName,
    payload: PayloadOf<THandlers[TName]>,
    options?: JobsOptions
  ): Promise<void> {
    const handler = requireHandler(jobName)

    // Validating here surfaces bad payloads at the call site instead of after a
    // round trip through Redis and five failed attempts.
    const parsed = handler.schema.safeParse(payload)
    if (!parsed.success) {
      throw new Error(`Invalid payload for ${queueName}/${jobName}: ${formatIssues(parsed.error)}`)
    }

    const activeQueue = getQueue()
    if (!activeQueue) {
      if (env.NODE_ENV === 'production') {
        throw new Error(`REDIS_URL is required to enqueue ${queueName}/${jobName} in production`)
      }
      // Local development without Redis: run inline so the feature still works.
      // Silently dropping the job here would hide broken flows until deploy.
      log.warn({ jobName }, 'REDIS_URL is not set; running job inline')
      await handler.handle(parsed.data, { attempt: 1, jobId: undefined, log: log.child({ inline: true, jobName }) })
      return
    }

    const job = await activeQueue.add(jobName, parsed.data, options)
    log.info({ jobId: job.id, jobName }, 'job enqueued')
  }

  async function enqueueBestEffort<TName extends JobName<THandlers>>(
    jobName: TName,
    payload: PayloadOf<THandlers[TName]>,
    options?: JobsOptions
  ): Promise<void> {
    try {
      await enqueue(jobName, payload, options)
    } catch (error: unknown) {
      log.error({ err: error, jobName }, 'enqueue failed')
    }
  }

  async function processJob(job: Job): Promise<void> {
    const handler = definition.handlers[job.name]
    if (!handler) {
      // A job left over from a handler that no longer exists. Retrying cannot help.
      log.warn({ jobId: job.id, jobName: job.name }, 'no handler registered; discarding job')
      return
    }

    const parsed = handler.schema.safeParse(job.data)
    if (!parsed.success) {
      throw new UnrecoverableError(`Invalid payload for ${queueName}/${job.name}: ${formatIssues(parsed.error)}`)
    }

    await handler.handle(parsed.data, {
      attempt: job.attemptsMade + 1,
      jobId: job.id,
      log: log.child({ jobId: job.id, jobName: job.name }),
    })
  }

  function startWorker(): Worker {
    const worker = new Worker(queueName, processJob, {
      concurrency: definition.concurrency ?? env.WORKER_CONCURRENCY,
      connection: createWorkerConnection(queueName),
      ...(definition.limiter ? { limiter: definition.limiter } : {}),
    })

    worker.on('completed', job => {
      log.info({ jobId: job.id, jobName: job.name }, 'job completed')
    })
    worker.on('failed', (job, error) => {
      // By the time this fires BullMQ has already counted the attempt, unlike
      // inside the processor where `attemptsMade` is the count of previous runs.
      const attempt = job?.attemptsMade ?? 0
      log.error(
        {
          attempt,
          err: error,
          jobId: job?.id,
          jobName: job?.name,
          willRetry: attempt < (job?.opts.attempts ?? 0),
        },
        'job failed'
      )
    })
    worker.on('error', error => {
      log.error({ err: error }, 'worker error')
    })

    log.info({ concurrency: definition.concurrency ?? env.WORKER_CONCURRENCY }, 'worker listening')
    return worker
  }

  async function registerSchedulers(): Promise<void> {
    const schedulers = definition.schedulers ?? []
    if (schedulers.length === 0) return

    const activeQueue = getQueue()
    if (!activeQueue) {
      throw new Error(`REDIS_URL is required to register schedulers for ${queueName}`)
    }

    for (const scheduler of schedulers) {
      // Idempotent: re-running with the same id updates the schedule in place.
      await activeQueue.upsertJobScheduler(
        scheduler.id,
        { pattern: scheduler.pattern, tz: 'UTC' },
        { data: scheduler.data, name: scheduler.jobName }
      )
      log.info({ pattern: scheduler.pattern, schedulerId: scheduler.id }, 'scheduler registered')
    }
  }

  async function close(): Promise<void> {
    if (!queue) return
    await queue.close()
    queue = undefined
  }

  return { close, enqueue, enqueueBestEffort, getQueue, queueName, registerSchedulers, startWorker }
}
