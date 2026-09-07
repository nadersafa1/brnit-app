import type { DietPlanDto } from "@brnit/api";
import { createDietPlanInputSchema } from "@brnit/api/diet-plan/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
	useCreateDietPlanMutation,
	useUpdateDietPlanMutation,
} from "@/hooks/use-diet-plan-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * Name and description only — a plan's **slots** are edited on the detail page,
 * where each change is one PATCH against the live plan.
 */
const dietPlanFormSchema = createDietPlanInputSchema.pick({
	description: true,
	name: true,
});

export type DietPlanFormInput = z.input<typeof dietPlanFormSchema>;
export type DietPlanFormOutput = z.output<typeof dietPlanFormSchema>;

function defaultValuesFor(plan: DietPlanDto | null): DietPlanFormInput {
	return { description: plan?.description ?? "", name: plan?.name ?? "" };
}

interface UseDietPlanFormOptions {
	onSaved?: () => void;
	/** `null` creates; a DTO edits that plan. */
	plan: DietPlanDto | null;
	scope: FoodCatalogScope;
}

export function useDietPlanForm({
	onSaved,
	plan,
	scope,
}: UseDietPlanFormOptions) {
	const isEdit = plan !== null;

	const createMutation = useCreateDietPlanMutation(scope);
	const updateMutation = useUpdateDietPlanMutation(scope, plan?.id ?? "");

	const form = useForm<DietPlanFormInput, unknown, DietPlanFormOutput>({
		defaultValues: defaultValuesFor(plan),
		mode: "onBlur",
		resolver: zodResolver(dietPlanFormSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		const description = values.description?.trim() ?? "";
		try {
			if (isEdit) {
				await updateMutation.mutateAsync({
					description: description.length > 0 ? description : null,
					name: values.name,
				});
			} else {
				await createMutation.mutateAsync({
					description: description.length > 0 ? description : undefined,
					// A plan starts with no slots; meals are added on the detail page.
					dietPlanMeals: [],
					name: values.name,
				});
				form.reset(defaultValuesFor(null));
			}
			onSaved?.();
		} catch {
			// Reported by `conflictMessage` or the mutation's toast; the dialog
			// stays open so the entered values are not thrown away.
		}
	});

	return {
		/**
		 * The 409 the API answers once the plan has any assignment. An assigned
		 * plan is immutable, so this is a standing banner, not a toast.
		 */
		conflictMessage: readConflictMessage(updateMutation.error),
		form,
		isEdit,
		isSaving: createMutation.isPending || updateMutation.isPending,
		onSubmit,
	};
}
