import { db } from '@burn-app/db'
import { auditLog } from '@burn-app/db/schema'
import { env } from '@burn-app/env/server'
import { inArray, lt } from 'drizzle-orm'
import { defineJob } from '../../lib/define-job'
import {
  AUDIT_LOG_RETENTION_QUEUE,
  AUDIT_LOG_RETENTION_SCHEDULER_ID,
  PRUNE_AUDIT_LOG_JOB,
  pruneAuditLogPayloadSchema,
  type PruneAuditLogPayload,
} from './contract'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000

/** Deleted per statement, so a large backlog never holds a long lock on `audit_log`. */
const DELETE_BATCH_SIZE = 1_000

/**
 * `audit_log` gains a row per write request and nothing removes them. This runs
 * nightly and drops anything past the retention window.
 */
export const auditLogRetentionJob = defineJob({
  concurrency: 1,
  defaultJobOptions: { attempts: 3 },
  handlers: {
    [PRUNE_AUDIT_LOG_JOB]: {
      schema: pruneAuditLogPayloadSchema,
      handle: async (payload, context) => {
        const retentionDays = payload.retentionDays ?? env.AUDIT_LOG_RETENTION_DAYS
        const cutoff = new Date(Date.now() - retentionDays * MILLISECONDS_PER_DAY)
        let deleted = 0

        for (;;) {
          const doomed = await db
            .select({ id: auditLog.id })
            .from(auditLog)
            .where(lt(auditLog.createdAt, cutoff))
            .limit(DELETE_BATCH_SIZE)

          if (doomed.length === 0) break

          await db.delete(auditLog).where(
            inArray(
              auditLog.id,
              doomed.map(row => row.id)
            )
          )
          deleted += doomed.length

          if (doomed.length < DELETE_BATCH_SIZE) break
        }

        context.log.info({ cutoff: cutoff.toISOString(), deleted, retentionDays }, 'audit log pruned')
      },
    },
  },
  queueName: AUDIT_LOG_RETENTION_QUEUE,
  schedulers: [
    {
      data: {},
      id: AUDIT_LOG_RETENTION_SCHEDULER_ID,
      jobName: PRUNE_AUDIT_LOG_JOB,
      pattern: '0 3 * * *',
    },
  ],
})

/** Runs the prune immediately instead of waiting for the nightly schedule. */
export function enqueueAuditLogPrune(payload: PruneAuditLogPayload = {}): Promise<void> {
  return auditLogRetentionJob.enqueue(PRUNE_AUDIT_LOG_JOB, payload)
}

export * from './contract'
