import { Button } from "@brnit/ui/components/button";
import { Checkbox } from "@brnit/ui/components/checkbox";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import { Label } from "@brnit/ui/components/label";
import { SubmitButton } from "@brnit/ui/components/submit-button";

import { AuthFormError } from "@/components/auth/auth-form-error";
import {
	ASSESSMENT_METRIC_FIELDS,
	METRIC_STEP,
} from "@/components/direct-admin/assessment-metrics";
import type { AssessmentFormBinding } from "@/hooks/use-assessment-form";

interface AssessmentFormProps {
	binding: AssessmentFormBinding;
	/** Only a stored image can be removed, so the checkbox is conditional. */
	hasImage: boolean;
	/** Keeps control ids unique when the add and edit dialogs both exist. */
	idPrefix: string;
	imageLabel: string;
	onCancel: () => void;
	submitLabel: string;
}

/**
 * Layout only — schema, image state, mutation and submit live in
 * `use-assessment-form.ts`. The same component backs the add and edit dialogs,
 * which is what keeps a new metric from appearing in one and not the other.
 *
 * Two error channels, deliberately separate: a failed range or a missing value
 * renders under its own control through `FormField`, while the server's reason
 * for refusing the whole write (a 403 from the wrong organization, most often)
 * gets the banner above the fields — see `docs/migration/frontend.md` -> Forms.
 */
export function AssessmentForm({
	binding,
	hasImage,
	idPrefix,
	imageLabel,
	onCancel,
	submitLabel,
}: Readonly<AssessmentFormProps>) {
	const { clearImage, errors, isSaving, register, serverError } = binding;
	const assessedAtId = `${idPrefix}-assessed-at`;
	const imageId = `${idPrefix}-image`;
	const clearImageId = `${idPrefix}-clear-image`;

	return (
		<form className="space-y-5" noValidate onSubmit={binding.onSubmit}>
			{serverError ? <AuthFormError message={serverError} /> : null}

			<FormField
				error={errors.assessedAt}
				htmlFor={assessedAtId}
				label="Assessed at"
			>
				<Input
					{...register("assessedAt")}
					disabled={isSaving}
					id={assessedAtId}
					type="datetime-local"
				/>
			</FormField>

			<div className="grid gap-4 sm:grid-cols-2">
				{ASSESSMENT_METRIC_FIELDS.map((field) => (
					<FormField
						error={errors[field.name]}
						htmlFor={`${idPrefix}-${field.name}`}
						key={field.name}
						label={field.label}
					>
						{/*
						 * `min` and `max` come from the server's own schema, so the
						 * spinner clamps to exactly the range a 400 would name.
						 */}
						<Input
							{...register(field.name)}
							disabled={isSaving}
							id={`${idPrefix}-${field.name}`}
							inputMode="decimal"
							max={field.max}
							min={field.min}
							step={METRIC_STEP}
							type="number"
						/>
					</FormField>
				))}
			</div>

			<FormField htmlFor={imageId} label={imageLabel}>
				<Input
					accept="image/jpeg,image/png,image/webp,image/gif"
					className="cursor-pointer"
					disabled={isSaving || clearImage}
					id={imageId}
					onChange={(event) =>
						binding.selectFile(event.target.files?.[0] ?? null)
					}
					type="file"
				/>
			</FormField>

			{hasImage ? (
				<div className="flex items-center gap-2">
					<Checkbox
						checked={clearImage}
						disabled={isSaving}
						id={clearImageId}
						onCheckedChange={(checked) =>
							binding.toggleClearImage(checked === true)
						}
					/>
					<Label className="cursor-pointer font-normal" htmlFor={clearImageId}>
						Remove the current image
					</Label>
				</div>
			) : null}

			<div className="flex justify-end gap-2 pt-2">
				<Button
					disabled={isSaving}
					onClick={onCancel}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
				<SubmitButton
					idleLabel={submitLabel}
					isSubmitting={isSaving}
					pendingLabel="Saving…"
				/>
			</div>
		</form>
	);
}
