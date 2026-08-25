import { getLogger } from "@brnit/logger";
import type { PushNotificationJobPayload } from "@brnit/push/schemas";

/**
 * Dependency inversion for outbound push.
 *
 * `@brnit/api` must never import BullMQ — it is compiled into the web and
 * native bundles. So it declares the slot and `apps/server` fills it at boot
 * from `src/jobs/register-queue-handlers.ts`. Until something fills it the
 * default handler logs and drops, which is exactly the behaviour a client
 * bundle needs.
 */

export interface PushNotificationDispatch {
	/**
	 * Stable, deterministic id so a retried request cannot double-send. Chosen
	 * by the caller because only the caller knows what makes two dispatches
	 * "the same" — see `apps/server/src/jobs/job-ids.ts`.
	 */
	readonly jobId: string;
	readonly payload: PushNotificationJobPayload;
}

export type PushNotificationHandler = (
	dispatch: PushNotificationDispatch
) => Promise<void>;

let customHandler: PushNotificationHandler | null = null;

export function setPushNotificationHandler(
	handler: PushNotificationHandler | null
): void {
	customHandler = handler;
}

function defaultNoOpHandler(dispatch: PushNotificationDispatch): Promise<void> {
	getLogger()
		.child({ component: "push-notification" })
		.warn(
			{ jobId: dispatch.jobId, userId: dispatch.payload.userId },
			"push notification handler not registered; notification skipped"
		);
	return Promise.resolve();
}

/**
 * Fire-and-forget dispatch. Must never reject: a handler returns its DTO first
 * and side effects follow, so a push failure cannot be allowed to turn a
 * succeeded write into a failed request.
 */
export function dispatchPushNotificationBestEffort(
	dispatch: PushNotificationDispatch
): void {
	const handler = customHandler ?? defaultNoOpHandler;
	handler(dispatch).catch((error: unknown) => {
		getLogger()
			.child({ component: "push-notification" })
			.error(
				{ err: error, jobId: dispatch.jobId, userId: dispatch.payload.userId },
				"push notification dispatch failed"
			);
	});
}
