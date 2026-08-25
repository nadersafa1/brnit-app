import { z } from "zod";

/**
 * Contract half of the meal-reminder triplet. **No BullMQ import.**
 *
 * ## The timezone limitation
 *
 * `diet_plan_meal.scheduled_time` and `diet_plan_meal_time_override.scheduled_time`
 * are `HH:mm` **text** with no zone attached, and brnit stores no timezone for
 * a member, an organization or a plan. The server pins `TZ=UTC` and every
 * calendar date in the app is a UTC date, so this queue interprets `HH:mm` as
 * **UTC wall-clock time** — a member in UTC+2 with an 08:00 breakfast slot is
 * reminded at 10:00 their time.
 *
 * That is wrong for the product and right for the data we have: guessing a zone
 * from an IP or a device locale would silently move a nutritionist's carefully
 * chosen times. The fix is a real `timezone` column on `organization` (or
 * `member`); when it lands, only {@link mealReminderDelayMs} and the planner's
 * "today" have to change.
 */

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_MINUTE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const MEAL_REMINDER_QUEUE_NAME = "meal.reminders";

/** The delayed per-slot job that actually reminds someone. */
export const MEAL_REMINDER_SEND_JOB_NAME = "meal_reminder_send";

/** The daily cron job that enqueues a day's worth of `send` jobs. */
export const MEAL_REMINDER_PLAN_JOB_NAME = "meal_reminder_plan";

export const MEAL_REMINDER_SCHEDULER_ID = "meal-reminder-daily-plan";

/**
 * 00:05 UTC — just after the UTC day rolls over, so the planner sees the day it
 * is planning for. The five-minute offset keeps it clear of midnight jobs.
 */
export const MEAL_REMINDER_PLAN_CRON = "5 0 * * *";

export const MEAL_REMINDER_TITLE = "Time to eat";

export function mealReminderBody(
	mealType: string,
	scheduledTime: string
): string {
	return `Your ${mealType} is scheduled for ${scheduledTime}.`;
}

export const mealReminderJobPayloadSchema = z.object({
	dietPlanAssignmentId: z.string().min(1),
	dietPlanMealId: z.string().min(1),
	userId: z.string().min(1),
	/** The UTC calendar date this slot belongs to. */
	dateYmd: z.string().regex(UTC_DATE_PATTERN),
	/**
	 * The override-aware time the reminder was planned for. Re-checked by the
	 * worker: if the effective time has moved since planning, this job is stale
	 * and a newer one already exists.
	 */
	scheduledTime: z.string().regex(HOUR_MINUTE_PATTERN),
	mealType: z.string().min(1),
});

export type MealReminderJobPayload = z.infer<
	typeof mealReminderJobPayloadSchema
>;

export function parseMealReminderJobPayload(data: unknown) {
	return mealReminderJobPayloadSchema.safeParse(data);
}

/**
 * Milliseconds until `dateYmd` at `scheduledTime`, treating the pair as UTC.
 * Zero or negative means the slot is already past and nothing should be queued.
 */
export function mealReminderDelayMs(
	dateYmd: string,
	scheduledTime: string,
	nowMs: number = Date.now()
): number {
	return Date.parse(`${dateYmd}T${scheduledTime}:00.000Z`) - nowMs;
}
