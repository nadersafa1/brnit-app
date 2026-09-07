import { addDaysUTC } from "@brnit/datetime";

/**
 * The two date windows a member's consumption must fall inside (§8.6).
 *
 * They are layered, not alternatives, and they answer different questions:
 *
 * 1. **The assignment window** — was this person even on a plan that day?
 *    `[startDate, endDate + DIET_PLAN_CONSUMPTION_GRACE_DAYS]`. The grace days
 *    exist so somebody can still record the last days of a plan after it lapses.
 * 2. **The backdate window** — is this a plausible log rather than a rewrite of
 *    history? `[today - MAX_CONSUMPTION_PAST_DAYS, today]`. Future days are
 *    always rejected.
 *
 * Both are inclusive at both ends and computed on UTC calendar dates. Kept pure
 * and injectable so the boundaries are testable without moving the clock.
 */

export interface DateWindow {
	maxDate: string;
	minDate: string;
}

/** `[startDate, endDate + graceDays]`. */
export function assignmentConsumptionWindow(
	assignment: { endDate: string; startDate: string },
	graceDays: number
): DateWindow {
	return {
		maxDate: addDaysUTC(assignment.endDate, graceDays),
		minDate: assignment.startDate,
	};
}

/** `[today - maxPastDays, today]`. */
export function consumptionBackdateWindow(
	today: string,
	maxPastDays: number
): DateWindow {
	return { maxDate: today, minDate: addDaysUTC(today, -maxPastDays) };
}

/** Inclusive membership. `'YYYY-MM-DD'` compares lexicographically as a date. */
export function isWithinDateWindow(date: string, window: DateWindow): boolean {
	return date >= window.minDate && date <= window.maxDate;
}
