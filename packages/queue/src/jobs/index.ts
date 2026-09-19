import type { RegisteredJob } from '../lib/define-job'
import { auditLogRetentionJob } from './audit-log-retention'
import { transactionalEmailJob } from './transactional-email'

/**
 * Every job in the system. The worker process starts one worker per entry and
 * registers its schedulers, so adding a job here is the only wiring step.
 */
export const registeredJobs: readonly RegisteredJob[] = [transactionalEmailJob, auditLogRetentionJob]
