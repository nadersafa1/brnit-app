import { env } from "@brnit/env/server";
import type { Worker } from "bullmq";
import { Worker as BullWorker } from "bullmq";

import { deliverPushToUser } from "../jobs/push-delivery.js";
import {
	PUSH_NOTIFICATION_JOB_NAME,
	PUSH_NOTIFICATION_QUEUE_NAME,
	parsePushNotificationJobPayloadFromJob,
} from "../jobs/push-notification-contract.js";
import {
	attachWorkerLifecycleLogs,
	createWorkerLogger,
} from "../jobs/worker-logger.js";

const workerLog = createWorkerLogger(
	"worker-push-notification",
	PUSH_NOTIFICATION_QUEUE_NAME
);

/**
 * Retry consumer for pushes the API process could not deliver inline.
 *
 * Everything here is a *second* attempt — `enqueuePushNotificationBestEffort`
 * sends first and only queues on total failure — so a job arriving means FCM
 * or the network was down, and letting the error escape is the point: BullMQ's
 * exponential backoff is the retry policy.
 */
export function startPushNotificationWorker(): Worker {
	if (!env.REDIS_URL) {
		throw new Error("REDIS_URL is required for the push notification worker");
	}

	const worker = new BullWorker(
		PUSH_NOTIFICATION_QUEUE_NAME,
		async (job) => {
			if (job.name !== PUSH_NOTIFICATION_JOB_NAME) {
				workerLog.warn(
					{ jobId: job.id, jobName: job.name },
					"skipping unknown job type"
				);
				return;
			}

			const parsed = parsePushNotificationJobPayloadFromJob(job.data);
			if (!parsed.success) {
				workerLog.error(
					{ jobId: job.id, err: parsed.error },
					"invalid push notification job payload"
				);
				throw new Error("Invalid push notification job payload");
			}

			const result = await deliverPushToUser(parsed.data);
			workerLog.info(
				{
					jobId: job.id,
					userId: parsed.data.userId,
					category: parsed.data.category,
					sent: result.sent,
					failed: result.failed,
				},
				"push notification delivered"
			);

			// Nothing sent and something failed means FCM is still refusing;
			// throw so this job backs off instead of silently completing.
			if (result.sent === 0 && result.failed > 0) {
				throw new Error("Push delivery failed for every device token");
			}
		},
		{ connection: { url: env.REDIS_URL } }
	);

	attachWorkerLifecycleLogs(worker, workerLog, PUSH_NOTIFICATION_QUEUE_NAME);
	workerLog.info("listening on queue");

	return worker;
}
