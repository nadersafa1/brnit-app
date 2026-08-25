import { Button } from "@brnit/ui/components/button";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
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
import { useOrganizationInviteForm } from "@/hooks/use-organization-invite-form";

interface InviteMemberFormProps {
	onCancel?: () => void;
	onInvited?: () => void;
	organizationId: string;
}

/** Layout only — the schema, the role list and the mutation live in the hook. */
export function InviteMemberForm({
	onCancel,
	onInvited,
	organizationId,
}: Readonly<InviteMemberFormProps>) {
	const {
		canChooseRole,
		form,
		isSaving,
		onSubmit,
		role,
		selectRole,
		serverError,
	} = useOrganizationInviteForm({ onInvited, organizationId });

	const { errors } = form.formState;

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			{serverError ? <AuthFormError message={serverError} /> : null}

			<FormField error={errors.email} htmlFor="invite-email" label="Email">
				<Input
					{...form.register("email")}
					autoComplete="email"
					disabled={isSaving}
					id="invite-email"
					placeholder="colleague@example.com"
					type="email"
				/>
			</FormField>

			{canChooseRole ? (
				<FormField error={errors.role} htmlFor="invite-role" label="Role">
					<Select disabled={isSaving} onValueChange={selectRole} value={role}>
						<SelectTrigger id="invite-role">
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
			) : (
				// A `client_admin` may invite participants but not staff, so the
				// selector is hidden rather than offering roles the server rejects.
				<p className="text-muted-foreground text-sm">
					This person will be invited as a member.
				</p>
			)}

			<div className="flex justify-end gap-2 pt-1">
				{onCancel ? (
					<Button
						disabled={isSaving}
						onClick={onCancel}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
				) : null}
				<SubmitButton
					idleLabel="Send invitation"
					isSubmitting={isSaving}
					pendingLabel="Sending…"
				/>
			</div>
		</form>
	);
}
