import { HttpError } from "../http-error";
import type { DateWindow } from "./window";
import {
	assignmentConsumptionWindow,
	consumptionBackdateWindow,
	isWithinDateWindow,
} from "./window";

/**
 * The four ways logging a meal can be refused (§8.6), each with the exact
 * status, message and `details` the clients already handle.
 *
 * They are pure functions of values the caller has already read, so the whole
 * refusal surface is testable without a database or a clock.
 */

const OUT_OF_ALLOWED_DATE_RANGE =
	"consumedAt must not be in the future and must be within the allowed backdate window";
const OUT_OF_ASSIGNMENT_RANGE =
	"consumedAt must be within the assignment period (startDate to endDate + grace days)";
const DUPLICATE = "Consumption already logged for this slot on this date";

export interface AssignmentWindowSource {
	endDate: string;
	startDate: string;
}

/**
 * Route-level guard: was the person on this plan that day?
 *
 * `details` carries the plan's own dates and the grace allowance so the client
 * can say *why* rather than just "invalid date".
 */
export function assertWithinAssignmentWindow(
	consumedDate: string,
	assignment: AssignmentWindowSource,
	graceDays: number
): void {
	const window: DateWindow = assignmentConsumptionWindow(assignment, graceDays);
	if (isWithinDateWindow(consumedDate, window)) {
		return;
	}
	throw new HttpError(400, OUT_OF_ASSIGNMENT_RANGE, {
		endDate: assignment.endDate,
		graceDays,
		startDate: assignment.startDate,
	});
}

/**
 * Service-level guard: is this a log rather than a rewrite of history?
 *
 * Applies to every writer, nutritionists included — the record itself must stay
 * plausible whoever files it.
 */
export function assertWithinBackdateWindow(
	consumedDate: string,
	today: string,
	maxPastDays: number
): void {
	const window = consumptionBackdateWindow(today, maxPastDays);
	if (isWithinDateWindow(consumedDate, window)) {
		return;
	}
	throw new HttpError(400, OUT_OF_ALLOWED_DATE_RANGE, {
		reason: `consumedAt must be between ${window.minDate} and ${window.maxDate}`,
	});
}

/**
 * The unique index on `(assignment, plan meal, consumed date)` made explicit, so
 * a repeat tap answers **409** rather than a raw constraint violation.
 */
export function assertNotAlreadyLogged(
	existingConsumptionId: string | undefined
): void {
	if (existingConsumptionId) {
		throw new HttpError(409, DUPLICATE);
	}
}

/** Names every food the payload referenced that does not exist. */
export function assertNoMissingFoodItems(missingFoodItemIds: string[]): void {
	if (missingFoodItemIds.length > 0) {
		throw new HttpError(
			400,
			`Food item(s) not found: ${missingFoodItemIds.join(", ")}`
		);
	}
}
