import { INVITABLE_ORGANIZATION_ROLES } from "@brnit/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuthFormServerError } from "@/hooks/use-auth-form-server-error";
import { useUpdateOrganizationMemberRoleMutation } from "@/hooks/use-organization-mutations";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const memberRoleSchema = z.object({
	role: z.enum(INVITABLE_ORGANIZATION_ROLES),
});

export type MemberRoleFormValues = z.infer<typeof memberRoleSchema>;

interface UseOrganizationMemberRoleFormOptions {
	/** The role the member holds now; `owner` has no invitable equivalent. */
	currentRole: string;
	memberId: string;
	onUpdated?: () => void;
	organizationId: string;
}

function toInvitableRole(role: string): MemberRoleFormValues["role"] {
	const match = INVITABLE_ORGANIZATION_ROLES.find((value) => value === role);
	return match ?? "member";
}

/**
 * The change-role form.
 *
 * `owner` is not offered: it is granted once, at creation, and better-auth has
 * a separate transfer flow for it — so an owner opened here defaults to
 * `member`, exactly as the pre-overhaul dialog did.
 */
export function useOrganizationMemberRoleForm({
	currentRole,
	memberId,
	onUpdated,
	organizationId,
}: UseOrganizationMemberRoleFormOptions) {
	const updateMutation = useUpdateOrganizationMemberRoleMutation();
	const { clearServerError, reportServerError, serverError } =
		useAuthFormServerError();

	const form = useForm<MemberRoleFormValues>({
		defaultValues: { role: toInvitableRole(currentRole) },
		mode: "onBlur",
		resolver: zodResolver(memberRoleSchema),
	});

	const role = form.watch("role");

	const selectRole = (next: string | null) => {
		if (next === null) {
			return;
		}
		form.setValue("role", next as MemberRoleFormValues["role"], {
			shouldValidate: true,
		});
	};

	const onSubmit = form.handleSubmit(async (values) => {
		clearServerError();
		try {
			await updateMutation.mutateAsync({
				memberId,
				organizationId,
				role: values.role,
			});
			onUpdated?.();
		} catch (error) {
			reportServerError(
				getUserFacingErrorMessage(error, "Could not update the role")
			);
		}
	});

	return {
		form,
		isSaving: updateMutation.isPending,
		onSubmit,
		role,
		selectRole,
		serverError,
	};
}
