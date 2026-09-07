import { db } from "@brnit/db";
import { member, organization } from "@brnit/db/schema";
import { and, eq } from "drizzle-orm";

import {
	ORGANIZATION_ROLES,
	type OrganizationContext,
	type OrganizationRole,
	type OrganizationSummary,
} from "../types/organization-context.js";
import type { RequestAuth } from "../types/request-auth.js";

/** Two rows is enough to tell "exactly one membership" from "several". */
const AUTO_ADOPT_MEMBERSHIP_PROBE_LIMIT = 2;

/** Shape returned to callers without a session. Every flag false, every id null. */
export const UNAUTHENTICATED_ORGANIZATION_CONTEXT: OrganizationContext = {
	activeOrgId: null,
	isAppAdmin: false,
	isAuthenticated: false,
	isClientAdmin: false,
	isCoach: false,
	isDirectAdmin: false,
	isMember: false,
	isNutritionist: false,
	isOwner: false,
	organization: null,
	role: null,
	userId: null,
};

/** App role that bypasses org membership entirely (better-auth admin plugin). */
const APP_ADMIN_ROLE = "admin";

function roleFlags(role: OrganizationRole | null) {
	return {
		isClientAdmin: role === "client_admin",
		isCoach: role === "coach",
		isDirectAdmin: role === "direct_admin",
		isMember: role === "member",
		isNutritionist: role === "nutritionist",
		isOwner: role === "owner",
	};
}

/**
 * Narrows the free-text `member.role` column to a known org role.
 *
 * An unrecognized value resolves to `null` (all flags false) rather than being
 * echoed back, so a bad row can never grant access it does not describe.
 */
function toOrganizationRole(value: string): OrganizationRole | null {
	return (ORGANIZATION_ROLES as readonly string[]).includes(value)
		? (value as OrganizationRole)
		: null;
}

/** Authenticated but org-less: the terminal state of every failed resolution branch. */
function noOrganizationContext(userId: string): OrganizationContext {
	return {
		activeOrgId: null,
		isAppAdmin: false,
		isAuthenticated: true,
		organization: null,
		role: null,
		userId,
		...roleFlags(null),
	};
}

function membershipContext(
	userId: string,
	activeOrgId: string,
	memberRole: string,
	org: OrganizationSummary
): OrganizationContext {
	const role = toOrganizationRole(memberRole);
	return {
		activeOrgId,
		isAppAdmin: false,
		isAuthenticated: true,
		organization: org,
		role,
		userId,
		...roleFlags(role),
	};
}

function findMembership(userId: string, organizationId: string) {
	return db
		.select({ id: member.id, role: member.role })
		.from(member)
		.where(
			and(eq(member.userId, userId), eq(member.organizationId, organizationId))
		)
		.limit(1);
}

function findOrganization(organizationId: string) {
	return db
		.select({
			createdAt: organization.createdAt,
			id: organization.id,
			logo: organization.logo,
			name: organization.name,
			slug: organization.slug,
		})
		.from(organization)
		.where(eq(organization.id, organizationId))
		.limit(1);
}

async function contextForActiveOrg(
	userId: string,
	activeOrgId: string
): Promise<OrganizationContext> {
	const [membershipRows, orgRows] = await Promise.all([
		findMembership(userId, activeOrgId),
		findOrganization(activeOrgId),
	]);

	const membership = membershipRows[0];
	const org = orgRows[0];
	if (!(membership && org)) {
		return noOrganizationContext(userId);
	}
	return membershipContext(userId, activeOrgId, membership.role, org);
}

async function contextForSoleMembership(
	userId: string
): Promise<OrganizationContext> {
	const memberships = await db
		.select({ organizationId: member.organizationId, role: member.role })
		.from(member)
		.where(eq(member.userId, userId))
		.limit(AUTO_ADOPT_MEMBERSHIP_PROBE_LIMIT);

	const sole = memberships.length === 1 ? memberships[0] : undefined;
	if (!sole) {
		return noOrganizationContext(userId);
	}

	const orgRows = await findOrganization(sole.organizationId);
	const org = orgRows[0];
	if (!org) {
		return noOrganizationContext(userId);
	}
	return membershipContext(userId, sole.organizationId, sole.role, org);
}

/**
 * Resolves the caller's organization scope. Backs
 * `GET /api/v1/users/me/organization-context` and every org-aware guard.
 *
 * Precedence, preserved from the pre-overhaul `getOrganizationContext`:
 * 1. no session → {@link UNAUTHENTICATED_ORGANIZATION_CONTEXT};
 * 2. `user.role === "admin"` → `isAppAdmin`, `role: null`, keeps `activeOrgId`
 *    (app admins have no member row, so they never carry an org role);
 * 3. `session.activeOrganizationId` set → membership **and** organization must
 *    both exist, otherwise the org-less context;
 * 4. exactly one membership → auto-adopt it, so a single-org user never has to
 *    call `setActive` first;
 * 5. otherwise → the org-less context.
 */
export async function resolveOrganizationContext(
	auth: Pick<RequestAuth, "session" | "user"> | null | undefined
): Promise<OrganizationContext> {
	if (!auth?.user) {
		return UNAUTHENTICATED_ORGANIZATION_CONTEXT;
	}

	const userId = auth.user.id;
	const activeOrgId = auth.session?.activeOrganizationId ?? null;

	if (auth.user.role === APP_ADMIN_ROLE) {
		return {
			activeOrgId,
			isAppAdmin: true,
			isAuthenticated: true,
			organization: null,
			role: null,
			userId,
			...roleFlags(null),
		};
	}

	if (activeOrgId) {
		return await contextForActiveOrg(userId, activeOrgId);
	}

	return await contextForSoleMembership(userId);
}
