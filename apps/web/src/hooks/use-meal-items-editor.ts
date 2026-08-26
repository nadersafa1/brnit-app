import type { MealItemDto } from "@brnit/api";
import { useMemo, useState } from "react";

import { useUpdateMealMutation } from "@/hooks/use-meal-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * The meal detail page's line editor.
 *
 * Every intent — add a food, retype a quantity, remove a line, apply one
 * quantity to a selection — is a single `PATCH /meals/:id` carrying `add`,
 * `update` or `remove`. The server applies them in one transaction and
 * recomputes the meal totals, which is why the page never does macro maths of
 * its own and never issues two requests for one action.
 *
 * Every method uses `mutate` rather than `mutateAsync`, so nothing here ever
 * rejects into a caller that has no way to handle it. Success is reported
 * through the optional `onApplied` callback — that is what lets a dialog close
 * only when the write actually landed.
 *
 * A **409** on any of them means the same thing: the meal belongs to a diet
 * plan that somebody is already assigned to, so its lines are frozen. It is
 * exposed as `conflictMessage` for the page to render as a standing notice.
 */
interface UseMealItemsEditorOptions {
	mealId: string;
	mealItems: readonly MealItemDto[];
	scope: FoodCatalogScope;
}

interface ApplyOptions {
	onApplied?: () => void;
}

export function useMealItemsEditor({
	mealId,
	mealItems,
	scope,
}: UseMealItemsEditorOptions) {
	const [selection, setSelection] = useState<readonly string[]>([]);
	const updateMutation = useUpdateMealMutation(scope, mealId);

	/**
	 * Selection is filtered against the live rows rather than cleaned up in an
	 * effect: a removed line disappears from the selection on the same render
	 * that removes it from the table, with no intermediate state where the
	 * header counts rows that are gone.
	 */
	const selectedIds = useMemo(() => {
		const presentIds = new Set(mealItems.map((item) => item.id));
		return selection.filter((id) => presentIds.has(id));
	}, [mealItems, selection]);

	const toggleSelected = (mealItemId: string) => {
		setSelection((current) =>
			current.includes(mealItemId)
				? current.filter((id) => id !== mealItemId)
				: [...current, mealItemId]
		);
	};

	const toggleAllSelected = () => {
		setSelection((current) =>
			current.length === mealItems.length
				? []
				: mealItems.map((item) => item.id)
		);
	};

	const addFoodItem = (
		foodItemId: string,
		quantity: number,
		options?: ApplyOptions
	) => {
		updateMutation.mutate(
			{ add: [{ foodItemId, quantity }] },
			{ onSuccess: () => options?.onApplied?.() }
		);
	};

	const setItemQuantity = (mealItemId: string, quantity: number) => {
		updateMutation.mutate({ update: [{ mealItemId, quantity }] });
	};

	const removeItem = (mealItemId: string) => {
		updateMutation.mutate({ remove: [mealItemId] });
	};

	const removeSelected = () => {
		if (selectedIds.length === 0) {
			return;
		}
		updateMutation.mutate(
			{ remove: [...selectedIds] },
			{ onSuccess: () => setSelection([]) }
		);
	};

	const setSelectedQuantity = (quantity: number, options?: ApplyOptions) => {
		if (selectedIds.length === 0) {
			return;
		}
		updateMutation.mutate(
			{ update: selectedIds.map((mealItemId) => ({ mealItemId, quantity })) },
			{
				onSuccess: () => {
					setSelection([]);
					options?.onApplied?.();
				},
			}
		);
	};

	return {
		addFoodItem,
		conflictMessage: readConflictMessage(updateMutation.error),
		isSaving: updateMutation.isPending,
		removeItem,
		removeSelected,
		selectedIds,
		setItemQuantity,
		setSelectedQuantity,
		toggleAllSelected,
		toggleSelected,
	};
}
