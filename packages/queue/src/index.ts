/**
 * Producer-side API. Safe to import from Next.js route handlers, server
 * actions, and other server code. Server-only — it opens Redis and Postgres
 * connections, so never import it from a client component.
 *
 * The worker process imports `@burn-app/queue/worker-runtime` instead.
 */

export { defineJob } from './lib/define-job'
export type { DefinedJob, JobContext, JobDefinition, JobHandler, RegisteredJob } from './lib/define-job'
export { DEFAULT_JOB_OPTIONS } from './lib/job-options'
export { createLogger } from './lib/logger'
export type { Logger } from './lib/logger'
export { isRedisConfigured } from './lib/redis'

export { auditLogRetentionJob, enqueueAuditLogPrune } from './jobs/audit-log-retention'
export type { PruneAuditLogPayload } from './jobs/audit-log-retention'

export {
  enqueueOrganizationInvitation,
  enqueuePasswordResetEmail,
  enqueueVerificationEmail,
  transactionalEmailJob,
} from './jobs/transactional-email'
export type {
  OrganizationInvitationPayload,
  PasswordResetEmailPayload,
  VerificationEmailPayload,
} from './jobs/transactional-email'

export { registeredJobs } from './jobs'
