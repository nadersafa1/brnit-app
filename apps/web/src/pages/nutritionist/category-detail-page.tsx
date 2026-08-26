import { toDateStringUTC } from "@brnit/datetime";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent, CardHeader } from "@brnit/ui/components/card";
import { Skeleton } from "@brnit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	Link,
	useNavigate,
	useParams,
	useSearch,
} from "@tanstack/react-router";
import { ArrowLeftIcon, UtensilsCrossedIcon } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { NutritionistFoodItemsTable } from "@/components/nutritionist/food-items-table";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { foodCategoryQueryOptions } from "@/lib/api/queries/food-categories";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import type { FoodItemsSearch } from "@/lib/food-items-search";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/nutritionist/categories/$foodCategoryId";
const LIST_PATH = "/dashboard/nutritionist/categories";
const FIRST_PAGE = 1;

/**
 * One category, **read only**, plus the food items filed under it.
 *
 * The nested table is the same grid the food-items list renders — it just takes
 * its `categoryId` from the path instead of from a dropdown, so the category
 * filter is not offered twice.
 */
export function NutritionistCategoryDetailPage() {
	const { foodCategoryId } = useParams({ from: ROUTE_ID });
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });

	const categoryQuery = useQuery(
		foodCategoryQueryOptions("nutritionist", foodCategoryId)
	);
	const foodItemsQuery = useQuery(
		foodItemsQueryOptions("nutritionist", {
			...search,
			categoryId: foodCategoryId,
		})
	);

	const applySearch = (next: Partial<FoodItemsSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const backLink = (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to food categories
		</Button>
	);

	if (categoryQuery.isPending) {
		return (
			<ShellPage>
				<Skeleton className="h-9 w-48" />
				<Skeleton className="h-64 w-full" />
			</ShellPage>
		);
	}

	if (categoryQuery.isError || !categoryQuery.data) {
		return (
			<ShellPage>
				{backLink}
				<Card className="border-destructive/40">
					<CardContent className="space-y-3 p-6">
						<p className="text-destructive text-sm" role="alert">
							{getUserFacingErrorMessage(
								categoryQuery.error,
								"This category could not be loaded."
							)}
						</p>
						<Button
							onClick={() => categoryQuery.refetch()}
							size="sm"
							variant="outline"
						>
							Try again
						</Button>
					</CardContent>
				</Card>
			</ShellPage>
		);
	}

	const category = categoryQuery.data;
	const items = foodItemsQuery.data?.data ?? [];
	const pagination = foodItemsQuery.data?.pagination;
	const isEmpty = !foodItemsQuery.isPending && items.length === 0;

	return (
		<ShellPage>
			{backLink}
			<ShellPageHeader
				description={category.description ?? undefined}
				eyebrow="Food category"
				title={category.name}
			/>

			<Card>
				<CardHeader>
					<h2 className="font-semibold text-sm">Food items in this category</h2>
					<p className="text-muted-foreground text-xs">
						Created {toDateStringUTC(category.createdAt)}
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<DataTableSearch
						label="Search food items in this category"
						onSearchChange={(q) => applySearch({ q })}
						placeholder="Search by name"
						value={search.q}
					/>

					{isEmpty ? (
						<ShellEmptyState
							description={
								search.q
									? "No food item in this category matches this search."
									: "Nothing is filed under this category yet."
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
