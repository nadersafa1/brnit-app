import type { JobsOptions } from "bullmq";

/**
 * Shared BullMQ defaults for every brnit queue.
 *
 * Five attempts with exponential backoff from 3s covers the failure every one
 * of these queues actually hits — a transient Redis, Postgres or FCM blip —
 * without hammering a hard-down dependency. Completed and failed jobs are
 * capped by count rather than age so a quiet week cannot erase the failure
 * history a `/api/v1/health` probe reports on.
 */
export const SHARED_QUEUE_DEFAULT_JOB_OPTIONS = {
	attempts: 5,
	backoff: { delay: 3000, type: "exponential" as const },
	removeOnComplete: { count: 5000 },
	removeOnFail: { count: 10_000 },
} satisfies JobsOptions;
