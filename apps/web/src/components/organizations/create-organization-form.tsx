import { Button } from "@brnit/ui/components/button";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { useOrganizationForm } from "@/hooks/use-organization-form";

interface CreateOrganizationFormProps {
	onCancel?: () => void;
	onCreated?: () => void;
}

/** Layout only — schema, slug derivation and the mutation live in the hook. */
export function CreateOrganizationForm({
	onCancel,
	onCreated,
}: Readonly<CreateOrganizationFormProps>) {
	const { form, isSaving, nameField, onNameChange, onSubmit, serverError } =
		useOrganizationForm({ onCreated });

	const { errors } = form.formState;

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			{serverError ? <AuthFormError message={serverError} /> : null}

			<FormField
				error={errors.name}
				htmlFor="create-organization-name"
				label="Name"
			>
				<Input
					{...nameField}
					disabled={isSaving}
					id="create-organization-name"
					onChange={onNameChange}
					placeholder="Acme Health"
				/>
			</FormField>

			<FormField
				error={errors.slug}
				htmlFor="create-organization-slug"
				label="Slug"
			>
				<Input
					{...form.register("slug")}
					disabled={isSaving}
					id="create-organization-slug"
					placeholder="acme-health"
				/>
			</FormField>

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
					idleLabel="Create organization"
					isSubmitting={isSaving}
					pendingLabel="Creating…"
				/>
			</div>
		</form>
	);
}
