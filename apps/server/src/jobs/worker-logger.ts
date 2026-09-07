import { logger } from "@brnit/logger";
import type { Job, Worker } from "bullmq";
import type { Logger } from "pino";

/**
 * Logging helpers shared by the queue modules and the workers.
 *
 * These live under `jobs/` rather than `lib/` because both halves of the
 * contract/queue/worker triplet need them and `workers/` already reaches into
 * `jobs/` for contracts — the reverse dependency would be a cycle.
 *
 * Queues and workers run outside any HTTP request, so they bind `logger`
 * directly instead of `getLogger()`: there is no AsyncLocalStorage store to
 * read, and a `component`/`queue` pair is the only correlation a job has.
 */

/** Child logger for a queue or worker (`component` + optional `queue`). */
export function createWorkerLogger(component: string, queue?: string): Logger {
	return logger.child(queue ? { component, queue } : { component });
}

/**
 * Safe job payload fields for worker logs.
 *
 * An allow-list, not a redaction list: job payloads carry push titles and
 * bodies, which can quote a member's plan. Only opaque ids are ever logged.
 */
function extractWorkerJobLogFields(data: unknown): Record<string, string> {
	if (typeof data !== "object" || data === null) {
		return {};
	}

	const record = data as Record<string, unknown>;
	const fields: Record<string, string> = {};

	for (const key of [
		"userId",
		"dietPlanAssignmentId",
		"dietPlanMealId",
		"dateYmd",
	] as const) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) {
			fields[key] = value;
		}
	}

	return fields;
}

function jobLogBindings(job: Job): Record<string, string | undefined> {
	return {
		jobId: job.id,
		jobName: job.name,
		...extractWorkerJobLogFields(job.data),
	};
}

/**
 * BullMQ lifecycle hooks: active (debug), completed (info), failed (error).
 *
 * `failed` fires once per attempt, so it reports `attemptsMade` — a line with
 * `attemptsMade: 5` against `SHARED_QUEUE_DEFAULT_JOB_OPTIONS` is the final
 * one, and everything before it is a retry that may still succeed.
 */
export function attachWorkerLifecycleLogs(
	worker: Worker,
	workerLog: Logger,
	queueName: string
): void {
	worker.on("active", (job) => {
		workerLog.debug(jobLogBindings(job), "job active");
	});

	worker.on("completed", (job) => {
		workerLog.info(jobLogBindings(job), "job completed");
	});

	worker.on("failed", (job, error) => {
		workerLog.error(
			{
				err: error,
				queue: queueName,
				attemptsMade: job?.attemptsMade,
				...(job ? jobLogBindings(job) : {}),
			},
			"job failed"
		);
	});

	worker.on("error", (error) => {
		workerLog.error({ err: error, queue: queueName }, "worker error");
	});
}
