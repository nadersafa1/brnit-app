import { getTodayUtcDateString } from "@brnit/datetime";
import { env } from "@brnit/env/server";
import { Queue } from "bullmq";

import { mealReminderJobId } from "./job-ids.js";
import type { MealReminderJobPayload } from "./meal-reminder-contract.js";
import {
	MEAL_REMINDER_QUEUE_NAME,
	MEAL_REMINDER_SEND_JOB_NAME,
	mealReminderDelayMs,
} from "./meal-reminder-contract.js";
import { planMealRemindersForDate } from "./meal-reminder-planner.js";
import { SHARED_QUEUE_DEFAULT_JOB_OPTIONS } from "./queue-defaults.js";
import { createWorkerLogger } from "./worker-logger.js";

const log = createWorkerLogger("meal-reminder", MEAL_REMINDER_QUEUE_NAME);

let queueInstance: Queue | undefined;

/** Lazy singleton; `null` when `REDIS_URL` is unset. */
export function getMealReminderQueue(): Queue | null {
	if (!env.REDIS_URL) {
		return null;
	}

	queueInstance ??= new Queue(MEAL_REMINDER_QUEUE_NAME, {
		connection: { url: env.REDIS_URL },
		defaultJobOptions: SHARED_QUEUE_DEFAULT_JOB_OPTIONS,
	});
	return queueInstance;
}

/**
 * Queues one delayed reminder, or skips it when the slot's time has already
 * passed. The deterministic job id makes re-planning the same day a no-op
 * rather than a duplicate.
 */
async function enqueueMealReminder(
	payload: MealReminderJobPayload
): Promise<boolean> {
	const queue = getMealReminderQueue();
	if (!queue) {
		return false;
	}

	const delay = mealReminderDelayMs(payload.dateYmd, payload.scheduledTime);
	if (delay <= 0) {
		return false;
	}

	await queue.add(MEAL_REMINDER_SEND_JOB_NAME, payload, {
		delay,
		jobId: mealReminderJobId(payload),
	});
	return true;
}

export interface MealReminderPlanResult {
	/** Slots that resolved to a time on this date. */
	readonly planned: number;
	/** Of those, the ones still in the future and therefore queued. */
	readonly queued: number;
}

/**
 * Plans and queues every reminder for `dateYmd`.
 *
 * Slots whose time has already passed are counted but not queued — a plan
 * created at noon should not fire this morning's breakfast reminder.
 */
export async function scheduleMealRemindersForDate(
	dateYmd: string,
	options: { dietPlanAssignmentId?: string } = {}
): Promise<MealReminderPlanResult> {
	const reminders = await planMealRemindersForDate(dateYmd, options);

	let queued = 0;
	for (const reminder of reminders) {
		if (await enqueueMealReminder(reminder)) {
			queued += 1;
		}
	}

	return { planned: reminders.length, queued };
}

/**
 * Post-write hook for the assignment and meal-time-override controllers.
 *
 * Only ever *adds* jobs for the rest of today: a reminder whose time moved is
 * detected and dropped by the worker, which re-resolves the effective time
 * before sending. That keeps this call cheap enough to run inline after a
 * write, and never rejects the request.
 */
export function scheduleMealRemindersForAssignmentBestEffort(
	dietPlanAssignmentId: string
): void {
	scheduleMealRemindersForDate(getTodayUtcDateString(), {
		dietPlanAssignmentId,
	}).catch((error: unknown) => {
		log.error(
			{ err: error, dietPlanAssignmentId },
			"failed to schedule meal reminders after write"
		);
	});
}
