import { db } from "@brnit/db";
import { dietPlanAssignment, member, organization } from "@brnit/db/schema";
import { and, eq, inArray, or, type SQL } from "drizzle-orm";

import { HttpError } from "../http-error";

/**
 * Membership resolution shared by the member read endpoints.
 *
 * Handlers re-assert authorization here rather than trusting `ctx.memberId`:
 * the route guards populate the context, but a handler that trusts them
 * blindly becomes unsafe the moment it is mounted behind a different guard or
 * called from a job.
 */

/** No organization could be resolved for the caller. */
export const NO_ORGANIZATION_ERROR_CODE = "NO_ORGANIZATION" as const;

/** An organization was resolved but the caller does not belong to it. */
export const NOT_MEMBER_ERROR_CODE = "NOT_MEMBER" as const;

export interface MemberOrganizationScope {
	memberId: string;
	organization: { id: string; name: string };
	organizationId: string;
}

/**
 * Every `member.id` a user owns, across all organizations.
 *
 * A diet plan assignment points at either `user_id` *or* `member_id`, so both
 * sets have to be considered to answer "which assignments are mine".
 */
export async function getUserMemberIds(userId: string): Promise<string[]> {
	const rows = await db
		.select({ id: member.id })
		.from(member)
		.where(eq(member.userId, userId));
	return rows.map((row) => row.id);
}

/**
 * `(assignment.userId = me OR assignment.memberId IN my member ids)`.
 *
 * The `inArray` half is omitted when the user has no memberships, keeping the
 * generated SQL free of an empty `IN ()` list.
 */
export function assignmentAssigneeCondition(
	userId: string,
	memberIds: readonly string[]
): SQL<unknown> | undefined {
	const conditions: SQL<unknown>[] = [eq(dietPlanAssignment.userId, userId)];
	if (memberIds.length > 0) {
		conditions.push(inArray(dietPlanAssignment.memberId, [...memberIds]));
	}
	return or(...conditions);
}

/**
 * Proves the caller belongs to `organizationId` and returns the scope the
 * member-facing reads need, including the organization name (which the route
 * guard does not resolve).
 *
 * Mirrors `requireMemberOrg`: a missing organization is a 400 with
 * `NO_ORGANIZATION`, a non-membership a 403 with `NOT_MEMBER`. Both the
 * membership row and the organization row must exist — a member row pointing
 * at a deleted organization is treated as no membership at all.
 */
export async function requireMemberOrganization(
	userId: string,
	organizationId: string | null | undefined
): Promise<MemberOrganizationScope> {
	const effectiveOrgId = organizationId?.trim();
	if (!effectiveOrgId) {
		throw new HttpError(400, "Organization context required", {
			code: NO_ORGANIZATION_ERROR_CODE,
		});
	}

	const [membershipRows, organizationRows] = await Promise.all([
		db
			.select({ id: member.id, organizationId: member.organizationId })
			.from(member)
			.where(
				and(
					eq(member.userId, userId),
					eq(member.organizationId, effectiveOrgId)
				)
			)
			.limit(1),
		db
			.select({ id: organization.id, name: organization.name })
			.from(organization)
			.where(eq(organization.id, effectiveOrgId))
			.limit(1),
	]);

	const membership = membershipRows[0];
	const organizationRow = organizationRows[0];
	if (!(membership && organizationRow)) {
		throw new HttpError(403, "Forbidden", {
			code: NOT_MEMBER_ERROR_CODE,
		});
	}

	return {
		memberId: membership.id,
		organization: { id: organizationRow.id, name: organizationRow.name },
		organizationId: membership.organizationId,
	};
}
