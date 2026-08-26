import {
	INVITABLE_ORGANIZATION_ROLES,
	ORGANIZATION_MEMBER_ROLE,
} from "@brnit/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { useOrganizationAccess } from "@/hooks/use-organization-access";
import { useInviteOrganizationMemberMutation } from "@/hooks/use-organization-mutations";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const inviteMemberSchema = z.object({
	email: z.email("Enter a valid email address"),
	role: z.enum(INVITABLE_ORGANIZATION_ROLES),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

interface UseOrganizationInviteFormOptions {
	onInvited?: () => void;
	organizationId: string;
}

/**
 * The invite form.
 *
 * Returns `canChooseRole`, because the dialog is reachable by two different
 * kinds of actor. Better Auth's access-control statements decide who may send
 * an invitation at all — which includes `client_admin` — while
 * `beforeCreateInvitation` additionally requires `owner` or `direct_admin` for
 * any role above plain `member`. So a `client_admin` gets the form with the
 * role fixed to `member`, and the selector is hidden rather than offering
 * choices the server would reject.
 *
 * This is a presentation gate. The role is re-checked server-side on every
 * invitation, so a stale flag can hide a choice but can never grant one.
 */
export function useOrganizationInviteForm({
	onInvited,
	organizationId,
}: UseOrganizationInviteFormOptions) {
	const { canInviteWithAnyRole } = useOrganizationAccess();
	const inviteMutation = useInviteOrganizationMemberMutation();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<InviteMemberFormValues>({
		defaultValues: { email: "", role: ORGANIZATION_MEMBER_ROLE },
		mode: "onBlur",
		resolver: zodResolver(inviteMemberSchema),
	});

	const role = form.watch("role");

	const selectRole = (next: string | null) => {
		if (next === null || !canInviteWithAnyRole) {
			return;
		}
		form.setValue("role", next as InviteMemberFormValues["role"], {
			shouldValidate: true,
		});
	};

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		try {
			await inviteMutation.mutateAsync({
				email: values.email,
				organizationId,
				// Pinned rather than trusted: the selector is hidden when the actor
				// may not choose, so anything other than `member` here would have
				// come from a tampered form and the server would reject it anyway.
				role: canInviteWithAnyRole ? values.role : ORGANIZATION_MEMBER_ROLE,
			});
			form.reset({ email: "", role: ORGANIZATION_MEMBER_ROLE });
			onInvited?.();
		} catch (error) {
			reportServerError(
				getUserFacingErrorMessage(error, "Could not send the invitation")
			);
		}
	});

	return {
		canChooseRole: canInviteWithAnyRole,
		form,
		isSaving: inviteMutation.isPending,
		onSubmit,
		role,
		selectRole,
		serverError,
	};
}
