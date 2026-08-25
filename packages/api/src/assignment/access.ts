import { db } from "@brnit/db";
import { dietPlanAssignment, member } from "@brnit/db/schema";
import { eq, inArray, or } from "drizzle-orm";

import { HttpError } from "../http-error";

/**
 * Ownership of an assignment, from the member's side.
 *
 * An assignment names its assignee either directly (`user_id`) or through one of
 * that person's organization memberships (`member_id`) — the two columns are an
 * XOR at the database level. A member-facing request therefore owns an
 * assignment when it matches *either* form, and the caller may have several
 * `member` rows because one user can belong to several organizations.
 *
 * Every member handler re-runs this even behind a session guard: the guard
 * proves who is calling, never what they may touch.
 */

export interface OwnedAssignment {
	dietPlanId: string;
	endDate: string;
	id: string;
	memberId: string | null;
	startDate: string;
	userId: string | null;
}

/** Pure ownership predicate — the rule the SQL below feeds. */
export function assignmentBelongsToUser(
	row: Pick<OwnedAssignment, "memberId" | "userId">,
	userId: string,
	memberIds: ReadonlySet<string>
): boolean {
	if (row.userId === userId) {
		return true;
	}
	return row.memberId !== null && memberIds.has(row.memberId);
}

/** All `member.id` values for a user, across every organization. */
export async function listMemberIdSetForUser(
	userId: string
): Promise<Set<string>> {
	const rows = await db
		.select({ id: member.id })
		.from(member)
		.where(eq(member.userId, userId));
	return new Set(rows.map((row) => row.id));
}

/**
 * The assignment, or `null` when it does not exist **or** is not the caller's.
 * The two cases are deliberately indistinguishable to the client.
 */
export async function findAssignmentForUser(
	userId: string,
	assignmentId: string
): Promise<OwnedAssignment | null> {
	const [memberIds, rows] = await Promise.all([
		listMemberIdSetForUser(userId),
		db
			.select({
				dietPlanId: dietPlanAssignment.dietPlanId,
				endDate: dietPlanAssignment.endDate,
				id: dietPlanAssignment.id,
				memberId: dietPlanAssignment.memberId,
				startDate: dietPlanAssignment.startDate,
				userId: dietPlanAssignment.userId,
			})
			.from(dietPlanAssignment)
			.where(eq(dietPlanAssignment.id, assignmentId))
			.limit(1),
	]);

	const row = rows[0];
	if (!row) {
		return null;
	}
	return assignmentBelongsToUser(row, userId, memberIds) ? row : null;
}

/**
 * As {@link findAssignmentForUser}, but throws **403** instead of returning
 * `null`. `message` is a parameter because the two member-facing families word
 * this failure differently and both wordings are part of the contract.
 */
export async function requireAssignmentForUser(
	userId: string,
	assignmentId: string,
	message: string
): Promise<OwnedAssignment> {
	const assignment = await findAssignmentForUser(userId, assignmentId);
	if (!assignment) {
		throw new HttpError(403, message);
	}
	return assignment;
}

/** Every assignment id the caller may read, direct or via any membership. */
export async function listAssignmentIdsForUser(
	userId: string
): Promise<string[]> {
	const memberIds = [...(await listMemberIdSetForUser(userId))];
	const directlyAssigned = eq(dietPlanAssignment.userId, userId);
	const owned =
		memberIds.length > 0
			? or(directlyAssigned, inArray(dietPlanAssignment.memberId, memberIds))
			: directlyAssigned;

	const rows = await db
		.select({ id: dietPlanAssignment.id })
		.from(dietPlanAssignment)
		.where(owned);
	return rows.map((row) => row.id);
}
