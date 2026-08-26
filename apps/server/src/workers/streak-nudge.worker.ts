import { getTodayUtcDateString } from "@brnit/datetime";
import { env } from "@brnit/env/server";
import type { Worker } from "bullmq";
import { Worker as BullWorker } from "bullmq";

import { streakNudgePushJobId } from "../jobs/job-ids.js";
import { enqueuePushNotificationBestEffort } from "../jobs/push-notification-queue.js";
import {
	STREAK_NUDGE_BODY,
	STREAK_NUDGE_CRON,
	STREAK_NUDGE_JOB_NAME,
	STREAK_NUDGE_QUEUE_NAME,
	STREAK_NUDGE_SCHEDULER_ID,
	STREAK_NUDGE_TITLE,
} from "../jobs/streak-nudge-contract.js";
import { findStreakNudgeUserIds } from "../jobs/streak-nudge-planner.js";
import { getStreakNudgeQueue } from "../jobs/streak-nudge-queue.js";
import {
	attachWorkerLifecycleLogs,
	createWorkerLogger,
} from "../jobs/worker-logger.js";

const workerLog = createWorkerLogger(
	"worker-streak-nudge",
	STREAK_NUDGE_QUEUE_NAME
);

/**
 * One nudge per at-risk member.
 *
 * The push job id is keyed on `(userId, dateYmd)`, so a retried or manually
 * re-fired cron cannot nudge the same person twice in a day even though the
 * candidate query would return them again.
 */
async function runStreakNudgeJob(jobId: string | undefined): Promise<void> {
	const dateYmd = getTodayUtcDateString();
	const userIds = await findStreakNudgeUserIds(dateYmd);

	for (const userId of userIds) {
		await enqueuePushNotificationBestEffort({
			jobId: streakNudgePushJobId({ userId, dateYmd }),
			payload: {
				userId,
				title: STREAK_NUDGE_TITLE,
				body: STREAK_NUDGE_BODY,
				category: "streak_nudge",
				data: { type: "streak_nudge", dateYmd },
			},
		});
	}

	workerLog.info(
		{ jobId, dateYmd, nudgedUserCount: userIds.length },
		"streak nudges dispatched"
	);
}

/** Registers the daily cron (worker process only). Idempotent across restarts. */
export async function registerStreakNudgeScheduler(): Promise<void> {
	const queue = getStreakNudgeQueue();
	if (!queue) {
		throw new Error("REDIS_URL is required for the streak nudge scheduler");
	}

	await queue.upsertJobScheduler(
		STREAK_NUDGE_SCHEDULER_ID,
		{ pattern: STREAK_NUDGE_CRON },
		{ name: STREAK_NUDGE_JOB_NAME, data: {} }
	);

	workerLog.info(
		{ pattern: STREAK_NUDGE_CRON, schedulerId: STREAK_NUDGE_SCHEDULER_ID },
		"scheduler registered"
	);
}

export function startStreakNudgeWorker(): Worker {
	if (!env.REDIS_URL) {
		throw new Error("REDIS_URL is required for the streak nudge worker");
	}

	const worker = new BullWorker(
		STREAK_NUDGE_QUEUE_NAME,
		async (job) => {
			if (job.name !== STREAK_NUDGE_JOB_NAME) {
				workerLog.warn(
					{ jobId: job.id, jobName: job.name },
					"skipping unknown job type"
				);
				return;
			}

			await runStreakNudgeJob(job.id);
		},
		{ connection: { url: env.REDIS_URL } }
	);

	attachWorkerLifecycleLogs(worker, workerLog, STREAK_NUDGE_QUEUE_NAME);
	workerLog.info("listening on queue");

	return worker;
}
