import type { FoodItemDto, SortOrder } from "@brnit/api";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent } from "@brnit/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { PlusIcon, UtensilsCrossedIcon } from "lucide-react";
import { useState } from "react";

import { FoodItemForm } from "@/components/admin/food-item-form";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { foodCategoryPickerQueryOptions } from "@/lib/api/queries/food-categories";
import {
	type FoodItemSortBy,
	foodItemsQueryOptions,
} from "@/lib/api/queries/food-items";
import type { FoodItemsSearch } from "@/lib/food-items-search";
import { formatFoodUnitLabel } from "@/lib/food-unit-display";

const ROUTE_ID = "/dashboard/admin/food-items/";
const SKELETON_ROWS = 6;
const ALL_CATEGORIES = "all";
const FIRST_PAGE = 1;

const MACRO_COLUMNS = [
	{ column: "calories", label: "Kcal" },
	{ column: "protein", label: "Protein" },
	{ column: "carbs", label: "Carbs" },
	{ column: "fat", label: "Fat" },
] as const satisfies readonly { column: FoodItemSortBy; label: string }[];

/**
 * The whole row is clickable for the mouse, but the name is a real `<Link>` so
 * the row is reachable by keyboard, announced as a link, and middle-clickable
 * into a new tab. A row that is only an `onClick` is a dead end without a mouse.
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
					to="/dashboard/admin/food-items/$foodItemId"
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

/**
 * The paginated-list template.
 *
 * **All table state lives in the URL** — page, page size, search, sort and the
 * category filter are search params, so a filtered view is shareable, survives
 * a refresh, and the back button walks through it. The component holds no
 * mirror of that state; `useSearch` is the single source and every control
 * navigates rather than calling a setter.
 */
export function FoodItemsPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isCreateOpen, setCreateOpen] = useState(false);

	const foodItemsQuery = useQuery(foodItemsQueryOptions("admin", search));
	const categoriesQuery = useQuery(foodCategoryPickerQueryOptions("admin"));
	const categories = categoriesQuery.data?.data ?? [];

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<FoodItemsSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const openFoodItem = (foodItemId: string) => {
		navigate({
			params: { foodItemId },
			to: "/dashboard/admin/food-items/$foodItemId",
		});
	};

	const items = foodItemsQuery.data?.data ?? [];
	const pagination = foodItemsQuery.data?.pagination;
	const isEmpty = !foodItemsQuery.isPending && items.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				actions={
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<PlusIcon aria-hidden />
						New food item
					</Button>
				}
				description="The global food catalog. Macros are stored per unit and every item needs at least one category."
				eyebrow="Admin"
				title="Food items"
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<DataTableSearch
							label="Search food items"
							onSearchChange={(q) => applySearch({ q })}
							placeholder="Search by name"
							value={search.q}
						/>
						<Select
							onValueChange={(value: string | null) =>
								applySearch({
									categoryId:
										value === null || value === ALL_CATEGORIES ? "" : value,
								})
							}
							value={
								search.categoryId === "" ? ALL_CATEGORIES : search.categoryId
							}
						>
							<SelectTrigger
								aria-label="Filter by category"
								className="sm:w-56"
								size="sm"
							>
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{isEmpty ? (
						<ShellEmptyState
							description={
								search.q || search.categoryId
									? "No food item matches these filters. Try a different search or category."
									: "Add the first food item to start building meals and diet plans."
							}
							icon={UtensilsCrossedIcon}
							title="No food items"
						/>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<SortableColumnHeader
											column="name"
											label="Name"
											onSortChange={(sortBy, sortOrder) =>
												applySearch({ sortBy, sortOrder })
											}
											sortBy={search.sortBy}
											sortOrder={search.sortOrder}
										/>
										{MACRO_COLUMNS.map((macro) => (
											<SortableColumnHeader
												align="end"
												className="text-right"
												column={macro.column}
												key={macro.column}
												label={macro.label}
												onSortChange={(sortBy, sortOrder: SortOrder) =>
													applySearch({ sortBy, sortOrder })
												}
												sortBy={search.sortBy}
												sortOrder={search.sortOrder}
											/>
										))}
										<TableHead>Unit</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{foodItemsQuery.isPending
										? Array.from({ length: SKELETON_ROWS }, (_, index) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
												<TableRow key={`skeleton-${index}`}>
													<TableCell colSpan={6}>
														<Skeleton className="h-6 w-full" />
													</TableCell>
												</TableRow>
											))
										: items.map((item) => (
												<FoodItemRow
													item={item}
													key={item.id}
													onOpen={openFoodItem}
												/>
											))}
								</TableBody>
							</Table>
						</div>
					)}

					{pagination ? (
						<DataTablePagination
							itemLabel="food items"
							onPageChange={(page) =>
								navigate({ search: (c) => ({ ...c, page }) })
							}
							onPerPageChange={(perPage) => applySearch({ perPage })}
							pagination={pagination}
						/>
					) : null}
				</CardContent>
			</Card>

			<Dialog onOpenChange={setCreateOpen} open={isCreateOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New food item</DialogTitle>
						<DialogDescription>
							Macros are per unit: per 100 g for `100g`, per single item for
							everything else.
						</DialogDescription>
					</DialogHeader>
					<FoodItemForm
						categories={categories}
						item={null}
						onCancel={() => setCreateOpen(false)}
						onSaved={() => setCreateOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
