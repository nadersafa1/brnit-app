import type { DietPlanAssignmentWithMealTimesDto } from "@brnit/api";
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
import { MealTimeOverrideFields } from "@/components/organizations/meal-time-override-fields";
import { useOrganizationAssignmentForm } from "@/hooks/use-organization-assignment-form";

interface AssignmentFormProps {
	/** Present when editing an existing assignment. */
	assignment?: DietPlanAssignmentWithMealTimesDto | null;
	memberId: string;
	onCancel: () => void;
	onSaved: () => void;
	preselectedDietPlanId?: string;
}

/**
 * Layout only. The plan cannot be swapped once assigned — the endpoint takes
 * dates and meal times, not a new plan — so the picker is read-only in edit
 * mode rather than offering a change that would be rejected.
 */
export function AssignmentForm({
	assignment,
	memberId,
	onCancel,
	onSaved,
	preselectedDietPlanId,
}: Readonly<AssignmentFormProps>) {
	const {
		form,
		isEdit,
		isPlanPending,
		isSaving,
		mealTimes,
		onSubmit,
		planMeals,
		plans,
		selectDietPlan,
		serverError,
		setMealTime,
	} = useOrganizationAssignmentForm({
		assignment,
		memberId,
		onSaved,
		preselectedDietPlanId,
	});

	const { errors } = form.formState;
	const dietPlanId = form.watch("dietPlanId");

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			{serverError ? <AuthFormError message={serverError} /> : null}

			<FormField
				error={errors.dietPlanId}
				htmlFor="assignment-diet-plan"
				label="Diet plan"
			>
				<Select
					disabled={isEdit || isSaving}
					onValueChange={selectDietPlan}
					value={dietPlanId}
				>
					<SelectTrigger id="assignment-diet-plan">
						<SelectValue placeholder="Select a diet plan" />
					</SelectTrigger>
					<SelectContent>
						{plans.map((plan) => (
							<SelectItem key={plan.id} value={plan.id}>
								{plan.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			<div className="grid gap-4 sm:grid-cols-2">
				<FormField
					error={errors.startDate}
					htmlFor="assignment-start-date"
					label="Start date"
				>
					<Input
						{...form.register("startDate")}
						disabled={isSaving}
						id="assignment-start-date"
						type="date"
					/>
				</FormField>
				<FormField
					error={errors.endDate}
					htmlFor="assignment-end-date"
					label="End date"
				>
					<Input
						{...form.register("endDate")}
						disabled={isSaving}
						id="assignment-end-date"
						type="date"
					/>
				</FormField>
			</div>

			{dietPlanId.length > 0 ? (
				<fieldset className="space-y-2">
					<legend className="mb-2 font-medium text-sm">
						Meal times (optional)
					</legend>
					{isPlanPending ? (
						<p className="text-muted-foreground text-sm">Loading the plan…</p>
					) : (
						<MealTimeOverrideFields
							disabled={isSaving}
							meals={planMeals}
							onChange={setMealTime}
							valuesByMealId={mealTimes}
						/>
					)}
				</fieldset>
			) : null}

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
					idleLabel={isEdit ? "Save changes" : "Assign plan"}
					isSubmitting={isSaving}
					pendingLabel="Saving…"
				/>
			</div>
		</form>
	);
}
