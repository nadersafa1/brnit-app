import { db } from "@brnit/db";
import {
	dietPlanAssignment,
	dietPlanMealConsumption,
	member,
} from "@brnit/db/schema";
import { deviceToken } from "@brnit/db/schema/device-token";
import { and, eq, gte, inArray, lte, or } from "drizzle-orm";

/**
 * Finds the members whose streak is at risk on a UTC calendar date.
 *
 * At risk = **has an active assignment on that date** and **has logged nothing
 * on it**, matching the streak rule in `docs/migration/api-surface.md` §8.6.
 * There is no "streak was already long" filter: a missing day zeroes the count
 * whether it was 40 days or 1.
 */

/**
 * `member.id` rows are per organization and a person may have several, so the
 * assignee is always resolved to a `user.id` before anything is compared.
 */
function resolveAssigneeUserId(row: {
	directUserId: string | null;
	memberUserId: string | null;
}): string | null {
	return row.directUserId ?? row.memberUserId;
}

async function listUserIdsWithActiveAssignment(
	dateYmd: string
): Promise<string[]> {
	const rows = await db
		.select({
			directUserId: dietPlanAssignment.userId,
			memberUserId: member.userId,
		})
		.from(dietPlanAssignment)
		.leftJoin(member, eq(member.id, dietPlanAssignment.memberId))
		.where(
			and(
				lte(dietPlanAssignment.startDate, dateYmd),
				gte(dietPlanAssignment.endDate, dateYmd)
			)
		);

	const userIds = new Set<string>();
	for (const row of rows) {
		const userId = resolveAssigneeUserId(row);
		if (userId) {
			userIds.add(userId);
		}
	}
	return [...userIds];
}

/**
 * Users who logged something on `dateYmd`.
 *
 * Scoped to `candidateUserIds` but **not** to their active assignment: the
 * streak counts consumption dates across *every* assignment a user has, and the
 * consumption grace window lets a member still log against an assignment that
 * has already ended. Counting only the active one would nudge people who did
 * log.
 */
async function listUserIdsWhoLoggedOn(
	dateYmd: string,
	candidateUserIds: string[]
): Promise<Set<string>> {
	const rows = await db
		.select({
			directUserId: dietPlanAssignment.userId,
			memberUserId: member.userId,
		})
		.from(dietPlanMealConsumption)
		.innerJoin(
			dietPlanAssignment,
			eq(dietPlanAssignment.id, dietPlanMealConsumption.dietPlanAssignmentId)
		)
		.leftJoin(member, eq(member.id, dietPlanAssignment.memberId))
		.where(
			and(
				eq(dietPlanMealConsumption.consumedDate, dateYmd),
				or(
					inArray(dietPlanAssignment.userId, candidateUserIds),
					inArray(member.userId, candidateUserIds)
				)
			)
		);

	const userIds = new Set<string>();
	for (const row of rows) {
		const userId = resolveAssigneeUserId(row);
		if (userId) {
			userIds.add(userId);
		}
	}
	return userIds;
}

/**
 * Users with at least one registered device.
 *
 * Filtering here rather than letting the push queue no-op keeps a fan-out
 * proportional to *reachable* members instead of to every member with a plan —
 * most brnit accounts are web-only and have no device at all.
 */
async function listUserIdsWithADevice(
	candidateUserIds: string[]
): Promise<Set<string>> {
	const rows = await db
		.select({ userId: deviceToken.userId })
		.from(deviceToken)
		.where(inArray(deviceToken.userId, candidateUserIds));
	return new Set(rows.map((row) => row.userId));
}

/**
 * The user ids to nudge for `dateYmd`.
 *
 * Three queries, all keyed on the same candidate set. The set is bounded by
 * "members with an active plan", so the `IN` lists stay proportional to active
 * subscribers rather than to the whole user table; if that ever stops being
 * true this is the place to switch to a single joined statement.
 */
export async function findStreakNudgeUserIds(
	dateYmd: string
): Promise<string[]> {
	const candidateUserIds = await listUserIdsWithActiveAssignment(dateYmd);
	if (candidateUserIds.length === 0) {
		return [];
	}

	const [loggedToday, reachable] = await Promise.all([
		listUserIdsWhoLoggedOn(dateYmd, candidateUserIds),
		listUserIdsWithADevice(candidateUserIds),
	]);

	return candidateUserIds.filter(
		(userId) => reachable.has(userId) && !loggedToday.has(userId)
	);
}
