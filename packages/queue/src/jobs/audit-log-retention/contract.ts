import { z } from 'zod'

export const AUDIT_LOG_RETENTION_QUEUE = 'audit-log-retention'

export const PRUNE_AUDIT_LOG_JOB = 'prune-audit-log'

export const AUDIT_LOG_RETENTION_SCHEDULER_ID = 'audit-log-retention-daily'

export const pruneAuditLogPayloadSchema = z.object({
  /** Overrides AUDIT_LOG_RETENTION_DAYS — useful for a one-off manual prune. */
  retentionDays: z.number().int().positive().optional(),
})

export type PruneAuditLogPayload = z.infer<typeof pruneAuditLogPayloadSchema>
