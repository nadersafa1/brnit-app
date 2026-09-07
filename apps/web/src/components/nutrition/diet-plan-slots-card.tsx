import type { DietPlanMealDto } from "@brnit/api";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent, CardHeader } from "@brnit/ui/components/card";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import {
	DietPlanSlotDialog,
	type DietPlanSlotValues,
} from "@/components/nutrition/diet-plan-slot-dialog";
import { DietPlanSlotsTable } from "@/components/nutrition/diet-plan-slots-table";
import { NutritionConflictNotice } from "@/components/nutrition/nutrition-conflict-notice";
import { useDietPlanSlotsEditor } from "@/hooks/use-diet-plan-slots-editor";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * The slot editor of a diet plan: the table, its selection actions, and the
 * one dialog that both adds and edits a slot.
 *
 * Scope-parameterised rather than forked — the admin and nutritionist plan
 * editors differ only in route and guard. Every change is one
 * `PATCH /diet-plans/:id`, which is also why a **409** here means the whole
 * plan is frozen rather than that one slot failed.
 */

interface DietPlanSlotsCardProps {
	dietPlanId: string;
	scope: FoodCatalogScope;
	slots: readonly DietPlanMealDto[];
}

export function DietPlanSlotsCard({
	dietPlanId,
	scope,
	slots,
}: Readonly<DietPlanSlotsCardProps>) {
	const [isSlotDialogOpen, setSlotDialogOpen] = useState(false);
	/** `null` puts the dialog in "add" mode. */
	const [slotBeingEdited, setSlotBeingEdited] =
		useState<DietPlanMealDto | null>(null);

	const editor = useDietPlanSlotsEditor({ dietPlanId, scope, slots });
	const hasSelection = editor.selectedIds.length > 0;

	const openAddSlot = () => {
		setSlotBeingEdited(null);
		setSlotDialogOpen(true);
	};

	const openEditSlot = (slot: DietPlanMealDto) => {
		setSlotBeingEdited(slot);
		setSlotDialogOpen(true);
	};

	/** Closes only once the write has landed, so a 409 leaves the dialog open. */
	const closeSlotDialog = () => {
		setSlotDialogOpen(false);
		setSlotBeingEdited(null);
	};

	const submitSlot = (values: DietPlanSlotValues) => {
		if (slotBeingEdited) {
			editor.updateSlot(
				{
					dayNumber: values.dayNumber,
					dietPlanMealId: slotBeingEdited.id,
					mealId: values.mealId,
					mealOrder: values.mealOrder,
					mealType: values.mealType,
					// `null` clears the slot's default time; `undefined` would leave it.
					scheduledTime: values.scheduledTime,
				},
				{ onApplied: closeSlotDialog }
			);
			return;
		}
		editor.addSlot(
			{
				dayNumber: values.dayNumber,
				mealId: values.mealId,
				mealOrder: values.mealOrder,
				mealType: values.mealType,
				scheduledTime: values.scheduledTime ?? undefined,
			},
			{ onApplied: closeSlotDialog }
		);
	};

	return (
		<>
			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="font-semibold text-sm">Meal slots in this plan</h2>
					<div className="flex flex-wrap items-center gap-2">
						<Button onClick={openAddSlot} size="sm" variant="outline">
							<PlusIcon aria-hidden />
							Add meal
						</Button>
						{hasSelection ? (
							<Button
								disabled={editor.isSaving}
								onClick={editor.removeSelected}
								size="sm"
								variant="destructive"
							>
								<Trash2Icon aria-hidden />
								Remove ({editor.selectedIds.length})
							</Button>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<NutritionConflictNotice
						message={editor.conflictMessage}
						title="This plan cannot be changed"
					/>
					<DietPlanSlotsTable
						isBusy={editor.isSaving}
						onEdit={openEditSlot}
						onRemove={editor.removeSlot}
						onToggleAllSelected={editor.toggleAllSelected}
						onToggleSelected={editor.toggleSelected}
						selectedIds={editor.selectedIds}
						slots={slots}
					/>
				</CardContent>
			</Card>

			<DietPlanSlotDialog
				isSaving={editor.isSaving}
				onOpenChange={setSlotDialogOpen}
				onSubmit={submitSlot}
				open={isSlotDialogOpen}
				scope={scope}
				slot={slotBeingEdited}
			/>
		</>
	);
}
