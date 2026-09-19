import { env } from '@burn-app/env/server'
import { Redis } from 'ioredis'
import { createLogger } from './logger'

const log = createLogger({ component: 'queue:redis' })

interface QueueRedisState {
  /**
   * Every connection this process opened, so shutdown can close all of them.
   * BullMQ only closes connections it created itself; we always pass instances.
   */
  connections: Set<Redis>
  producer?: Redis
}

/**
 * Held on `globalThis` so a Next.js hot reload reuses the existing connections
 * instead of opening a new socket on every module re-evaluation.
 */
const globalForQueue = globalThis as typeof globalThis & { __brnitQueueRedis?: QueueRedisState }

const state: QueueRedisState = (globalForQueue.__brnitQueueRedis ??= { connections: new Set<Redis>() })
const openConnections = state.connections

export function isRedisConfigured(): boolean {
  return env.REDIS_URL.length > 0
}

function requireRedisUrl(): string {
  if (!isRedisConfigured()) {
    throw new Error('REDIS_URL is not set. Start Redis and set REDIS_URL, or see docs/BACKGROUND_JOBS.md.')
  }
  return env.REDIS_URL
}

function createConnection(role: string, { blocking }: { blocking: boolean }): Redis {
  const connection = new Redis(requireRedisUrl(), {
    // BullMQ workers issue blocking commands (BRPOPLPUSH), which ioredis must
    // never give up on. Producers fail fast instead so a request is not held open.
    maxRetriesPerRequest: blocking ? null : 3,
    connectionName: `brnit:${role}`,
  })

  connection.on('error', (error: unknown) => {
    log.error({ err: error, role }, 'redis connection error')
  })
  openConnections.add(connection)
  connection.once('end', () => {
    openConnections.delete(connection)
  })

  return connection
}

/**
 * One connection shared by every producer-side Queue in this process. Queues do
 * not block, so a single connection is enough and keeps the pool small on
 * serverless-ish Next.js runtimes.
 */
export function getProducerConnection(): Redis {
  state.producer ??= createConnection('producer', { blocking: false })
  return state.producer
}

/** Each worker needs its own blocking connection — BullMQ cannot share one. */
export function createWorkerConnection(queueName: string): Redis {
  return createConnection(`worker:${queueName}`, { blocking: true })
}

/** Closes every connection opened by this process. Call after closing workers and queues. */
export async function closeRedisConnections(): Promise<void> {
  const connections = [...openConnections]
  openConnections.clear()
  state.producer = undefined

  await Promise.all(
    connections.map(async connection => {
      try {
        await connection.quit()
      } catch {
        connection.disconnect()
      }
    })
  )
}
