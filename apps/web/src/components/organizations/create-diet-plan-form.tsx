import { Button } from "@brnit/ui/components/button";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";

import { AuthFormError } from "@/components/auth/auth-form-error";
import { useOrganizationDietPlanForm } from "@/hooks/use-organization-diet-plan-form";

interface CreateDietPlanFormProps {
	onCancel: () => void;
	/** Receives the new plan's id so the caller can open the assign dialog on it. */
	onCreated: (dietPlanId: string) => void;
}

/** Layout only — the resolver is the server's own `createDietPlanInputSchema`. */
export function CreateDietPlanForm({
	onCancel,
	onCreated,
}: Readonly<CreateDietPlanFormProps>) {
	const { form, isSaving, onSubmit, serverError } = useOrganizationDietPlanForm(
		{ onCreated }
	);

	const { errors } = form.formState;

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			{serverError ? <AuthFormError message={serverError} /> : null}

			<FormField error={errors.name} htmlFor="diet-plan-name" label="Name">
				<Input
					{...form.register("name")}
					disabled={isSaving}
					id="diet-plan-name"
					placeholder="7-day reset"
				/>
			</FormField>

			<FormField
				error={errors.description}
				htmlFor="diet-plan-description"
				label="Description (optional)"
			>
				<Input
					{...form.register("description")}
					disabled={isSaving}
					id="diet-plan-description"
					placeholder="What this plan is for"
				/>
			</FormField>

			<div className="flex justify-end gap-2 pt-1">
				<Button
					disabled={isSaving}
					onClick={onCancel}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<SubmitButton
					idleLabel="Create and assign"
					isSubmitting={isSaving}
					pendingLabel="Creating…"
				/>
			</div>
		</form>
	);
}
