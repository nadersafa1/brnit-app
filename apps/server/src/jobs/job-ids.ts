/**
 * Deterministic BullMQ job ids.
 *
 * Every id is a pure function of what makes two dispatches "the same piece of
 * work". BullMQ refuses to add a job whose id already exists, so this is both
 * the dedup mechanism (a double-submitted request enqueues once) and the
 * cancellation handle (`queue.getJob(id)` then `job.remove()`).
 *
 * BullMQ rejects `:` in custom job ids, so ids are `-` separated and every
 * interpolated part goes through {@link sanitizeJobIdPart}.
 */

const UNSAFE_JOB_ID_CHARS = /[^a-zA-Z0-9_-]/g;

export function sanitizeJobIdPart(value: string): string {
	return value.replace(UNSAFE_JOB_ID_CHARS, "_");
}

/**
 * One reminder per (assignment, slot, day). Re-planning the same day is
 * therefore idempotent, and moving a meal's time cancels by the same id.
 */
export function mealReminderJobId(args: {
	dateYmd: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
}): string {
	return `meal-reminder-${sanitizeJobIdPart(args.dietPlanAssignmentId)}-${sanitizeJobIdPart(args.dietPlanMealId)}-${sanitizeJobIdPart(args.dateYmd)}`;
}

/** The push a meal reminder produces; same key, so a re-fired job cannot double-send. */
export function mealReminderPushJobId(args: {
	dateYmd: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
}): string {
	return `push-${mealReminderJobId(args)}`;
}

/** At most one streak nudge per user per UTC day, however often the cron runs. */
export function streakNudgePushJobId(args: {
	dateYmd: string;
	userId: string;
}): string {
	return `push-streak-nudge-${sanitizeJobIdPart(args.userId)}-${sanitizeJobIdPart(args.dateYmd)}`;
}
