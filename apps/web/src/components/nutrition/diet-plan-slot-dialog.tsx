import type { DietPlanMealDto, MealDto } from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
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
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { DayNumberSelect } from "@/components/nutrition/day-number-select";
import { formatSlotItemsSummary } from "@/components/nutrition/diet-plan-slots-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { mealQueryOptions, mealsQueryOptions } from "@/lib/api/queries/meals";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * Adds a meal slot to a plan, or edits one in place.
 *
 * One component for both because the fields are identical and only the initial
 * values differ — the pre-overhaul tree carried two near-identical dialogs that
 * drifted apart. Scope-parameterised so the admin and nutritionist plan editors
 * share it.
 *
 * `mealType` is a **free-text** column, not an enum: the datalist offers the
 * four names most plans use, but a slot named "pre-workout" is valid and, more
 * importantly, survives a round-trip through this dialog. A `<select>` here
 * would silently rewrite it.
 */

const SEARCH_DEBOUNCE_MS = 300;
const MEAL_TYPE_SUGGESTIONS = ["breakfast", "lunch", "dinner", "snack"];
const DEFAULT_MEAL_TYPE = "breakfast";
const REPEATS_EVERY_DAY = 0;
const FIRST_MEAL_ORDER = 1;

export interface DietPlanSlotValues {
	dayNumber: number;
	mealId: string;
	mealOrder: number;
	mealType: string;
	/** `null` clears the slot's default time and falls back to no time at all. */
	scheduledTime: string | null;
}

interface MealPickerListProps {
	isPending: boolean;
	meals: readonly MealDto[];
	onSelect: (mealId: string) => void;
	selectedMealId: string;
}

function MealPickerList({
	isPending,
	meals,
	onSelect,
	selectedMealId,
}: Readonly<MealPickerListProps>) {
	if (isPending) {
		return <p className="p-4 text-muted-foreground text-sm">Loading…</p>;
	}
	if (meals.length === 0) {
		return <p className="p-4 text-muted-foreground text-sm">No meals found.</p>;
	}
	return (
		<ul className="divide-y divide-border">
			{meals.map((meal) => (
				<li key={meal.id}>
					<button
						aria-pressed={selectedMealId === meal.id}
						className="w-full cursor-pointer px-4 py-2.5 text-left font-medium text-sm -outline-offset-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-brand-accent aria-pressed:bg-accent"
						onClick={() => onSelect(meal.id)}
						type="button"
					>
						{meal.name}
					</button>
				</li>
			))}
		</ul>
	);
}

interface DietPlanSlotDialogProps {
	isSaving: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: DietPlanSlotValues) => void;
	open: boolean;
	scope: FoodCatalogScope;
	/** `null` adds a new slot; a slot edits that one. */
	slot: DietPlanMealDto | null;
}

