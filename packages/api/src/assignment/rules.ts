import { HttpError } from "../http-error";

/**
 * The assignment rules, free of Drizzle and of the database.
 *
 * Two invariants live here, and both are about *identity* rather than storage:
 *
 * - **One plan per day, organization-wide.** A person may hold at most one
 *   assignment covering any calendar day. Because an assignment names either a
 *   `user` row or one of that person's `member` rows, the check has to widen
 *   from whichever assignee it was handed to the whole pool of identities that
 *   resolve to the same human.
 * - **Ownership.** A member-facing request owns an assignment when it matches
 *   either assignee form.
 *
 * Keeping them here means the interesting half of the logic is a pure function
 * over rows, testable without a database, while `./overlap.ts` and `./access.ts`
 * supply the reads.
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
		(row) => row.id !== excludeAssignmentId && dateRangesOverlap(row, range)
	);
}

/**
 * How the assignee pool is loaded. Injected rather than imported so the
 * composition — "widen to every membership, *then* compare dates" — can be
 * exercised without a database.
 */
export interface AssigneePoolLoader {
	listAssignments(
		userId: string,
		memberIds: readonly string[]
	): Promise<AssignmentDateRange[]>;
	listMemberIds(userId: string): Promise<string[]>;
}

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
	loader: AssigneePoolLoader
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

export interface AssignmentAssignee {
	memberId: string | null;
	userId: string | null;
}

/**
 * Does this assignment belong to the caller?
 *
 * `memberIds` is every `member.id` the caller holds, across all organizations —
 * one user legitimately has several, and the `member` table has no unique
 * constraint on `(organization_id, user_id)`.
 */
export function assignmentBelongsToUser(
	row: AssignmentAssignee,
	userId: string,
	memberIds: ReadonlySet<string>
): boolean {
	if (row.userId === userId) {
		return true;
	}
	return row.memberId !== null && memberIds.has(row.memberId);
}

/**
 * The organization a nutritionist request operates in.
 *
 * `isAppAdmin` is not "has an org too" — app admins have no `member` row at all
 * and are deliberately unscoped, so `organizationId` is legitimately `null` for
 * them.
 */
export interface NutritionistScope {
	isAppAdmin: boolean;
	organizationId: string | null;
}

/** Resolves whether an assignment's assignee belongs to an organization. */
export interface OrganizationScopeProbe {
	assignmentBelongsToOrganization(
		assignmentId: string,
		organizationId: string
	): Promise<boolean>;
}

/**
 * May this scope touch that assignment?
 *
 * App admins pass without a probe. Everyone else needs an active organization
 * (**403**) and an assignment whose assignee is one of its members; anything
 * else is **404**, never 403, so a nutritionist in organization A cannot use the
 * status code to discover which ids exist in organization B.
 *
 * The probe is injected rather than imported so the rule stays free of the
 * database, matching {@link assertNoOverlappingAssignment}.
 */
export async function assertAssignmentVisibleToScope(
	params: {
		assignmentId: string;
		/** Overridable so a consumption reads "Consumption not found". */
		notFoundMessage?: string;
		noOrganizationMessage?: string;
		scope: NutritionistScope;
	},
	probe: OrganizationScopeProbe
): Promise<void> {
	const { assignmentId, scope } = params;
	if (scope.isAppAdmin) {
		return;
	}
	if (!scope.organizationId) {
		throw new HttpError(
			403,
			params.noOrganizationMessage ?? "Active organization required"
		);
	}
	const visible = await probe.assignmentBelongsToOrganization(
		assignmentId,
		scope.organizationId
	);
	if (!visible) {
		throw new HttpError(404, params.notFoundMessage ?? "Assignment not found");
	}
}
