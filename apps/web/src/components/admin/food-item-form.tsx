import type { FoodCategoryDto, FoodItemDto } from "@brnit/api";
import { FOOD_UNITS } from "@brnit/domain";
import { Button } from "@brnit/ui/components/button";
import { Checkbox } from "@brnit/ui/components/checkbox";
import { FormField } from "@brnit/ui/components/form-field";
import { FormFieldError } from "@brnit/ui/components/form-field-error";
import { Input } from "@brnit/ui/components/input";
import { Label } from "@brnit/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { SubmitButton } from "@brnit/ui/components/submit-button";

import { useFoodItemForm } from "@/hooks/use-food-item-form";
import {
	formatFoodUnitDescription,
	gramsPerUnitPlaceholder,
} from "@/lib/food-unit-display";

const MACRO_FIELDS = [
	{ label: "Calories (kcal)", name: "calories" },
	{ label: "Protein (g)", name: "protein" },
	{ label: "Carbs (g)", name: "carbs" },
	{ label: "Fat (g)", name: "fat" },
] as const;

const MACRO_STEP = "0.1";
const GRAMS_PER_UNIT_MIN = 0.1;

interface FoodItemFormProps {
	categories: readonly FoodCategoryDto[];
	/** `null` creates a new item; a DTO edits that one. */
	item: FoodItemDto | null;
	onCancel?: () => void;
	onSaved?: () => void;
}

/**
 * Layout only — schema, mutation and image state live in `useFoodItemForm`.
 * The same component backs the create dialog and the detail page's edit sheet,
 * which is what keeps the two in step.
 */
export function FoodItemForm({
	categories,
	item,
	onCancel,
	onSaved,
}: Readonly<FoodItemFormProps>) {
	const {
		clearImage,
		form,
		isEdit,
		isSaving,
		onSubmit,
		selectedCategoryIds,
		selectFile,
		toggleCategory,
		toggleClearImage,
		unit,
	} = useFoodItemForm({ item, onSaved });

	const { errors } = form.formState;
	const requiresGramsPerUnit = unit !== "100g";

	return (
		<form className="space-y-5" noValidate onSubmit={onSubmit}>
			<FormField error={errors.name} htmlFor="food-item-name" label="Name">
				<Input
					{...form.register("name")}
					disabled={isSaving}
					id="food-item-name"
					placeholder="e.g. Apple"
				/>
			</FormField>

			<fieldset className="flex flex-col gap-2">
				<legend className="mb-2 font-medium text-sm">Categories</legend>
				<div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl bg-card-alt p-3 sm:grid-cols-2">
					{categories.map((category) => {
						const checkboxId = `food-item-category-${category.id}`;
						return (
							<div className="flex items-center gap-2" key={category.id}>
								<Checkbox
									checked={selectedCategoryIds.includes(category.id)}
									disabled={isSaving}
									id={checkboxId}
									onCheckedChange={(checked) =>
										toggleCategory(category.id, checked === true)
									}
								/>
								<Label
									className="cursor-pointer font-normal"
									htmlFor={checkboxId}
								>
									{category.name}
								</Label>
							</div>
						);
					})}
				</div>
				<FormFieldError error={errors.categoryIds} />
			</fieldset>

			<div className="grid gap-4 sm:grid-cols-2">
				{MACRO_FIELDS.map((field) => (
					<FormField
						error={errors[field.name]}
						htmlFor={`food-item-${field.name}`}
						key={field.name}
						label={field.label}
					>
						{/*
						 * Registered without `valueAsNumber`: the schema is the server's
						 * own `z.coerce.number()`, so an empty field coerces to 0 — the
						 * same default the API applies — instead of becoming NaN.
						 */}
						<Input
							{...form.register(field.name)}
							disabled={isSaving}
							id={`food-item-${field.name}`}
							inputMode="decimal"
							min={0}
							step={MACRO_STEP}
							type="number"
						/>
					</FormField>
				))}
			</div>

			<FormField error={errors.unit} htmlFor="food-item-unit" label="Unit">
				<Select
					disabled={isSaving}
					onValueChange={(value: string | null) => {
						if (value === null) {
							return;
						}
						form.setValue("unit", value as (typeof FOOD_UNITS)[number], {
							shouldValidate: true,
						});
						if (value === "100g") {
							form.setValue("gramsPerUnit", null, { shouldValidate: true });
						}
					}}
					value={unit}
				>
					<SelectTrigger id="food-item-unit">
						<SelectValue placeholder="Select a unit" />
					</SelectTrigger>
					<SelectContent>
						{FOOD_UNITS.map((foodUnit) => (
							<SelectItem key={foodUnit} value={foodUnit}>
								{formatFoodUnitDescription(foodUnit)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			{requiresGramsPerUnit ? (
				<FormField
					error={errors.gramsPerUnit}
					htmlFor="food-item-grams-per-unit"
					label="Grams per unit"
				>
					<Input
						{...form.register("gramsPerUnit")}
						disabled={isSaving}
						id="food-item-grams-per-unit"
						inputMode="decimal"
						min={GRAMS_PER_UNIT_MIN}
						placeholder={gramsPerUnitPlaceholder(unit)}
						step={MACRO_STEP}
						type="number"
					/>
				</FormField>
			) : null}

			<FormField
				htmlFor="food-item-image"
				label={isEdit ? "Replace image" : "Image"}
			>
				<Input
					accept="image/jpeg,image/png,image/webp,image/gif"
					className="cursor-pointer"
					disabled={isSaving || clearImage}
					id="food-item-image"
					onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
					type="file"
				/>
			</FormField>

			{isEdit && item?.imageUrl ? (
				<div className="flex items-center gap-2">
					<Checkbox
						checked={clearImage}
						disabled={isSaving}
						id="food-item-clear-image"
						onCheckedChange={(checked) => toggleClearImage(checked === true)}
					/>
					<Label
						className="cursor-pointer font-normal"
						htmlFor="food-item-clear-image"
					>
						Remove the current image
					</Label>
				</div>
			) : null}

			<div className="flex justify-end gap-2 pt-2">
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
					idleLabel={isEdit ? "Save changes" : "Create food item"}
					isSubmitting={isSaving}
					pendingLabel="Saving…"
				/>
			</div>
		</form>
	);
}