export function DietPlanSlotDialog({
	isSaving,
	onOpenChange,
	onSubmit,
	open,
	scope,
	slot,
}: Readonly<DietPlanSlotDialogProps>) {
	const [searchDraft, setSearchDraft] = useState("");
	const [mealId, setMealId] = useState("");
	const [dayNumber, setDayNumber] = useState(REPEATS_EVERY_DAY);
	const [mealType, setMealType] = useState(DEFAULT_MEAL_TYPE);
	const [mealOrder, setMealOrder] = useState(FIRST_MEAL_ORDER);
	const [scheduledTime, setScheduledTime] = useState("");

	// Reseeds every time the dialog opens, so reopening on a different slot never
	// shows the previous one's values.
	useEffect(() => {
		if (!open) {
			return;
		}
		setSearchDraft("");
		setMealId(slot?.mealId ?? "");
		setDayNumber(slot?.dayNumber ?? REPEATS_EVERY_DAY);
		setMealType(slot?.mealType ?? DEFAULT_MEAL_TYPE);
		setMealOrder(slot?.mealOrder ?? FIRST_MEAL_ORDER);
		setScheduledTime(slot?.scheduledTime ?? "");
	}, [open, slot]);

	const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);
	const mealsQuery = useQuery(
		mealsQueryOptions(scope, {
			page: 1,
			perPage: MAX_PER_PAGE,
			q: debouncedSearch,
			sortBy: "name",
			sortOrder: "asc",
		})
	);
	const selectedMealQuery = useQuery(mealQueryOptions(scope, mealId));

	const itemsPreview = selectedMealQuery.data
		? formatSlotItemsSummary(selectedMealQuery.data.mealItems)
		: null;

	const saveLabel = slot ? "Save slot" : "Add slot";

	const handleSubmit = () => {
		if (mealId === "" || mealType.trim() === "") {
			return;
		}
		onSubmit({
			dayNumber,
			mealId,
			mealOrder,
			mealType: mealType.trim(),
			scheduledTime: scheduledTime === "" ? null : scheduledTime,
		});
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="flex max-h-[90svh] flex-col overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{slot ? "Edit meal slot" : "Add meal to plan"}
					</DialogTitle>
					<DialogDescription>
						Pick the meal, then say when it is eaten. &quot;All days&quot;
						repeats the slot on every day of the plan.
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4">
					<FormField htmlFor="slot-meal-search" label="Search meals">
						<Input
							id="slot-meal-search"
							onChange={(event) => setSearchDraft(event.target.value)}
							placeholder="Search by name"
							type="search"
							value={searchDraft}
						/>
					</FormField>

					<div className="max-h-48 min-h-32 flex-1 overflow-y-auto rounded-xl bg-card-alt">
						<MealPickerList
							isPending={mealsQuery.isPending}
							meals={mealsQuery.data?.data ?? []}
							onSelect={setMealId}
							selectedMealId={mealId}
						/>
					</div>

					{itemsPreview ? (
						<div className="rounded-xl bg-card-alt px-3 py-2">
							<p className="font-medium text-muted-foreground text-xs">
								Food items in this meal
							</p>
							<p className="truncate text-sm" title={itemsPreview}>
								{itemsPreview}
							</p>
						</div>
					) : null}

					<DayNumberSelect
						disabled={isSaving}
						id="slot-day-number"
						onChange={setDayNumber}
						value={dayNumber}
					/>

					<FormField htmlFor="slot-meal-type" label="Meal type">
						<Input
							disabled={isSaving}
							id="slot-meal-type"
							list="slot-meal-type-options"
							onChange={(event) => setMealType(event.target.value)}
							placeholder="e.g. breakfast"
							value={mealType}
						/>
					</FormField>
					<datalist id="slot-meal-type-options">
						{MEAL_TYPE_SUGGESTIONS.map((suggestion) => (
							<option key={suggestion} value={suggestion} />
						))}
					</datalist>

					<div className="grid gap-4 sm:grid-cols-2">
						<FormField htmlFor="slot-meal-order" label="Order within the day">
							<Input
								disabled={isSaving}
								id="slot-meal-order"
								inputMode="numeric"
								min={FIRST_MEAL_ORDER}
								onChange={(event) =>
									setMealOrder(
										Math.max(
											FIRST_MEAL_ORDER,
											Number.parseInt(event.target.value, 10) ||
												FIRST_MEAL_ORDER
										)
									)
								}
								step={1}
								type="number"
								value={mealOrder}
							/>
						</FormField>

						<FormField
							htmlFor="slot-scheduled-time"
							label="Default time (optional)"
						>
							<Input
								disabled={isSaving}
								id="slot-scheduled-time"
								onChange={(event) => setScheduledTime(event.target.value)}
								type="time"
								value={scheduledTime}
							/>
						</FormField>
					</div>
				</div>

				<DialogFooter>
					<Button
						disabled={isSaving}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={isSaving || mealId === "" || mealType.trim() === ""}
						onClick={handleSubmit}
					>
						{isSaving ? "Saving…" : saveLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
