import type { FoodItemDto, SortOrder } from "@brnit/api";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { Link, useNavigate } from "@tanstack/react-router";

import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import type { FoodItemSortBy } from "@/lib/api/queries/food-items";
import { formatFoodUnitLabel } from "@/lib/food-unit-display";

/**
 * The read-only food-item grid, shared by the nutritionist's food-items list
 * and by a category's detail page.
 *
 * It carries **no** create, edit or delete affordance: the nutritionist tree
 * exposes food items as `GET` only (`docs/migration/api-surface.md` §5). Rows
 * open the detail page, and that is the whole interaction.
 *
 * The destination is a nutritionist route, so this stays out of
 * `components/nutrition/**` — the admin grid links elsewhere and owns its own
 * row actions.
 */

const SKELETON_ROWS = 6;
const COLUMN_COUNT = 6;

const MACRO_COLUMNS = [
	{ column: "calories", label: "Kcal" },
	{ column: "protein", label: "Protein" },
	{ column: "carbs", label: "Carbs" },
	{ column: "fat", label: "Fat" },
] as const satisfies readonly { column: FoodItemSortBy; label: string }[];

/**
 * The whole row is clickable for the mouse, but the name is a real `<Link>` so
 * the row is reachable by keyboard, announced as a link, and middle-clickable
 * into a new tab.
 */
function FoodItemRow({
	item,
	onOpen,
}: Readonly<{ item: FoodItemDto; onOpen: (foodItemId: string) => void }>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(item.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ foodItemId: item.id }}
					to="/dashboard/nutritionist/food-items/$foodItemId"
				>
					{item.name}
				</Link>
				<p className="truncate text-muted-foreground text-xs">
					{item.categories.length > 0
						? item.categories.map((category) => category.name).join(", ")
						: "No categories"}
				</p>
			</TableCell>
			<TableCell className="text-right tabular-nums">{item.calories}</TableCell>
			<TableCell className="text-right tabular-nums">{item.protein}</TableCell>
			<TableCell className="text-right tabular-nums">{item.carbs}</TableCell>
			<TableCell className="text-right tabular-nums">{item.fat}</TableCell>
			<TableCell className="text-muted-foreground">
				{formatFoodUnitLabel(item.unit)}
			</TableCell>
		</TableRow>
	);
}

interface NutritionistFoodItemsTableProps {
	isPending: boolean;
	items: readonly FoodItemDto[];
	onSortChange: (sortBy: FoodItemSortBy, sortOrder: SortOrder) => void;
	sortBy: FoodItemSortBy;
	sortOrder: SortOrder;
}

export function NutritionistFoodItemsTable({
	isPending,
	items,
	onSortChange,
	sortBy,
	sortOrder,
}: Readonly<NutritionistFoodItemsTableProps>) {
	const navigate = useNavigate();

	const openFoodItem = (foodItemId: string) => {
		navigate({
			params: { foodItemId },
			to: "/dashboard/nutritionist/food-items/$foodItemId",
		});
	};

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<SortableColumnHeader
							column="name"
							label="Name"
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
						/>
						{MACRO_COLUMNS.map((macro) => (
							<SortableColumnHeader
								align="end"
								className="text-right"
								column={macro.column}
								key={macro.column}
								label={macro.label}
								onSortChange={onSortChange}
								sortBy={sortBy}
								sortOrder={sortOrder}
							/>
						))}
						<TableHead>Unit</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isPending
						? Array.from({ length: SKELETON_ROWS }, (_, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
								<TableRow key={`skeleton-${index}`}>
									<TableCell colSpan={COLUMN_COUNT}>
										<Skeleton className="h-6 w-full" />
									</TableCell>
								</TableRow>
							))
						: items.map((item) => (
								<FoodItemRow item={item} key={item.id} onOpen={openFoodItem} />
							))}
				</TableBody>
			</Table>
		</div>
	);
}
