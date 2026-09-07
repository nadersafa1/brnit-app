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
 * The food items filed under one category, on the **admin** category page.
 *
 * Deliberately a different component from the nutritionist grid rather than a
 * shared one behind a `to` prop: the destination is a typed route literal, and
 * threading it through as a parameter would trade TanStack's compile-time route
 * checking for a runtime string. The two trees differ in exactly that one link.
 *
 * There are no row actions here — a food item is edited on its own detail page,
 * which is where its blocking-reference rules are explained.
 */

const SKELETON_ROWS = 5;
const COLUMN_COUNT = 6;

const MACRO_COLUMNS = [
	{ column: "calories", label: "Kcal" },
	{ column: "protein", label: "Protein" },
	{ column: "carbs", label: "Carbs" },
	{ column: "fat", label: "Fat" },
] as const satisfies readonly { column: FoodItemSortBy; label: string }[];

function AdminFoodItemRow({
	item,
	onOpen,
}: Readonly<{ item: FoodItemDto; onOpen: (foodItemId: string) => void }>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(item.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ foodItemId: item.id }}
					to="/dashboard/admin/food-items/$foodItemId"
				>
					{item.name}
				</Link>
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

interface AdminFoodItemsTableProps {
	isPending: boolean;
	items: readonly FoodItemDto[];
	onSortChange: (sortBy: FoodItemSortBy, sortOrder: SortOrder) => void;
	sortBy: FoodItemSortBy;
	sortOrder: SortOrder;
}

export function AdminFoodItemsTable({
	isPending,
	items,
	onSortChange,
	sortBy,
	sortOrder,
}: Readonly<AdminFoodItemsTableProps>) {
	const navigate = useNavigate();

	const openFoodItem = (foodItemId: string) => {
		navigate({
			params: { foodItemId },
			to: "/dashboard/admin/food-items/$foodItemId",
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
								<AdminFoodItemRow
									item={item}
									key={item.id}
									onOpen={openFoodItem}
								/>
							))}
				</TableBody>
			</Table>
		</div>
	);
}
