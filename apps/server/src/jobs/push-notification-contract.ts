import { parsePushNotificationJobPayload } from "@brnit/push/schemas";

/**
 * Contract half of the push-notification triplet: names and payload parsing,
 * importable from anywhere. **No BullMQ import** — the worker and the queue
 * both depend on this file, and a test that only needs the payload rules must
 * not drag a Redis client in with it.
 */

export const PUSH_NOTIFICATION_QUEUE_NAME = "push.notifications";

export const PUSH_NOTIFICATION_JOB_NAME = "push_notification";

/**
 * Re-validates a payload coming back out of Redis. The job was validated when
 * it was enqueued, but it may have been sitting in the queue across a deploy
 * that changed the schema, so the worker treats it as `unknown`.
 */
export function parsePushNotificationJobPayloadFromJob(data: unknown) {
	return parsePushNotificationJobPayload(data);
}
