import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
	invalidateOrganizationContextQuery,
	invalidateOrganizationQueries,
} from "@/lib/api/queries/organization-invalidation";
import {
	type CreateOrganizationInput,
	cancelOrganizationInvitation,
	createOrganization,
	type InviteOrganizationMemberInput,
	inviteOrganizationMember,
	removeOrganizationMember,
	setActiveOrganization,
	type UpdateOrganizationMemberRoleInput,
	updateOrganizationMemberRole,
} from "@/lib/api/queries/organizations";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * Every write against better-auth's organization plugin.
 *
 * Same shape as the rest of the app: `mutationFn` → `onError` toasts the
 * server's reason → `onSuccess` toasts, then **awaits** a named invalidation
 * helper, so `isPending` stays true until the lists have actually refreshed and
 * no dialog closes onto stale rows.
 */

/**
 * Creating an organization also makes it the active one — the creator becomes
 * its `owner`, and every organization-scoped screen reads the active id.
 */
export function useCreateOrganizationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateOrganizationInput) => {
			const organization = await createOrganization(input);
			await setActiveOrganization(organization.id);
			return organization;
		},
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not create the organization")
			);
		},
		onSuccess: async (organization) => {
			toast.success("Organization created");
			await invalidateOrganizationQueries(queryClient, organization.id);
		},
	});
}

export function useInviteOrganizationMemberMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: InviteOrganizationMemberInput) =>
			inviteOrganizationMember(input),
		onError: (error) => {
			// `beforeCreateInvitation` rejects a role the inviter may not grant, and
			// its message names the rule — surface it rather than a generic line.
			toast.error(
				getUserFacingErrorMessage(error, "Could not send the invitation")
			);
		},
		onSuccess: async (_result, input) => {
			toast.success("Invitation sent");
			await invalidateOrganizationQueries(queryClient, input.organizationId);
		},
	});
}

export function useCancelOrganizationInvitationMutation(
	organizationId: string
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (invitationId: string) =>
			cancelOrganizationInvitation(invitationId),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not cancel the invitation")
			);
		},
		onSuccess: async () => {
			toast.success("Invitation cancelled");
			await invalidateOrganizationQueries(queryClient, organizationId);
		},
	});
}

export function useUpdateOrganizationMemberRoleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateOrganizationMemberRoleInput) =>
			updateOrganizationMemberRole(input),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the role")
			);
		},
		onSuccess: async (_result, input) => {
			toast.success("Role updated");
			await invalidateOrganizationQueries(queryClient, input.organizationId);
		},
	});
}

export function useRemoveOrganizationMemberMutation(organizationId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (memberId: string) =>
			removeOrganizationMember({ memberId, organizationId }),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not remove the member")
			);
		},
		onSuccess: async () => {
			toast.success("Member removed");
			await invalidateOrganizationQueries(queryClient, organizationId);
		},
	});
}

/** Switching scope without a toast — it is a side effect of opening a screen. */
export function useSetActiveOrganizationMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (organizationId: string) =>
			setActiveOrganization(organizationId),
		onSuccess: async () => {
			await invalidateOrganizationContextQuery(queryClient);
		},
	});
}
