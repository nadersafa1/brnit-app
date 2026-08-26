import type { FoodCategoryDto } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
import { Card, CardContent } from "@brnit/ui/components/card";
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
import { TagsIcon } from "lucide-react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { foodCategoriesQueryOptions } from "@/lib/api/queries/food-categories";
import type { CatalogListSearch } from "@/lib/catalog-list-search";

const ROUTE_ID = "/dashboard/nutritionist/categories/";
const SKELETON_ROWS = 6;
const COLUMN_COUNT = 3;
const FIRST_PAGE = 1;

function CategoryRow({
	category,
	onOpen,
}: Readonly<{
	category: FoodCategoryDto;
	onOpen: (foodCategoryId: string) => void;
}>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(category.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ foodCategoryId: category.id }}
					to="/dashboard/nutritionist/categories/$foodCategoryId"
				>
					{category.name}
				</Link>
			</TableCell>
			<TableCell className="max-w-md truncate text-muted-foreground">
				{category.description ?? "–"}
			</TableCell>
			<TableCell className="text-muted-foreground tabular-nums">
				{toDateStringUTC(category.createdAt)}
			</TableCell>
		</TableRow>
	);
}

/**
 * The nutritionist's view of the global category catalog — **read only**.
 *
 * Categories are owned by admins: this tree's endpoints are `GET`-only
 * (`docs/migration/api-surface.md` §5), so the screen offers no create, edit or
 * delete affordance at all rather than showing controls that would 403.
 */
export function NutritionistCategoriesPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });

	const categoriesQuery = useQuery(
		foodCategoriesQueryOptions("nutritionist", search)
	);

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<CatalogListSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const openCategory = (foodCategoryId: string) => {
		navigate({
			params: { foodCategoryId },
			to: "/dashboard/nutritionist/categories/$foodCategoryId",
		});
	};

	const categories = categoriesQuery.data?.data ?? [];
	const pagination = categoriesQuery.data?.pagination;
	const isEmpty = !categoriesQuery.isPending && categories.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				description="The global category catalog. Categories are maintained by admins; open one to see the food items filed under it."
				eyebrow="Nutritionist"
				title="Food categories"
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					<DataTableSearch
						label="Search food categories"
						onSearchChange={(q) => applySearch({ q })}
						placeholder="Search by name or description"
						value={search.q}
					/>

					{isEmpty ? (
						<ShellEmptyState
							description={
								search.q
									? "No category matches this search."
									: "No categories have been created yet."
							}
							icon={TagsIcon}
							title="No food categories"
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
										<TableHead>Description</TableHead>
										<SortableColumnHeader
											column="createdAt"
											label="Created"
											onSortChange={(sortBy, sortOrder) =>
												applySearch({ sortBy, sortOrder })
											}
											sortBy={search.sortBy}
											sortOrder={search.sortOrder}
										/>
									</TableRow>
								</TableHeader>
								<TableBody>
									{categoriesQuery.isPending
										? Array.from({ length: SKELETON_ROWS }, (_, index) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
												<TableRow key={`skeleton-${index}`}>
													<TableCell colSpan={COLUMN_COUNT}>
														<Skeleton className="h-6 w-full" />
													</TableCell>
												</TableRow>
											))
										: categories.map((category) => (
												<CategoryRow
													category={category}
													key={category.id}
													onOpen={openCategory}
												/>
											))}
								</TableBody>
							</Table>
						</div>
					)}

					{pagination ? (
						<DataTablePagination
							itemLabel="food categories"
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
