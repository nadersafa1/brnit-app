import type { InvitableOrganizationRole } from "@brnit/domain";
import { queryOptions } from "@tanstack/react-query";

import {
	organizationMembersQueryKey,
	organizationQueryKey,
	organizationsQueryKey,
} from "@/lib/api/query-keys";
import {
	authClient,
	type Invitation,
	type Member,
	type Organization,
} from "@/lib/auth-client";

/**
 * The organization reads and writes, all of which go through **better-auth's
 * organization plugin** rather than the Express API.
 *
 * That is the one place this app talks to a second backend surface: members,
 * invitations and `setActive` are owned by better-auth (mounted unversioned at
 * `/api/auth/*`), so there is no `/api/v1` endpoint to call. Wrapping every
 * call here keeps the plugin's `{ data, error }` convention from leaking into
 * components — the query functions throw, which is what TanStack Query needs.
 */

/** better-auth answers `{ data, error }` instead of rejecting. */
interface AuthClientResponse<TData> {
	data: TData | null;
	error?: {
		message?: string;
		status?: number;
		statusText?: string;
	} | null;
}

function unwrapAuthResponse<TData>(
	response: AuthClientResponse<TData>,
	fallbackMessage: string
): TData {
	if (response.error || response.data === null) {
		throw new Error(
			response.error?.message ?? response.error?.statusText ?? fallbackMessage
		);
	}
	return response.data;
}

/** An organization plus the two collections its detail screen renders. */
export interface OrganizationDetail extends Organization {
	invitations: Invitation[];
	members: Member[];
}

/**
 * Every organization the signed-in user belongs to.
 *
 * An app admin who is a member of nothing gets an empty list — the create
 * action is gated on the app role, not on this.
 */
export function organizationsQueryOptions() {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: async (): Promise<Organization[]> => {
			const response = await authClient.organization.list();
			return unwrapAuthResponse(response, "Could not load organizations");
		},
		queryKey: organizationsQueryKey(),
	});
}

/**
 * The organization record with its members **and** its pending invitations.
 *
 * Only the invitation surface reads this: `getFullOrganization` is the sole
 * endpoint that returns invitations, and it is fetched only for someone allowed
 * to manage them. Screens that just need the roster use
 * {@link organizationMembersQueryOptions}, which every member may call.
 */
export function organizationQueryOptions(
	organizationId: string,
	enabled = true
) {
	return queryOptions({
		enabled: enabled && organizationId.length > 0,
		meta: { showErrorToast: true },
		queryFn: async (): Promise<OrganizationDetail> => {
			const response = await authClient.organization.getFullOrganization({
				query: { organizationId },
			});
			return unwrapAuthResponse(response, "Could not load the organization");
		},
		queryKey: organizationQueryKey(organizationId),
	});
}

/** The roster on its own — for screens with no invitation surface. */
export function organizationMembersQueryOptions(organizationId: string) {
	return queryOptions({
		enabled: organizationId.length > 0,
		meta: { showErrorToast: true },
		queryFn: async (): Promise<Member[]> => {
			const response = await authClient.organization.listMembers({
				query: { organizationId },
			});
			const page = unwrapAuthResponse(
				response,
				"Could not load the organization members"
			);
			return page.members;
		},
		queryKey: organizationMembersQueryKey(organizationId),
	});
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateOrganizationInput {
	name: string;
	slug: string;
}

export async function createOrganization(
	input: CreateOrganizationInput
): Promise<Organization> {
	const response = await authClient.organization.create({
		name: input.name,
		slug: input.slug,
	});
	return unwrapAuthResponse(response, "Could not create the organization");
}

export interface InviteOrganizationMemberInput {
	email: string;
	organizationId: string;
	role: InvitableOrganizationRole;
}

export async function inviteOrganizationMember(
	input: InviteOrganizationMemberInput
): Promise<void> {
	const response = await authClient.organization.inviteMember({
		email: input.email,
		organizationId: input.organizationId,
		role: input.role,
	});
	unwrapAuthResponse(response, "Could not send the invitation");
}

export async function cancelOrganizationInvitation(
	invitationId: string
): Promise<void> {
	const response = await authClient.organization.cancelInvitation({
		invitationId,
	});
	unwrapAuthResponse(response, "Could not cancel the invitation");
}

export interface UpdateOrganizationMemberRoleInput {
	memberId: string;
	organizationId: string;
	role: InvitableOrganizationRole;
}

export async function updateOrganizationMemberRole(
	input: UpdateOrganizationMemberRoleInput
): Promise<void> {
	const response = await authClient.organization.updateMemberRole({
		memberId: input.memberId,
		organizationId: input.organizationId,
		role: input.role,
	});
	unwrapAuthResponse(response, "Could not update the member role");
}

export interface RemoveOrganizationMemberInput {
	memberId: string;
	organizationId: string;
}

export async function removeOrganizationMember(
	input: RemoveOrganizationMemberInput
): Promise<void> {
	const response = await authClient.organization.removeMember({
		// The endpoint accepts an id *or* an email; the tables always hold the id.
		memberIdOrEmail: input.memberId,
		organizationId: input.organizationId,
	});
	unwrapAuthResponse(response, "Could not remove the member");
}

/**
 * Moves the session's active organization.
 *
 * Every organization-scoped API read (assignments, assessments) resolves its
 * scope from `session.activeOrganizationId`, so opening an organization has to
 * set it before those queries can return the right rows.
 */
export async function setActiveOrganization(
	organizationId: string
): Promise<void> {
	const response = await authClient.organization.setActive({ organizationId });
	unwrapAuthResponse(response, "Could not switch organization");
}

export async function acceptOrganizationInvitation(
	invitationId: string
): Promise<{ organizationId: string }> {
	const response = await authClient.organization.acceptInvitation({
		invitationId,
	});
	const accepted = unwrapAuthResponse(
		response,
		"Could not accept the invitation"
	);
	return { organizationId: accepted.invitation.organizationId };
}
