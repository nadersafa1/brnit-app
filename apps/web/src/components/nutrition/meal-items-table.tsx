import type { MealItemDto } from "@brnit/api";
import { mealQuantityMin, mealQuantityStep } from "@brnit/domain";
import { Button } from "@brnit/ui/components/button";
import { Checkbox } from "@brnit/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@brnit/ui/components/dropdown-menu";
import { Input } from "@brnit/ui/components/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
	formatMacro,
	scaleMacro,
} from "@/components/nutrition/nutrition-macros";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { formatMealQuantityWithUnit } from "@/lib/food-unit-display";

/**
 * The lines of a meal, with multi-select and in-place quantity editing.
 *
 * Purely presentational and scope-free: every write is a callback, so the admin
 * and nutritionist meal editors render the same table and only differ in which
 * mutation they hand it.
 *
 * Quantity is edited in the cell rather than in a dialog because it is the one
 * field that gets changed repeatedly while building a meal. The step and
 * minimum come from `@brnit/domain` — the same rules the alternatives endpoint
 * rounds to — so a hand-typed quantity and a suggested one stay comparable.
 */

const MACRO_COLUMNS = [
	{ key: "calories", label: "Cal" },
	{ key: "protein", label: "P" },
	{ key: "carbs", label: "C" },
	{ key: "fat", label: "F" },
] as const satisfies readonly { key: keyof MealItemDto; label: string }[];

interface QuantityEditorProps {
	item: MealItemDto;
	onCancel: () => void;
	onCommit: (quantity: number) => void;
}

function QuantityEditor({
	item,
	onCancel,
	onCommit,
}: Readonly<QuantityEditorProps>) {
	const [draft, setDraft] = useState(String(item.quantity));
	const inputRef = useRef<HTMLInputElement>(null);

	// Focus follows the click that opened the editor: without it the caret stays
	// on the row and the keyboard shortcuts below have nothing to act on.
	useEffect(() => {
		inputRef.current?.select();
	}, []);

	const commit = () => {
		const parsed = Number.parseFloat(draft);
		if (Number.isNaN(parsed) || parsed <= 0) {
			onCancel();
			return;
		}
		onCommit(parsed);
	};

	return (
		<Input
			aria-label={`Quantity of ${item.foodName}`}
			className="h-9 w-24"
			inputMode="decimal"
			min={mealQuantityMin(item.unit)}
			onBlur={commit}
			onChange={(event) => setDraft(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					commit();
				}
				if (event.key === "Escape") {
					onCancel();
				}
			}}
			ref={inputRef}
			step={mealQuantityStep(item.unit)}
			type="number"
			value={draft}
		/>
	);
}

interface MealItemRowProps {
	isEditing: boolean;
	isSelected: boolean;
	item: MealItemDto;
	onEditCancel: () => void;
	onEditStart: (mealItemId: string) => void;
	onQuantityCommit: (mealItemId: string, quantity: number) => void;
	onRemove: (mealItemId: string) => void;
	onToggleSelected: (mealItemId: string) => void;
}

function MealItemRow({
	isEditing,
	isSelected,
	item,
	onEditCancel,
	onEditStart,
	onQuantityCommit,
	onRemove,
	onToggleSelected,
}: Readonly<MealItemRowProps>) {
	return (
		<TableRow>
			<TableCell>
				<Checkbox
					aria-label={`Select ${item.foodName}`}
					checked={isSelected}
					onCheckedChange={() => onToggleSelected(item.id)}
				/>
			</TableCell>
			<TableCell className="font-medium">{item.foodName}</TableCell>
			<TableCell className="text-muted-foreground">
				{item.categories.length > 0
					? item.categories.map((category) => category.name).join(", ")
					: "–"}
			</TableCell>
			<TableCell>
				{isEditing ? (
					<QuantityEditor
						item={item}
						onCancel={onEditCancel}
						onCommit={(quantity) => onQuantityCommit(item.id, quantity)}
					/>
				) : (
					<button
						className="cursor-pointer rounded-md text-left outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
						onClick={() => onEditStart(item.id)}
						type="button"
					>
						{formatMealQuantityWithUnit(item.quantity, item.unit)}
					</button>
				)}
			</TableCell>
			{MACRO_COLUMNS.map((macro) => (
				<TableCell className="text-right tabular-nums" key={macro.key}>
					{formatMacro(scaleMacro(item[macro.key], item.quantity, item.unit))}
				</TableCell>
			))}
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {item.foodName}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEditStart(item.id)}>
							<PencilIcon aria-hidden />
							Edit quantity
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onRemove(item.id)}
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Remove from meal
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

interface MealItemsTableProps {
	mealItems: readonly MealItemDto[];
	onQuantityChange: (mealItemId: string, quantity: number) => void;
	onRemove: (mealItemId: string) => void;
	onToggleAllSelected: () => void;
	onToggleSelected: (mealItemId: string) => void;
	selectedIds: readonly string[];
}

export function MealItemsTable({
	mealItems,
	onQuantityChange,
	onRemove,
	onToggleAllSelected,
	onToggleSelected,
	selectedIds,
}: Readonly<MealItemsTableProps>) {
	const [editingId, setEditingId] = useState<string | null>(null);

	if (mealItems.length === 0) {
		return (
			<ShellEmptyState
				description="Add the first food item to give this meal its macros."
				title="No food items"
			/>
		);
	}

	const allSelected = selectedIds.length === mealItems.length;

	const commitQuantity = (mealItemId: string, quantity: number) => {
		setEditingId(null);
		onQuantityChange(mealItemId, quantity);
	};

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">
							<Checkbox
								aria-label="Select every food item"
								checked={allSelected}
								onCheckedChange={onToggleAllSelected}
							/>
						</TableHead>
						<TableHead>Food name</TableHead>
						<TableHead>Categories</TableHead>
						<TableHead>Quantity</TableHead>
						{MACRO_COLUMNS.map((macro) => (
							<TableHead className="text-right" key={macro.key}>
								{macro.label}
							</TableHead>
						))}
						<TableHead className="w-12">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{mealItems.map((item) => (
						<MealItemRow
							isEditing={editingId === item.id}
							isSelected={selectedIds.includes(item.id)}
							item={item}
							key={item.id}
							onEditCancel={() => setEditingId(null)}
							onEditStart={setEditingId}
							onQuantityCommit={commitQuantity}
							onRemove={onRemove}
							onToggleSelected={onToggleSelected}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
