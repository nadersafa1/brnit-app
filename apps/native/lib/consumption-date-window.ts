import { env } from "@brnit/env/native";

import {
	addCalendarDays,
	isCalendarDateString,
	todayLocalDateString,
} from "@/lib/date/calendar-date";

/**
 * Client-side pre-check for whether a member may log (or un-log) a meal on a
 * given day.
 *
 * This mirrors the two layered server rules — the assignment window
 * `[startDate, endDate + grace]` and the backdate window
 * `[today - MAX_CONSUMPTION_PAST_DAYS, today]` — so the UI can grey a button out
 * instead of firing a request that will come back 400.
 *
 * "Today" here is the **device's** today, deliberately: the server reckons in
 * UTC, and the offset between the two is exactly what posting `consumedAt` at
 * 12:00 local absorbs. Do not switch this to UTC on its own.
 *
 * Every comparison runs on `'YYYY-MM-DD'` strings, which are fixed-width and
 * zero-padded, so lexicographic order is chronological order.
 */

/**
 * Mirrors the server clamp. The default (2) and the 0–365 bounds are enforced
 * by the env schema in `@brnit/env/native`, so nothing is re-validated here.
 */
export function getMaxConsumptionPastDays(): number {
	return env.EXPO_PUBLIC_MAX_CONSUMPTION_PAST_DAYS;
}

/** True when `consumedDate` sits inside `[today - maxPastDays, today]`. */
export function isWithinConsumptionDateWindow(
	consumedDate: string,
	maxPastDays = getMaxConsumptionPastDays()
): boolean {
	const today = todayLocalDateString();
	const earliest = addCalendarDays(today, -maxPastDays);
	return consumedDate >= earliest && consumedDate <= today;
}

export class ConsumptionDateOutOfAllowedWindowError extends Error {
	constructor() {
		super("Consumption date must be within the allowed range.");
		this.name = "ConsumptionDateOutOfAllowedWindowError";
	}
}

export interface ConsumptionMarkEligibility {
	allowed: boolean;
	reason?: string;
}

export interface ConsumptionMarkEligibilityOptions {
	assignmentEndDate?: string;
	assignmentStartDate?: string;
	maxPastDays?: number;
}

/**
 * The assignment window, with `maxPastDays` of grace past `endDate` — the same
 * grace the server's route-level guard applies.
 */
function isWithinAssignmentWindow(
	consumedDate: string,
	startDate: string,
	endDate: string,
	maxPastDays: number
): boolean {
	const endWithGrace = addCalendarDays(endDate, maxPastDays);
	return consumedDate >= startDate && consumedDate <= endWithGrace;
}

export function getConsumptionMarkEligibility(
	consumedDate: string,
	options?: ConsumptionMarkEligibilityOptions
): ConsumptionMarkEligibility {
	if (!isCalendarDateString(consumedDate)) {
		return { allowed: false, reason: "Invalid date" };
	}

	const maxPastDays = options?.maxPastDays ?? getMaxConsumptionPastDays();
	const today = todayLocalDateString();

	if (consumedDate > today) {
		return { allowed: false, reason: "Cannot mark future dates" };
	}
	if (consumedDate < addCalendarDays(today, -maxPastDays)) {
		return { allowed: false, reason: `Only last ${maxPastDays} days` };
	}

	const { assignmentStartDate, assignmentEndDate } = options ?? {};
	if (
		assignmentStartDate &&
		assignmentEndDate &&
		!isWithinAssignmentWindow(
			consumedDate,
			assignmentStartDate,
			assignmentEndDate,
			maxPastDays
		)
	) {
		return { allowed: false, reason: "Date is outside your plan period" };
	}

	return { allowed: true };
}
