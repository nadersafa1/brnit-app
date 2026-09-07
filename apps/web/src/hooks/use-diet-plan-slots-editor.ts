import type { DietPlanMealDto } from "@brnit/api";
import { useMemo, useState } from "react";

import { useUpdateDietPlanMutation } from "@/hooks/use-diet-plan-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import type {
	DietPlanSlotAdd,
	DietPlanSlotPatch,
} from "@/lib/api/queries/diet-plans";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * The diet-plan detail page's slot editor.
 *
 * Adds, edits and removals are all one `PATCH /diet-plans/:id`, applied in
 * FK-safe order inside a single transaction. Like the meal editor, every method
 * uses `mutate` and reports success through `onApplied`, so a dialog closes
 * only when the write landed and nothing rejects into a caller.
 *
 * A **409** on any of them says the plan has an assignment and is therefore
 * immutable — surfaced as `conflictMessage` for the page to render as a
 * standing notice, because no retry will change the answer.
 */
interface UseDietPlanSlotsEditorOptions {
	dietPlanId: string;
	scope: FoodCatalogScope;
	slots: readonly DietPlanMealDto[];
}

interface ApplyOptions {
	onApplied?: () => void;
}

export function useDietPlanSlotsEditor({
	dietPlanId,
	scope,
	slots,
}: UseDietPlanSlotsEditorOptions) {
	const [selection, setSelection] = useState<readonly string[]>([]);
	const updateMutation = useUpdateDietPlanMutation(scope, dietPlanId);

	/** Filtered against the live slots, so a removed row leaves the selection at once. */
	const selectedIds = useMemo(() => {
		const presentIds = new Set(slots.map((slot) => slot.id));
		return selection.filter((id) => presentIds.has(id));
	}, [selection, slots]);

	const toggleSelected = (dietPlanMealId: string) => {
		setSelection((current) =>
			current.includes(dietPlanMealId)
				? current.filter((id) => id !== dietPlanMealId)
				: [...current, dietPlanMealId]
		);
	};

	const toggleAllSelected = () => {
		setSelection((current) =>
			current.length === slots.length ? [] : slots.map((slot) => slot.id)
		);
	};

	const addSlot = (slot: DietPlanSlotAdd, options?: ApplyOptions) => {
		updateMutation.mutate(
			{ add: [slot] },
			{ onSuccess: () => options?.onApplied?.() }
		);
	};

	const updateSlot = (patch: DietPlanSlotPatch, options?: ApplyOptions) => {
		updateMutation.mutate(
			{ update: [patch] },
			{ onSuccess: () => options?.onApplied?.() }
		);
	};

	const removeSlot = (dietPlanMealId: string) => {
		updateMutation.mutate({ remove: [dietPlanMealId] });
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

	return {
		addSlot,
		conflictMessage: readConflictMessage(updateMutation.error),
		isSaving: updateMutation.isPending,
		removeSelected,
		removeSlot,
		selectedIds,
		toggleAllSelected,
		toggleSelected,
		updateSlot,
	};
}
