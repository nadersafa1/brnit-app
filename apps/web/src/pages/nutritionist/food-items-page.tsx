import { Card, CardContent } from "@brnit/ui/components/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@brnit/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { UtensilsCrossedIcon } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { NutritionistFoodItemsTable } from "@/components/nutritionist/food-items-table";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { foodCategoryPickerQueryOptions } from "@/lib/api/queries/food-categories";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import type { FoodItemsSearch } from "@/lib/food-items-search";

const ROUTE_ID = "/dashboard/nutritionist/food-items/";
const ALL_CATEGORIES = "all";
const FIRST_PAGE = 1;

/**
 * The nutritionist's view of the global food catalog — **read only**.
 *
 * The write endpoints live under `/admin` only, so this screen deliberately
 * offers no create, edit or delete: table state, filtering and paging, and
 * nothing that mutates.
 */
export function NutritionistFoodItemsPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });

	const foodItemsQuery = useQuery(
		foodItemsQueryOptions("nutritionist", search)
	);
	const categoriesQuery = useQuery(
		foodCategoryPickerQueryOptions("nutritionist")
	);
	const categories = categoriesQuery.data?.data ?? [];

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<FoodItemsSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const items = foodItemsQuery.data?.data ?? [];
	const pagination = foodItemsQuery.data?.pagination;
	const isEmpty = !foodItemsQuery.isPending && items.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				description="The global food catalog. Macros are stored per unit; open an item to see its full breakdown."
				eyebrow="Nutritionist"
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
									: "The catalog is empty. An admin adds food items."
							}
							icon={UtensilsCrossedIcon}
							title="No food items"
						/>
					) : (
						<NutritionistFoodItemsTable
							isPending={foodItemsQuery.isPending}
							items={items}
							onSortChange={(sortBy, sortOrder) =>
								applySearch({ sortBy, sortOrder })
							}
							sortBy={search.sortBy}
							sortOrder={search.sortOrder}
						/>
					)}

					{pagination ? (
						<DataTablePagination
							itemLabel="food items"
							onPageChange={(page) =>
								navigate({ search: (current) => ({ ...current, page }) })
							}
							onPerPageChange={(perPage) => applySearch({ perPage })}
							pagination={pagination}
						/>
					) : null}
				</CardContent>
			</Card>
		</ShellPage>
	);
}
