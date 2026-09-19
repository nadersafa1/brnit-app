import type { Worker } from 'bullmq'
import { registeredJobs } from './jobs'
import { createLogger } from './lib/logger'
import { closeRedisConnections, isRedisConfigured } from './lib/redis'

const log = createLogger({ component: 'worker-runtime' })

/** Time a job gets to finish after SIGTERM before the process exits anyway. */
const SHUTDOWN_TIMEOUT_MS = 30_000

async function shutdown(workers: readonly Worker[]): Promise<void> {
  log.info({ workerCount: workers.length }, 'shutting down')

  // Stop accepting new jobs and wait for in-flight ones, then release every
  // connection — including the producer connection queues share.
  await Promise.all(workers.map(worker => worker.close()))
  await Promise.all(registeredJobs.map(job => job.close()))
  await closeRedisConnections()

  log.info('shutdown complete')
}

function registerShutdownHandlers(workers: readonly Worker[]): void {
  let shuttingDown = false

  const onSignal = (signal: string): void => {
    if (shuttingDown) return
    shuttingDown = true
    log.info({ signal }, 'received shutdown signal')

    const timer = setTimeout(() => {
      log.error({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'shutdown timed out; forcing exit')
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    timer.unref()

    shutdown(workers)
      .then(() => {
        process.exit(0)
      })
      .catch((error: unknown) => {
        log.error({ err: error }, 'shutdown failed')
        process.exit(1)
      })
  }

  process.on('SIGTERM', () => {
    onSignal('SIGTERM')
  })
  process.on('SIGINT', () => {
    onSignal('SIGINT')
  })
}

/**
 * Starts one worker per registered job, registers their schedulers, and wires
 * graceful shutdown. Every job in `registeredJobs` is picked up automatically.
 */
export async function runWorkerProcess(): Promise<void> {
  process.env.TZ ??= 'UTC'

  if (!isRedisConfigured()) {
    throw new Error('REDIS_URL is required to run the worker process')
  }

  const workers = registeredJobs.map(job => job.startWorker())

  // After the workers are listening, so a scheduled job that fires immediately
  // is not left waiting in the queue.
  for (const job of registeredJobs) {
    await job.registerSchedulers()
  }

  registerShutdownHandlers(workers)

  log.info({ queues: registeredJobs.map(job => job.queueName), workerCount: workers.length }, 'worker process ready')
}
