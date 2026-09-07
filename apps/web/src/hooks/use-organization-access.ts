import type { OrganizationContextDto } from "@brnit/api";
import { ANONYMOUS_ORGANIZATION_CONTEXT } from "@brnit/api/organization/context";
import { isAppAdmin } from "@brnit/domain";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";
import { authClient } from "@/lib/auth-client";
import {
	canAccessNutritionistSection,
	canInviteOrganizationMembers,
	canInviteOrganizationMembersWithAnyRole,
	canManageOrganizationMembers,
} from "@/lib/authorization/dashboard-access";

export interface OrganizationAccess {
	/** May open the invite dialog at all. */
	canInvite: boolean;
	/**
	 * May choose a role other than `member` for an invitation. When false the
	 * dialog still opens but the role is fixed — a `client_admin` may invite
	 * participants, not staff.
	 */
	canInviteWithAnyRole: boolean;
	/** May change a member's role or remove them. */
	canManageMembers: boolean;
	context: OrganizationContextDto;
	isAppAdmin: boolean;
	/** Reaches the nutritionist surfaces: plans, assignments, assessments. */
	isNutritionist: boolean;
	/** The signed-in user, so the roster can refuse to remove the actor. */
	userId: string | null;
}

/**
 * What the organization screens are allowed to show.
 *
 * Every predicate comes from `lib/authorization/dashboard-access.ts`, which
 * defers to `@brnit/domain` — nothing role-shaped is decided here.
 *
 * Inviting needs two flags because the server checks it at two layers: Better
 * Auth's access-control statements decide whether an invitation may be sent at
 * all, and `beforeCreateInvitation` decides whether it may carry a role above
 * plain `member`. A `client_admin` passes the first and fails the second, so it
 * gets the dialog with the role fixed to `member`. Collapsing these into one
 * flag breaks one way or the other: the pre-overhaul UI offered staff roles the
 * server rejected, and gating the whole dialog on the narrow rule would hide
 * participant invites the server would have accepted.
 *
 * This is a **presentation** gate only. Every call is re-checked server-side,
 * so a stale flag can hide an action but can never grant one.
 */
export function useOrganizationAccess(): OrganizationAccess {
	const { data: session } = authClient.useSession();
	const { data: organizationContext } = useQuery(
		organizationContextQueryOptions()
	);

	const appRole = session?.user.role;
	const userId = session?.user.id ?? null;

	return useMemo(() => {
		const context = organizationContext ?? ANONYMOUS_ORGANIZATION_CONTEXT;
		return {
			canInvite: canInviteOrganizationMembers(appRole, context),
			canInviteWithAnyRole: canInviteOrganizationMembersWithAnyRole(
				appRole,
				context
			),
			canManageMembers: canManageOrganizationMembers(appRole, context),
			context,
			isAppAdmin: context.isAppAdmin || isAppAdmin(appRole),
			isNutritionist: canAccessNutritionistSection(appRole, context),
			userId,
		};
	}, [appRole, organizationContext, userId]);
}
