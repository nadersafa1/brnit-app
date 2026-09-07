import { Button } from "@brnit/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { FormField } from "@brnit/ui/components/form-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { SubmitButton } from "@brnit/ui/components/submit-button";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { INVITABLE_ROLE_OPTIONS } from "@/components/organizations/organization-role-labels";
import { useOrganizationMemberRoleForm } from "@/hooks/use-organization-member-role-form";

interface UpdateMemberRoleDialogProps {
	displayName: string;
	memberId: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	organizationId: string;
	role: string;
}

/**
 * Split in two so the form is re-created — and therefore re-defaulted to the
 * member's current role — every time the dialog opens on a different row. A
 * single long-lived form would keep the previous member's selection.
 */
function UpdateMemberRoleForm({
	displayName,
	memberId,
	onOpenChange,
	organizationId,
	role: currentRole,
}: Readonly<Omit<UpdateMemberRoleDialogProps, "open">>) {
	const { form, isSaving, onSubmit, role, selectRole, serverError } =
		useOrganizationMemberRoleForm({
			currentRole,
			memberId,
			onUpdated: () => onOpenChange(false),
			organizationId,
		});

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			<DialogHeader>
				<DialogTitle>Change role for {displayName}</DialogTitle>
				<DialogDescription>
					The new role takes effect immediately, for this organization only.
				</DialogDescription>
			</DialogHeader>

			{serverError ? <AuthFormError message={serverError} /> : null}

			<FormField
				error={form.formState.errors.role}
				htmlFor="member-role"
				label="Role"
			>
				<Select disabled={isSaving} onValueChange={selectRole} value={role}>
					<SelectTrigger id="member-role">
						<SelectValue placeholder="Select a role" />
					</SelectTrigger>
					<SelectContent>
						{INVITABLE_ROLE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			<div className="flex justify-end gap-2 pt-1">
				<Button
					disabled={isSaving}
					onClick={() => onOpenChange(false)}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<SubmitButton
					idleLabel="Save role"
					isSubmitting={isSaving}
					pendingLabel="Saving…"
				/>
			</div>
		</form>
	);
}

export function UpdateMemberRoleDialog({
	open,
	...formProps
}: Readonly<UpdateMemberRoleDialogProps>) {
	return (
		<Dialog onOpenChange={formProps.onOpenChange} open={open}>
			<DialogContent>
				{open ? <UpdateMemberRoleForm {...formProps} /> : null}
			</DialogContent>
		</Dialog>
	);
}
