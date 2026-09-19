import type { JobsOptions } from 'bullmq'

/**
 * Defaults applied to every queue. Retries are bounded and finished jobs are
 * capped by both age and count so Redis memory cannot grow without limit.
 */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { delay: 3_000, type: 'exponential' },
  removeOnComplete: { age: 60 * 60 * 24 * 3, count: 1_000 },
  removeOnFail: { age: 60 * 60 * 24 * 30, count: 5_000 },
} satisfies JobsOptions
