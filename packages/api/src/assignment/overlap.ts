import { db } from "@brnit/db";
import { dietPlanAssignment, member } from "@brnit/db/schema";
import { eq, inArray, or } from "drizzle-orm";

import type { AssigneePoolLoader, AssignmentDateRange } from "./rules";

/**
 * The reads behind the one-plan-per-day rule. The rule itself is in `./rules.ts`.
 *
 * Dates are deliberately **not** filtered in SQL: a person's assignment history
 * is small (the rule guarantees it), and comparing in TypeScript keeps the
 * decision testable instead of hiding it in a `WHERE`.
 */

/**
 * Every `member.id` belonging to `userId`, across all organizations.
 *
 * Deliberately unscoped: a member assigned a plan in one organization must not
 * be given an overlapping plan in another.
 */
async function listMemberIdsForUser(userId: string): Promise<string[]> {
	const rows = await db
		.select({ id: member.id })
		.from(member)
		.where(eq(member.userId, userId));
	return rows.map((row) => row.id);
}

/** Every assignment held by the identity pool `userId` resolves to. */
async function listAssignmentsForAssigneePool(
	userId: string,
	memberIds: readonly string[]
): Promise<AssignmentDateRange[]> {
	const directlyAssigned = eq(dietPlanAssignment.userId, userId);
	const pool =
		memberIds.length > 0
			? or(
					directlyAssigned,
					inArray(dietPlanAssignment.memberId, [...memberIds])
				)
			: directlyAssigned;

	return await db
		.select({
			endDate: dietPlanAssignment.endDate,
			id: dietPlanAssignment.id,
			startDate: dietPlanAssignment.startDate,
		})
		.from(dietPlanAssignment)
		.where(pool);
}

/** The production loader passed to `assertNoOverlappingAssignment`. */
export const databaseAssigneePool: AssigneePoolLoader = {
	listAssignments: listAssignmentsForAssigneePool,
	listMemberIds: listMemberIdsForUser,
};
