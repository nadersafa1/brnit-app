import type { FoodItemDto } from "@brnit/api";
import { createFoodItemInputSchema } from "@brnit/api/food/schemas";
import { DEFAULT_FOOD_UNIT, type FoodUnit } from "@brnit/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import {
	type FoodItemWritePayload,
	useCreateFoodItemMutation,
	useUpdateFoodItemMutation,
} from "@/hooks/use-food-item-mutations";
import type { FoodItemWriteFields } from "@/lib/api/queries/food-items";

/**
 * The **server's own** input schema is the resolver.
 *
 * Create and update share it deliberately. The update endpoint takes every
 * field as optional, but the form always submits the complete set (it renders
 * every field), so validating both against the stricter create schema means one
 * schema, one form type, and client-side messages that are literally the ones
 * the server would return.
 *
 * The image is not in the schema — multer parses it out of the multipart stream
 * separately — so `file` and `clearImage` are local state, not form fields.
 */
const foodItemFormSchema = createFoodItemInputSchema;

export type FoodItemFormInput = z.input<typeof foodItemFormSchema>;
export type FoodItemFormOutput = z.output<typeof foodItemFormSchema>;

const ZERO_MACRO = 0;

function defaultValuesFor(item: FoodItemDto | null): FoodItemFormInput {
	if (!item) {
		return {
			calories: ZERO_MACRO,
			carbs: ZERO_MACRO,
			categoryIds: [],
			fat: ZERO_MACRO,
			gramsPerUnit: null,
			name: "",
			protein: ZERO_MACRO,
			unit: DEFAULT_FOOD_UNIT,
		};
	}
	return {
		calories: item.calories,
		carbs: item.carbs,
		categoryIds: item.categories.map((category) => category.id),
		fat: item.fat,
		gramsPerUnit: item.gramsPerUnit,
		name: item.name,
		protein: item.protein,
		unit: item.unit,
	};
}

function toWriteFields(values: FoodItemFormOutput): FoodItemWriteFields {
	return {
		calories: values.calories,
		carbs: values.carbs,
		categoryIds: values.categoryIds,
		fat: values.fat,
		// `100g` measures grams directly, so a gram equivalence would be
		// meaningless — the server rejects the pair.
		gramsPerUnit:
			values.unit === DEFAULT_FOOD_UNIT ? null : (values.gramsPerUnit ?? null),
		name: values.name,
		protein: values.protein,
		unit: values.unit,
	};
}

interface UseFoodItemFormOptions {
	/** `null` creates; a DTO edits that item. */
	item: FoodItemDto | null;
	onSaved?: () => void;
}

/**
 * Owns schema, form, image state, mutation and submit. The component that
 * renders it is layout only.
 */
export function useFoodItemForm({ item, onSaved }: UseFoodItemFormOptions) {
	const isEdit = item !== null;
	const [file, setFile] = useState<File | null>(null);
	const [clearImage, setClearImage] = useState(false);

	const createMutation = useCreateFoodItemMutation();
	const updateMutation = useUpdateFoodItemMutation(item?.id ?? "");

	const form = useForm<FoodItemFormInput, unknown, FoodItemFormOutput>({
		defaultValues: defaultValuesFor(item),
		mode: "onBlur",
		resolver: zodResolver(foodItemFormSchema),
	});

	const unit = (form.watch("unit") ?? DEFAULT_FOOD_UNIT) as FoodUnit;
	const selectedCategoryIds = form.watch("categoryIds") ?? [];

	const toggleCategory = (categoryId: string, checked: boolean) => {
		const current = form.getValues("categoryIds") ?? [];
		const next = checked
			? [...current, categoryId]
			: current.filter((id) => id !== categoryId);
		form.setValue("categoryIds", next, { shouldValidate: true });
	};

	/** Picking a file and clearing the image are mutually exclusive intents. */
	const selectFile = (nextFile: File | null) => {
		setFile(nextFile);
		if (nextFile) {
			setClearImage(false);
		}
	};

	const toggleClearImage = (next: boolean) => {
		setClearImage(next);
		if (next) {
			setFile(null);
		}
	};

	const onSubmit = form.handleSubmit(async (values) => {
		const payload: FoodItemWritePayload = {
			fields: toWriteFields(values),
			image: { clearImage, file },
		};
		if (isEdit) {
			await updateMutation.mutateAsync(payload);
		} else {
			await createMutation.mutateAsync(payload);
			form.reset(defaultValuesFor(null));
		}
		setFile(null);
		setClearImage(false);
		onSaved?.();
	});

	return {
		clearImage,
		form,
		isEdit,
		isSaving: createMutation.isPending || updateMutation.isPending,
		onSubmit,
		selectedCategoryIds,
		selectFile,
		toggleCategory,
		toggleClearImage,
		unit,
	};
}
