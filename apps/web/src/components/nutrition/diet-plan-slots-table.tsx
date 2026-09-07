import type { DietPlanMealDto } from "@brnit/api";
import type { FoodUnit } from "@brnit/domain";
import { Button } from "@brnit/ui/components/button";
import { Checkbox } from "@brnit/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@brnit/ui/components/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { formatDayNumberDisplay } from "@/components/nutrition/day-number-select";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { formatMealQuantityWithUnit } from "@/lib/food-unit-display";

/**
 * The meal slots of a diet plan.
 *
 * Presentational and scope-free — every write is a callback — so both catalog
 * trees render the same table.
 *
 * A slot is *when* a meal is eaten, not a copy of it: the lines shown in the
 * "Food items" column belong to the referenced meal and change with it.
 */

const NO_ITEMS = "–";

/**
 * The narrowest shape the summary needs. Slot lines and meal lines are
 * different DTOs that agree on these three fields, so the preview in the slot
 * dialog and the column here render from one function.
 */
export interface SlotItemSummaryLine {
	foodName: string;
	quantity: number;
	unit: FoodUnit;
}

/** `Chicken 150 g, Rice 100 g` — unit-aware, because a slot can mix units. */
export function formatSlotItemsSummary(
	mealItems: readonly SlotItemSummaryLine[]
): string {
	if (mealItems.length === 0) {
		return NO_ITEMS;
	}
	return mealItems
		.map(
			(item) =>
				`${item.foodName} ${formatMealQuantityWithUnit(item.quantity, item.unit)}`
		)
		.join(", ");
}

interface DietPlanSlotRowProps {
	isBusy: boolean;
	isSelected: boolean;
	onEdit: (slot: DietPlanMealDto) => void;
	onRemove: (dietPlanMealId: string) => void;
	onToggleSelected: (dietPlanMealId: string) => void;
	slot: DietPlanMealDto;
}

function DietPlanSlotRow({
	isBusy,
	isSelected,
	onEdit,
	onRemove,
	onToggleSelected,
	slot,
}: Readonly<DietPlanSlotRowProps>) {
	const itemsSummary = formatSlotItemsSummary(slot.mealItems);

	return (
		<TableRow>
			<TableCell>
				<Checkbox
					aria-label={`Select the ${slot.mealType} slot on ${formatDayNumberDisplay(slot.dayNumber)}`}
					checked={isSelected}
					onCheckedChange={() => onToggleSelected(slot.id)}
				/>
			</TableCell>
			<TableCell className="font-medium">
				{formatDayNumberDisplay(slot.dayNumber)}
			</TableCell>
			<TableCell className="capitalize">{slot.mealType}</TableCell>
			<TableCell className="tabular-nums">
				{slot.scheduledTime ?? "—"}
			</TableCell>
			<TableCell className="text-right tabular-nums">
				{slot.mealOrder}
			</TableCell>
			<TableCell>{slot.mealName}</TableCell>
			<TableCell className="max-w-[18rem] truncate text-muted-foreground text-sm">
				<span title={itemsSummary}>{itemsSummary}</span>
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {slot.mealName}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem disabled={isBusy} onClick={() => onEdit(slot)}>
							<PencilIcon aria-hidden />
							Edit slot
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={isBusy}
							onClick={() => onRemove(slot.id)}
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Remove from plan
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

interface DietPlanSlotsTableProps {
	isBusy: boolean;
	onEdit: (slot: DietPlanMealDto) => void;
	onRemove: (dietPlanMealId: string) => void;
	onToggleAllSelected: () => void;
	onToggleSelected: (dietPlanMealId: string) => void;
	selectedIds: readonly string[];
	slots: readonly DietPlanMealDto[];
}

export function DietPlanSlotsTable({
	isBusy,
	onEdit,
	onRemove,
	onToggleAllSelected,
	onToggleSelected,
	selectedIds,
	slots,
}: Readonly<DietPlanSlotsTableProps>) {
	if (slots.length === 0) {
		return (
			<ShellEmptyState
				description={
					'Add a meal slot to build the plan. Use "All days" for a meal that repeats every day.'
				}
				title="No meal slots"
			/>
		);
	}

	const allSelected = selectedIds.length === slots.length;

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">
							<Checkbox
								aria-label="Select every meal slot"
								checked={allSelected}
								onCheckedChange={onToggleAllSelected}
							/>
						</TableHead>
						<TableHead>Day</TableHead>
						<TableHead>Meal type</TableHead>
						<TableHead>Default time</TableHead>
						<TableHead className="text-right">Order</TableHead>
						<TableHead>Meal</TableHead>
						<TableHead>Food items</TableHead>
						<TableHead className="w-12">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{slots.map((slot) => (
						<DietPlanSlotRow
							isBusy={isBusy}
							isSelected={selectedIds.includes(slot.id)}
							key={slot.id}
							onEdit={onEdit}
							onRemove={onRemove}
							onToggleSelected={onToggleSelected}
							slot={slot}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
