import { db } from "@brnit/db";
import { dietPlanAssignment, member } from "@brnit/db/schema";
import { eq, inArray, or } from "drizzle-orm";

import { HttpError } from "../http-error";

/**
 * The one-plan-per-day rule (§8.3).
 *
 * A person may hold at most one diet-plan assignment covering any given
 * calendar day, **organization-wide**. Because an assignment points either at a
 * `user` row or at one of that user's `member` rows, the check has to widen from
 * whichever assignee it was handed to the whole pool of identities that resolve
 * to the same human: the direct `user.id`, plus every `member.id` for that user
 * across every organization they belong to.
 *
 * The pool is resolved in SQL; the date comparison and the exclude-self rule are
 * pure functions over the resulting rows. That split is deliberate — a person's
 * assignment history is small (the rule itself guarantees it) and the interesting
 * half of the logic becomes directly testable instead of hiding in a `WHERE`.
 */

export interface AssignmentDateRange {
	endDate: string;
	id: string;
	startDate: string;
}

export interface DateRange {
	endDate: string;
	startDate: string;
}

const OVERLAP_MESSAGE =
	"Overlapping assignment exists for this user or their member records";

/**
 * Do two inclusive date ranges share at least one day?
 *
 * Mirrors `startDate <= newEnd AND endDate >= newStart`. `'YYYY-MM-DD'` is
 * fixed-width and zero-padded, so lexicographic comparison is chronological.
 */
export function dateRangesOverlap(a: DateRange, b: DateRange): boolean {
	return a.startDate <= b.endDate && a.endDate >= b.startDate;
}

/**
 * The first assignment in `rows` that collides with `range`, ignoring
 * `excludeAssignmentId` — an update must not conflict with itself.
 */
export function findOverlappingAssignment(
	rows: readonly AssignmentDateRange[],
	range: DateRange,
	excludeAssignmentId?: string | null
): AssignmentDateRange | undefined {
	return rows.find(
		(row) =>
			row.id !== excludeAssignmentId && dateRangesOverlap(row, range)
	);
}

/**
 * Every `member.id` belonging to `userId`, across all organizations.
 *
 * Deliberately unscoped: a member assigned a plan in one organization must not
 * be given an overlapping plan in another, and the `member` table has no unique
 * constraint on `(organization_id, user_id)` so one user can legitimately have
 * several rows.
 */
export async function listMemberIdsForUser(userId: string): Promise<string[]> {
	const rows = await db
		.select({ id: member.id })
		.from(member)
		.where(eq(member.userId, userId));
	return rows.map((row) => row.id);
}

/**
 * Every assignment held by the identity pool `userId` resolves to. Dates are
 * not filtered here — {@link findOverlappingAssignment} decides.
 */
export async function listAssignmentsForAssigneePool(
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

/**
 * How the assignee pool is loaded. Injectable so the composition — "widen to
 * every membership, *then* compare dates" — can be exercised without a database.
 */
export interface AssigneePoolLoader {
	listAssignments(
		userId: string,
		memberIds: readonly string[]
	): Promise<AssignmentDateRange[]>;
	listMemberIds(userId: string): Promise<string[]>;
}

const databaseAssigneePool: AssigneePoolLoader = {
	listAssignments: listAssignmentsForAssigneePool,
	listMemberIds: listMemberIdsForUser,
};

/**
 * Throws **409** when `range` collides with an assignment already held by the
 * same person, anywhere. Pass `excludeAssignmentId` when re-checking an update,
 * or the assignment will conflict with itself and become uneditable.
 */
export async function assertNoOverlappingAssignment(
	params: {
		assigneeUserId: string;
		excludeAssignmentId?: string | null;
		range: DateRange;
	},
	loader: AssigneePoolLoader = databaseAssigneePool
): Promise<void> {
	const memberIds = await loader.listMemberIds(params.assigneeUserId);
	const rows = await loader.listAssignments(params.assigneeUserId, memberIds);
	const conflict = findOverlappingAssignment(
		rows,
		params.range,
		params.excludeAssignmentId
	);
	if (conflict) {
		// No machine-readable `code` on the wire: the pre-overhaul route answered
		// `{ error }` only, and the clients match on the status.
		throw new HttpError(409, OVERLAP_MESSAGE);
	}
}
