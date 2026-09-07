import { Button } from "@brnit/ui/components/button";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { SubmitButton } from "@brnit/ui/components/submit-button";
import { Textarea } from "@brnit/ui/components/textarea";
import type { FormEventHandler } from "react";
import type { UseFormReturn } from "react-hook-form";

/**
 * Name + description — the metadata half of a meal and of a diet plan.
 *
 * The two entities carry the identical pair (name ≤255, description ≤500), so
 * one layout serves both and a change to the field wiring cannot land on one
 * screen and miss the other.
 *
 * Layout only, per `docs/migration/frontend.md` -> Forms: the schema, the
 * mutation and `onSubmit` live in the caller's `use-*-form` hook, which is also
 * where the create-versus-edit difference is decided.
 */

export interface CatalogDetailsFormValues {
	description?: string;
	name: string;
}

interface CatalogDetailsFormProps {
	descriptionPlaceholder: string;
	form: UseFormReturn<
		CatalogDetailsFormValues,
		unknown,
		CatalogDetailsFormValues
	>;
	/** Keeps the field ids unique when two of these render on one screen. */
	idPrefix: string;
	isSaving: boolean;
	namePlaceholder: string;
	onCancel?: () => void;
	onSubmit: FormEventHandler<HTMLFormElement>;
	submitLabel: string;
}

export function CatalogDetailsForm({
	descriptionPlaceholder,
	form,
	idPrefix,
	isSaving,
	namePlaceholder,
	onCancel,
	onSubmit,
	submitLabel,
}: Readonly<CatalogDetailsFormProps>) {
	const { errors } = form.formState;

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			<FormField error={errors.name} htmlFor={`${idPrefix}-name`} label="Name">
				<Input
					{...form.register("name")}
					disabled={isSaving}
					id={`${idPrefix}-name`}
					placeholder={namePlaceholder}
				/>
			</FormField>

			<FormField
				error={errors.description}
				htmlFor={`${idPrefix}-description`}
				label="Description (optional)"
			>
				<Textarea
					{...form.register("description")}
					disabled={isSaving}
					id={`${idPrefix}-description`}
					placeholder={descriptionPlaceholder}
					rows={4}
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
					idleLabel={submitLabel}
					isSubmitting={isSaving}
					pendingLabel="Saving…"
				/>
			</div>
		</form>
	);
}
