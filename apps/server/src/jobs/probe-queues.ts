import type { Queue } from "bullmq";

import { getMealReminderQueue } from "./meal-reminder-queue.js";
import { getPushNotificationQueue } from "./push-notification-queue.js";
import { getStreakNudgeQueue } from "./streak-nudge-queue.js";

/**
 * Queues included in readiness probes when Redis is configured.
 *
 * Listed explicitly rather than self-registered: the lazy singletons are only
 * built on first use, so a registry would report `skipped` on a freshly booted
 * API process that has not sent a push yet — precisely when a readiness probe
 * matters most. Naming them here builds them on the first health check instead.
 *
 * `lib/health/checks.ts` probes only the first entry; the rest are here so the
 * check can see how many queues the process owns.
 */
export function getProbeQueues(): readonly Queue[] {
	return [
		getPushNotificationQueue(),
		getMealReminderQueue(),
		getStreakNudgeQueue(),
	].filter((queue): queue is Queue => queue !== null);
}
