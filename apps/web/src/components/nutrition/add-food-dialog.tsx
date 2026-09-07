import type { FoodItemDto } from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import {
	type FoodUnit,
	mealQuantityMin,
	mealQuantityStep,
} from "@brnit/domain";
import { Button } from "@brnit/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { FormField } from "@brnit/ui/components/form-field";
import { Input } from "@brnit/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { foodCategoryPickerQueryOptions } from "@/lib/api/queries/food-categories";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * Adds one food line to a meal.
 *
 * Scope-parameterised rather than forked: the picker reads the same catalog
 * through whichever tree the caller is in, so the admin and nutritionist meal
 * editors share this dialog exactly as the pre-overhaul screens did through
 * their `source` prop.
 */

const SEARCH_DEBOUNCE_MS = 300;
const ALL_CATEGORIES = "all";
const FALLBACK_QUANTITY_STEP = 1;
const FALLBACK_QUANTITY_MIN = 0.1;

const QUANTITY_PLACEHOLDER: Record<FoodUnit, string> = {
	"100g": "e.g. 150",
	piece: "e.g. 2",
	liters: "e.g. 1",
	cup: "e.g. 1",
	tbsp: "e.g. 1",
};

/** What the quantity is counted in, appended to the field's label. */
const QUANTITY_UNIT_LABEL: Record<FoodUnit, string> = {
	"100g": "g",
	piece: "pieces",
	liters: "L",
	cup: "cups",
	tbsp: "tbsp",
};

function quantityLabel(unit: FoodUnit | undefined): string {
	return unit ? `Quantity (${QUANTITY_UNIT_LABEL[unit]})` : "Quantity";
}

interface FoodItemPickerListProps {
	isPending: boolean;
	items: readonly FoodItemDto[];
	onSelect: (item: FoodItemDto) => void;
	selectedId: string | undefined;
}

function FoodItemPickerList({
	isPending,
	items,
	onSelect,
	selectedId,
}: Readonly<FoodItemPickerListProps>) {
	if (isPending) {
		return <p className="p-4 text-muted-foreground text-sm">Loading…</p>;
	}
	if (items.length === 0) {
		return (
			<p className="p-4 text-muted-foreground text-sm">No food items found.</p>
		);
	}
	return (
		<ul className="divide-y divide-border">
			{items.map((item) => (
				<li key={item.id}>
					<button
						aria-pressed={selectedId === item.id}
						className="w-full cursor-pointer px-4 py-2.5 text-left text-sm -outline-offset-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-brand-accent aria-pressed:bg-accent"
						onClick={() => onSelect(item)}
						type="button"
					>
						<span className="font-medium">{item.name}</span>
						{item.categories.length > 0 ? (
							<span className="ml-2 text-muted-foreground">
								({item.categories.map((category) => category.name).join(", ")})
							</span>
						) : null}
					</button>
				</li>
			))}
		</ul>
	);
}

interface AddFoodDialogProps {
	/** Food ids already on the meal — the API rejects a duplicate line. */
	excludeFoodItemIds: readonly string[];
	isSaving: boolean;
	onAdd: (foodItemId: string, quantity: number) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	scope: FoodCatalogScope;
}

export function AddFoodDialog({
	excludeFoodItemIds,
	isSaving,
	onAdd,
	onOpenChange,
	open,
	scope,
}: Readonly<AddFoodDialogProps>) {
	const [searchDraft, setSearchDraft] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [selectedFood, setSelectedFood] = useState<FoodItemDto | null>(null);
	const [quantityDraft, setQuantityDraft] = useState("");
	const [quantityError, setQuantityError] = useState<string | null>(null);

	const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);

	// A picker is browsed alphabetically, so it does not inherit the list's
	// newest-first default.
	const foodItemsQuery = useQuery(
		foodItemsQueryOptions(scope, {
			categoryId,
			page: 1,
			perPage: MAX_PER_PAGE,
			q: debouncedSearch,
			sortBy: "name",
			sortOrder: "asc",
		})
	);
	const categoriesQuery = useQuery(foodCategoryPickerQueryOptions(scope));

	const excluded = useMemo(
		() => new Set(excludeFoodItemIds),
		[excludeFoodItemIds]
	);
	const items = useMemo(
		() =>
			(foodItemsQuery.data?.data ?? []).filter(
				(item) => !excluded.has(item.id)
			),
		[excluded, foodItemsQuery.data]
	);

	const reset = () => {
		setSearchDraft("");
		setCategoryId("");
		setSelectedFood(null);
		setQuantityDraft("");
		setQuantityError(null);
	};

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			reset();
		}
		onOpenChange(next);
	};

	const handleAdd = () => {
		if (!selectedFood) {
			return;
		}
		const quantity = Number.parseFloat(quantityDraft);
		if (Number.isNaN(quantity) || quantity <= 0) {
			setQuantityError("Enter a positive number");
			return;
		}
		setQuantityError(null);
		onAdd(selectedFood.id, quantity);
		setSelectedFood(null);
		setQuantityDraft("");
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="flex max-h-[90svh] flex-col sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add food item</DialogTitle>
					<DialogDescription>
						Pick a food, then enter the quantity in that food&apos;s own unit —
						grams for 100g items, otherwise a count of pieces, litres, cups or
						tablespoons.
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4">
					<div className="flex flex-col gap-3 sm:flex-row">
						<Input
							aria-label="Search food items"
							className="sm:flex-1"
							onChange={(event) => setSearchDraft(event.target.value)}
							placeholder="Search by name"
							type="search"
							value={searchDraft}
						/>
						<Select
							onValueChange={(value: string | null) =>
								setCategoryId(
									value === null || value === ALL_CATEGORIES ? "" : value
								)
							}
							value={categoryId === "" ? ALL_CATEGORIES : categoryId}
						>
							<SelectTrigger
								aria-label="Filter by category"
								className="sm:w-44"
							>
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
								{(categoriesQuery.data?.data ?? []).map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="min-h-32 flex-1 overflow-y-auto rounded-xl bg-card-alt">
						<FoodItemPickerList
							isPending={foodItemsQuery.isPending}
							items={items}
							onSelect={setSelectedFood}
							selectedId={selectedFood?.id}
						/>
					</div>

					<FormField
						error={quantityError ? { message: quantityError } : undefined}
						htmlFor="add-food-quantity"
						label={quantityLabel(selectedFood?.unit)}
					>
						<Input
							disabled={!selectedFood || isSaving}
							id="add-food-quantity"
							inputMode="decimal"
							min={
								selectedFood
									? mealQuantityMin(selectedFood.unit)
									: FALLBACK_QUANTITY_MIN
							}
							onChange={(event) => setQuantityDraft(event.target.value)}
							placeholder={
								selectedFood
									? QUANTITY_PLACEHOLDER[selectedFood.unit]
									: "e.g. 100"
							}
							step={
								selectedFood
									? mealQuantityStep(selectedFood.unit)
									: FALLBACK_QUANTITY_STEP
							}
							type="number"
							value={quantityDraft}
						/>
					</FormField>
				</div>

				<DialogFooter>
					<Button onClick={() => handleOpenChange(false)} variant="outline">
						Close
					</Button>
					<Button
						disabled={!selectedFood || quantityDraft.trim() === "" || isSaving}
						onClick={handleAdd}
					>
						{isSaving ? "Adding…" : "Add"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
