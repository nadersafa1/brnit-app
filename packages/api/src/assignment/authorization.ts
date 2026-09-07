import { db } from "@brnit/db";
import { dietPlanAssignment, member } from "@brnit/db/schema";
import { ORGANIZATION_MEMBER_ROLE } from "@brnit/domain";
import { and, eq, inArray } from "drizzle-orm";

import type { Context, SessionUser } from "../context";
import { HttpError } from "../http-error";
import type { NutritionistScope, OrganizationScopeProbe } from "./rules";

/**
 * Authorization re-asserted inside the handlers.
 *
 * The route guards already decided who may reach a controller, but a handler
 * that trusts them is only as safe as the route file it happens to be mounted
 * in. These helpers restate the same rules against the context, so calling a
 * handler from a job, a test, or a re-wired route cannot widen access.
 */

const UNAUTHORIZED = "Unauthorized";
const NUTRITIONIST_FORBIDDEN =
	"Forbidden: nutritionist role and active organization required";
const APP_ADMIN_ROLE = "admin";
const APP_NUTRITIONIST_ROLE = "nutritionist";

/** The authenticated user, or **401**. */
export function requireSessionUser(ctx: Context): SessionUser {
	if (!ctx.user) {
		throw new HttpError(401, UNAUTHORIZED);
	}
	return ctx.user;
}

/**
 * Nutritionist access: app admin, the global `nutritionist` app role, or the org
 * role `nutritionist` with an active organization. Mirrors `requireNutritionist`.
 *
 * App admins come back with `isAppAdmin: true` and possibly no organization:
 * the pre-overhaul detail routes let them work outside any organization, and
 * dropping that would break support workflows.
 */
export function requireNutritionistScope(ctx: Context): NutritionistScope {
	const user = requireSessionUser(ctx);
	const organization = ctx.organization;
	const appAdmin =
		user.role === APP_ADMIN_ROLE || organization?.isAppAdmin === true;

	const allowed =
		appAdmin ||
		user.role === APP_NUTRITIONIST_ROLE ||
		Boolean(organization?.activeOrgId && organization.isNutritionist);
	if (!allowed) {
		throw new HttpError(403, NUTRITIONIST_FORBIDDEN);
	}

	return { isAppAdmin: appAdmin, organizationId: ctx.organizationId };
}

/**
 * Nutritionist access **plus** an organization to work in.
 *
 * The list and create endpoints demand one from everybody, app admins included —
 * an assignment is always created for a member of a specific organization, so
 * there is no sensible unscoped meaning.
 */
export function requireNutritionistOrganizationId(
	ctx: Context,
	message: string
): string {
	const scope = requireNutritionistScope(ctx);
	if (!scope.organizationId) {
		throw new HttpError(403, message);
	}
	return scope.organizationId;
}

/** Every `member.id` in one organization. */
export async function listOrganizationMemberIds(
	organizationId: string
): Promise<string[]> {
	const rows = await db
		.select({ id: member.id })
		.from(member)
		.where(eq(member.organizationId, organizationId));
	return rows.map((row) => row.id);
}

/**
 * Every assignment id whose assignee is a member of `organizationId`.
 *
 * This is the scope a nutritionist may read consumptions through: an assignment
 * naming a bare `user` belongs to no organization and is deliberately excluded.
 */
export async function listAssignmentIdsForOrganization(
	organizationId: string
): Promise<string[]> {
	const memberIds = await listOrganizationMemberIds(organizationId);
	if (memberIds.length === 0) {
		return [];
	}
	const rows = await db
		.select({ id: dietPlanAssignment.id })
		.from(dietPlanAssignment)
		.where(inArray(dietPlanAssignment.memberId, memberIds));
	return rows.map((row) => row.id);
}

/**
 * Is this assignment's assignee a member of `organizationId`?
 *
 * `false` for a user-assigned row (no `member_id`) as well as for a missing one:
 * an assignment that names a bare user belongs to no organization and is
 * therefore invisible to organization-scoped callers.
 */
async function assignmentMemberBelongsToOrg(
	assignmentId: string,
	organizationId: string
): Promise<boolean> {
	const [assignment] = await db
		.select({ memberId: dietPlanAssignment.memberId })
		.from(dietPlanAssignment)
		.where(eq(dietPlanAssignment.id, assignmentId))
		.limit(1);
	if (!assignment?.memberId) {
		return false;
	}

	const [row] = await db
		.select({ id: member.id })
		.from(member)
		.where(
			and(
				eq(member.id, assignment.memberId),
				eq(member.organizationId, organizationId)
			)
		)
		.limit(1);
	return row !== undefined;
}

/**
 * The production probe for `assertAssignmentVisibleToScope`. Kept here because
 * it is the half that touches the database; the rule itself is in `./rules.ts`.
 */
export const databaseOrganizationScope: OrganizationScopeProbe = {
	assignmentBelongsToOrganization: assignmentMemberBelongsToOrg,
};

export interface AssignableMember {
	organizationId: string;
	role: string;
	userId: string;
}

/**
 * The member a plan may be assigned to.
 *
 * Only the org role `member` competes, so only that role may hold a diet plan —
 * a nutritionist or an owner is staff, and assigning them a plan would put them
 * on the leaderboard and in the consumption reports.
 */
export async function requireAssignableMember(
	memberId: string,
	organizationId: string
): Promise<AssignableMember> {
	const [row] = await db
		.select({
			organizationId: member.organizationId,
			role: member.role,
			userId: member.userId,
		})
		.from(member)
		.where(eq(member.id, memberId))
		.limit(1);

	if (!row) {
		throw new HttpError(404, "Member not found");
	}
	if (row.organizationId !== organizationId) {
		throw new HttpError(404, "Member does not belong to this organization");
	}
	if (row.role !== ORGANIZATION_MEMBER_ROLE) {
		throw new HttpError(
			400,
			'Only members with role "member" can be assigned diet plans'
		);
	}
	return row;
}
