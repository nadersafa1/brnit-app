import { ORGANIZATION_MEMBER_ROLE } from "@brnit/domain";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

import { organizationMembersQueryKey } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth-client";

/**
 * The people a direct admin can record assessments for.
 *
 * There is no REST endpoint for organization members — memberships live behind
 * better-auth's organization plugin, so the read goes through `authClient` and
 * is wrapped in `queryOptions` like any other query so route loaders can
 * prefetch it and writes elsewhere can invalidate it by key.
 *
 * The cache holds **every** member of the organization, unfiltered, because
 * `organizationMembersQueryKey` has no role segment and other screens read the
 * same entry. Narrowing to a role is a `select`, never a narrower cache value.
 */

interface OrganizationMemberUser {
	email: string;
	image?: string | null;
	name: string;
}

export interface OrganizationMemberRow {
	id: string;
	role: string;
	user: OrganizationMemberUser;
}

const MEMBERS_UNAVAILABLE_MESSAGE =
	"Could not load this organization's members";

export function organizationMembersQueryOptions(organizationId: string) {
	return queryOptions({
		enabled: organizationId.length > 0,
		meta: { showErrorToast: true },
		queryFn: async (): Promise<OrganizationMemberRow[]> => {
			// better-auth answers `{ data, error }` rather than throwing, so the
			// failure has to be re-thrown for TanStack Query to see it at all.
			const { data, error } = await authClient.organization.listMembers({
				query: { organizationId },
			});
			if (error) {
				throw new Error(error.message ?? MEMBERS_UNAVAILABLE_MESSAGE);
			}
			return data?.members ?? [];
		},
		queryKey: organizationMembersQueryKey(organizationId),
	});
}

/**
 * Org role **exactly** `member`.
 *
 * Assessments belong to the competing participant, not to the staff running the
 * organization; an owner or a nutritionist has a `member` row too, and listing
 * them here would offer to record body composition for the coach.
 */
export function useAssessableMembers(organizationId: string) {
	const select = useCallback(
		(rows: OrganizationMemberRow[]) =>
			rows.filter((row) => row.role === ORGANIZATION_MEMBER_ROLE),
		[]
	);

	return useQuery({
		...organizationMembersQueryOptions(organizationId),
		select,
	});
}

/** The one assessable member behind a `$memberId` param, or `null`. */
export function useAssessableMember(organizationId: string, memberId: string) {
	const select = useCallback(
		(rows: OrganizationMemberRow[]) =>
			rows.find(
				(row) => row.id === memberId && row.role === ORGANIZATION_MEMBER_ROLE
			) ?? null,
		[memberId]
	);

	return useQuery({
		...organizationMembersQueryOptions(organizationId),
		select,
	});
}

/** `direct_admin` -> "Direct admin". The org role column reads as a label. */
export function formatOrganizationRole(role: string): string {
	const words = role.split("_").join(" ");
	return words.charAt(0).toUpperCase() + words.slice(1);
}
