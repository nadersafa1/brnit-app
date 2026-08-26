import type { MealDto } from "@brnit/api";
import { createMealInputSchema } from "@brnit/api/meal/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
	useCreateMealMutation,
	useUpdateMealMutation,
} from "@/hooks/use-meal-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * Name and description only.
 *
 * A meal's **lines** are not part of this form: they are edited on the detail
 * page against the live meal, one PATCH per intent, because a meal is created
 * empty and filled afterwards. Picking the two fields off the server's create
 * schema keeps the lengths (255 / 500) and the messages identical to the API's.
 */
const mealFormSchema = createMealInputSchema.pick({
	description: true,
	name: true,
});

export type MealFormInput = z.input<typeof mealFormSchema>;
export type MealFormOutput = z.output<typeof mealFormSchema>;

function defaultValuesFor(meal: MealDto | null): MealFormInput {
	return { description: meal?.description ?? "", name: meal?.name ?? "" };
}

interface UseMealFormOptions {
	/** `null` creates; a DTO edits that meal. */
	meal: MealDto | null;
	onSaved?: () => void;
	scope: FoodCatalogScope;
}

export function useMealForm({ meal, onSaved, scope }: UseMealFormOptions) {
	const isEdit = meal !== null;

	const createMutation = useCreateMealMutation(scope);
	const updateMutation = useUpdateMealMutation(scope, meal?.id ?? "");

	const form = useForm<MealFormInput, unknown, MealFormOutput>({
		defaultValues: defaultValuesFor(meal),
		mode: "onBlur",
		resolver: zodResolver(mealFormSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		const description = values.description?.trim() ?? "";
		try {
			if (isEdit) {
				// `null` is how the PATCH clears a description; `undefined` would
				// mean "leave it alone", which is not what an emptied field says.
				await updateMutation.mutateAsync({
					description: description.length > 0 ? description : null,
					name: values.name,
				});
			} else {
				await createMutation.mutateAsync({
					description: description.length > 0 ? description : undefined,
					// A meal starts empty; food is added from the detail page.
					mealItems: [],
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
		 * The 409 the API answers when the meal belongs to a plan that has an
		 * assignment. Rendered as a standing banner rather than a toast — it is
		 * the reason the save cannot happen, not a transient hiccup.
		 */
		conflictMessage: readConflictMessage(updateMutation.error),
		form,
		isEdit,
		isSaving: createMutation.isPending || updateMutation.isPending,
		onSubmit,
	};
}
