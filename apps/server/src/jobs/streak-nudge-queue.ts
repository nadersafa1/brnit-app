import { env } from "@brnit/env/server";
import { Queue } from "bullmq";

import { SHARED_QUEUE_DEFAULT_JOB_OPTIONS } from "./queue-defaults.js";
import { STREAK_NUDGE_QUEUE_NAME } from "./streak-nudge-contract.js";

let queueInstance: Queue | undefined;

/**
 * Lazy singleton; `null` when `REDIS_URL` is unset.
 *
 * There is no `enqueue…BestEffort` counterpart: this queue has exactly one
 * producer, the cron scheduler registered by the worker process, and nothing in
 * the request path ever adds to it.
 */
export function getStreakNudgeQueue(): Queue | null {
	if (!env.REDIS_URL) {
		return null;
	}

	queueInstance ??= new Queue(STREAK_NUDGE_QUEUE_NAME, {
		connection: { url: env.REDIS_URL },
		defaultJobOptions: SHARED_QUEUE_DEFAULT_JOB_OPTIONS,
	});
	return queueInstance;
}
