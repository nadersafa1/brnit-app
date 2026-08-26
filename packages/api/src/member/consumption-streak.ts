import { addDaysUTC, getTodayUtcDateString } from "@brnit/datetime";
import { db } from "@brnit/db";
import { dietPlanAssignment, dietPlanMealConsumption } from "@brnit/db/schema";
import { gte, inArray } from "drizzle-orm";

import { combineConditions } from "../db/query-conditions";
import type { ConsumptionStreakDto } from "./dto";
import { assignmentAssigneeCondition, getUserMemberIds } from "./member-access";

/**
 * `GET /member/me/consumption-streak` — consecutive days, ending today, on
 * which the member logged at least one meal.
 *
 * One logged meal counts the whole day, and the walk is over UTC calendar
 * dates because `consumed_date` is a `date` column the server writes in UTC.
 */

/**
 * How far back the walk can possibly reach.
 *
 * A year of dates is far more than any real streak and bounds the query, so a
 * member with years of history does not drag their whole log into memory.
 */
const STREAK_LOOKBACK_DAYS = 365;

/**
 * The streak ending at `today`.
 *
 * **Not logging today breaks the streak immediately** — this returns 0 when
 * `today` is absent from the set, rather than counting back from yesterday.
 * That is deliberate: the badge is a "keep it up today" prompt, not a record
 * of the longest run.
 */
export function calculateConsumptionStreak(
	consumedDates: ReadonlySet<string>,
	today: string
): number {
	if (!consumedDates.has(today)) {
		return 0;
	}

	let streak = 0;
	let cursor = today;
	while (consumedDates.has(cursor)) {
		streak += 1;
		cursor = addDaysUTC(cursor, -1);
	}
	return streak;
}

export async function loadConsumptionStreak(
	userId: string
): Promise<ConsumptionStreakDto> {
	const memberIds = await getUserMemberIds(userId);
	const assignmentRows = await db
		.select({ id: dietPlanAssignment.id })
		.from(dietPlanAssignment)
		.where(assignmentAssigneeCondition(userId, memberIds));

	const assignmentIds = assignmentRows.map((row) => row.id);
	if (assignmentIds.length === 0) {
		return { streak: 0 };
	}

	const today = getTodayUtcDateString();
	const earliestDate = addDaysUTC(today, -STREAK_LOOKBACK_DAYS);

	const consumptionRows = await db
		.selectDistinct({ consumedDate: dietPlanMealConsumption.consumedDate })
		.from(dietPlanMealConsumption)
		.where(
			combineConditions([
				inArray(dietPlanMealConsumption.dietPlanAssignmentId, assignmentIds),
				gte(dietPlanMealConsumption.consumedDate, earliestDate),
			])
		);

	const consumedDates = new Set(consumptionRows.map((row) => row.consumedDate));

	return { streak: calculateConsumptionStreak(consumedDates, today) };
}
