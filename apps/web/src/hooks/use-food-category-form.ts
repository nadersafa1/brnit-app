import type { FoodCategoryDto } from "@brnit/api";
import { createFoodCategoryInputSchema } from "@brnit/api/food/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
	useCreateFoodCategoryMutation,
	useUpdateFoodCategoryMutation,
} from "@/hooks/use-food-category-mutations";

/**
 * The **server's own** input schema is the resolver.
 *
 * Create and update share it because the update endpoint shares it too: `name`
 * is required on both, and both replace `description` outright rather than
 * patching it (`packages/api/src/handlers/food.ts`). One schema, one form type,
 * and client-side messages that are literally the ones the server would return.
 */
const foodCategoryFormSchema = createFoodCategoryInputSchema;

export type FoodCategoryFormInput = z.input<typeof foodCategoryFormSchema>;
export type FoodCategoryFormOutput = z.output<typeof foodCategoryFormSchema>;

function defaultValuesFor(
	category: FoodCategoryDto | null
): FoodCategoryFormInput {
	return {
		description: category?.description ?? "",
		name: category?.name ?? "",
	};
}

interface UseFoodCategoryFormOptions {
	/** `null` creates; a DTO edits that category. */
	category: FoodCategoryDto | null;
	onSaved?: () => void;
}

/**
 * Owns schema, form, mutation and submit. The component that renders it is
 * layout only.
 */
export function useFoodCategoryForm({
	category,
	onSaved,
}: UseFoodCategoryFormOptions) {
	const isEdit = category !== null;

	const createMutation = useCreateFoodCategoryMutation();
	const updateMutation = useUpdateFoodCategoryMutation(category?.id ?? "");

	const form = useForm<FoodCategoryFormInput, unknown, FoodCategoryFormOutput>({
		defaultValues: defaultValuesFor(category),
		mode: "onBlur",
		resolver: zodResolver(foodCategoryFormSchema),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			// The server trims and nulls an empty description itself, so the raw
			// field value is what goes on the wire.
			if (isEdit) {
				await updateMutation.mutateAsync(values);
			} else {
				await createMutation.mutateAsync(values);
				form.reset(defaultValuesFor(null));
			}
			onSaved?.();
		} catch {
			// Reported by the mutation's own `onError`; the dialog stays open so
			// the entered values are not thrown away.
		}
	});

	return {
		form,
		isEdit,
		isSaving: createMutation.isPending || updateMutation.isPending,
		onSubmit,
	};
}
