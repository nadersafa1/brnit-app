import {
	INVITABLE_ORGANIZATION_ROLES,
	type InvitableOrganizationRole,
	isOrganizationRole,
	type OrganizationRole,
} from "@brnit/domain";

/**
 * Display names for the two role vocabularies these screens show.
 *
 * The values come from `@brnit/domain`, so a role added there fails to compile
 * here until it is given a label — which is the point: an unlabelled role would
 * otherwise appear in a picker as a raw `direct_admin`.
 */
const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
	client_admin: "Client admin",
	coach: "Coach",
	direct_admin: "Direct admin",
	member: "Member",
	nutritionist: "Nutritionist",
	owner: "Owner",
};

/** Falls back to the stored string: `member.role` is plain text with no constraint. */
export function formatOrganizationRole(role: string): string {
	return isOrganizationRole(role) ? ORGANIZATION_ROLE_LABELS[role] : role;
}

export interface OrganizationRoleOption {
	label: string;
	value: InvitableOrganizationRole;
}

/**
 * The roles a picker may offer. `owner` is absent by design — it is granted at
 * creation and is never invited or assigned.
 */
export const INVITABLE_ROLE_OPTIONS: readonly OrganizationRoleOption[] =
	INVITABLE_ORGANIZATION_ROLES.map((role) => ({
		label: ORGANIZATION_ROLE_LABELS[role],
		value: role,
	}));

/** `"pending"` -> `"Pending"`. Invitation statuses arrive lowercased. */
export function formatInvitationStatus(status: string): string {
	if (status.length === 0) {
		return "Pending";
	}
	return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
