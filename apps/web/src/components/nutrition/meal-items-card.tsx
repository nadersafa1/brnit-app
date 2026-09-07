import type { MealItemDto } from "@brnit/api";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent, CardHeader } from "@brnit/ui/components/card";
import { PlusIcon, ScaleIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { AddFoodDialog } from "@/components/nutrition/add-food-dialog";
import { BulkQuantityDialog } from "@/components/nutrition/bulk-quantity-dialog";
import { MealItemsTable } from "@/components/nutrition/meal-items-table";
import { NutritionConflictNotice } from "@/components/nutrition/nutrition-conflict-notice";
import { useMealItemsEditor } from "@/hooks/use-meal-items-editor";
import type { FoodCatalogScope } from "@/lib/api/query-keys";

/**
 * The line editor of a meal: the table, its selection actions, and the two
 * dialogs that write to it.
 *
 * Scope-parameterised rather than forked — the admin and nutritionist meal
 * detail pages differ in their route and their guard, not in how a meal is
 * assembled. Every intent is one `PATCH /meals/:id`; `useMealItemsEditor` owns
 * that, and this component is the layout around it.
 */

interface MealItemsCardProps {
	mealId: string;
	mealItems: readonly MealItemDto[];
	scope: FoodCatalogScope;
}

export function MealItemsCard({
	mealId,
	mealItems,
	scope,
}: Readonly<MealItemsCardProps>) {
	const [isAddFoodOpen, setAddFoodOpen] = useState(false);
	const [isBulkQuantityOpen, setBulkQuantityOpen] = useState(false);

	const editor = useMealItemsEditor({ mealId, mealItems, scope });
	const hasSelection = editor.selectedIds.length > 0;

	/** Closes only once the write has landed, so a 409 leaves the dialog open. */
	const applyBulkQuantity = (quantity: number) => {
		editor.setSelectedQuantity(quantity, {
			onApplied: () => setBulkQuantityOpen(false),
		});
	};

	return (
		<>
			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2 className="font-semibold text-sm">Food items in this meal</h2>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							onClick={() => setAddFoodOpen(true)}
							size="sm"
							variant="outline"
						>
							<PlusIcon aria-hidden />
							Add food
						</Button>
						{hasSelection ? (
							<>
								<Button
									onClick={() => setBulkQuantityOpen(true)}
									size="sm"
									variant="outline"
								>
									<ScaleIcon aria-hidden />
									Set quantity ({editor.selectedIds.length})
								</Button>
								<Button
									disabled={editor.isSaving}
									onClick={editor.removeSelected}
									size="sm"
									variant="destructive"
								>
									<Trash2Icon aria-hidden />
									Remove ({editor.selectedIds.length})
								</Button>
							</>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<NutritionConflictNotice
						message={editor.conflictMessage}
						title="This meal cannot be changed"
					/>
					<MealItemsTable
						mealItems={mealItems}
						onQuantityChange={editor.setItemQuantity}
						onRemove={editor.removeItem}
						onToggleAllSelected={editor.toggleAllSelected}
						onToggleSelected={editor.toggleSelected}
						selectedIds={editor.selectedIds}
					/>
				</CardContent>
			</Card>

			<AddFoodDialog
				excludeFoodItemIds={mealItems.map((item) => item.foodItemId)}
				isSaving={editor.isSaving}
				onAdd={editor.addFoodItem}
				onOpenChange={setAddFoodOpen}
				open={isAddFoodOpen}
				scope={scope}
			/>

			<BulkQuantityDialog
				isSaving={editor.isSaving}
				onConfirm={applyBulkQuantity}
				onOpenChange={setBulkQuantityOpen}
				open={isBulkQuantityOpen}
				selectedCount={editor.selectedIds.length}
			/>
		</>
	);
}
