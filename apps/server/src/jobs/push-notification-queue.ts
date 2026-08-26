import { env } from "@brnit/env/server";
import type { PushNotificationJobPayload } from "@brnit/push/schemas";
import { Queue } from "bullmq";

import { deliverPushToUser } from "./push-delivery.js";
import {
	PUSH_NOTIFICATION_JOB_NAME,
	PUSH_NOTIFICATION_QUEUE_NAME,
} from "./push-notification-contract.js";
import { SHARED_QUEUE_DEFAULT_JOB_OPTIONS } from "./queue-defaults.js";
import { createWorkerLogger } from "./worker-logger.js";

const pushLog = createWorkerLogger(
	"push-notification",
	PUSH_NOTIFICATION_QUEUE_NAME
);

let queueInstance: Queue<PushNotificationJobPayload> | undefined;

/**
 * Lazy singleton. Returns `null` when `REDIS_URL` is unset so the whole job
 * layer degrades to "no queue" instead of failing to boot — local dev and the
 * test suite run without Redis.
 */
export function getPushNotificationQueue(): Queue<PushNotificationJobPayload> | null {
	if (!env.REDIS_URL) {
		return null;
	}

	queueInstance ??= new Queue<PushNotificationJobPayload>(
		PUSH_NOTIFICATION_QUEUE_NAME,
		{
			connection: { url: env.REDIS_URL },
			defaultJobOptions: SHARED_QUEUE_DEFAULT_JOB_OPTIONS,
		}
	);
	return queueInstance;
}

export interface PushNotificationEnqueueArgs {
	readonly jobId: string;
	readonly payload: PushNotificationJobPayload;
}

async function enqueuePushNotification(
	args: PushNotificationEnqueueArgs
): Promise<void> {
	const queue = getPushNotificationQueue();
	if (!queue) {
		pushLog.warn(
			{ userId: args.payload.userId, jobId: args.jobId },
			"REDIS_URL is not set; push notification retry was not queued"
		);
		return;
	}

	await queue.add(PUSH_NOTIFICATION_JOB_NAME, args.payload, {
		jobId: args.jobId,
	});
}

/**
 * Delivers push from the calling process first, and only queues a retry if that
 * fails.
 *
 * The order matters: a single-container deploy with no worker still sends push,
 * and the common case costs one FCM call instead of a Redis round-trip plus a
 * worker hop. The queue is the *retry* path, not the primary one.
 *
 * "Failed" means FCM rejected every token it was given. Zero devices is not a
 * failure — see {@link deliverPushToUser} — so a member without the app
 * installed never enqueues anything.
 */
export async function enqueuePushNotificationBestEffort(
	args: PushNotificationEnqueueArgs
): Promise<void> {
	try {
		const result = await deliverPushToUser(args.payload);
		// Any success ends it. Retrying a partial failure would re-send to the
		// tokens that already worked, because FCM multicast has no per-token
		// resume — a duplicate notification is worse than a missed one.
		if (result.sent > 0 || result.failed === 0) {
			return;
		}
		pushLog.warn(
			{ userId: args.payload.userId, jobId: args.jobId, failed: result.failed },
			"sync push delivery had failures; enqueueing retry"
		);
	} catch (error: unknown) {
		pushLog.error(
			{ err: error, userId: args.payload.userId, jobId: args.jobId },
			"sync push delivery failed; enqueueing retry"
		);
	}

	try {
		await enqueuePushNotification(args);
	} catch (error: unknown) {
		pushLog.error(
			{ err: error, userId: args.payload.userId, jobId: args.jobId },
			"push notification enqueue failed"
		);
	}
}
