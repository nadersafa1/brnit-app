import type { FoodCategoryDto } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@brnit/ui/components/dropdown-menu";
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
import {
	MoreHorizontalIcon,
	PencilIcon,
	PlusIcon,
	TagsIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useFoodCategoryForm } from "@/hooks/use-food-category-form";
import { foodCategoriesQueryOptions } from "@/lib/api/queries/food-categories";
import type { CatalogListSearch } from "@/lib/catalog-list-search";

const ROUTE_ID = "/dashboard/admin/categories/";
const DETAIL_ROUTE = "/dashboard/admin/categories/$foodCategoryId";
const SKELETON_ROWS = 6;
const COLUMN_COUNT = 4;
const FIRST_PAGE = 1;

function CategoryRow({
	category,
	onDelete,
	onOpen,
}: Readonly<{
	category: FoodCategoryDto;
	onDelete: (foodCategoryId: string) => void;
	onOpen: (foodCategoryId: string) => void;
}>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(category.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ foodCategoryId: category.id }}
					to={DETAIL_ROUTE}
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
			<TableCell onClick={(event) => event.stopPropagation()}>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {category.name}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onOpen(category.id)}>
							<PencilIcon aria-hidden />
							Open
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(category.id)}
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

/** The create dialog's body — mounted only while open so it starts blank each time. */
function CreateCategoryForm({ onSaved }: Readonly<{ onSaved: () => void }>) {
	const { form, isSaving, onSubmit } = useFoodCategoryForm({
		category: null,
		onSaved,
	});

	return (
		<CatalogDetailsForm
			descriptionPlaceholder="Optional. Shown wherever the category appears."
			form={form}
			idPrefix="create-food-category"
			isSaving={isSaving}
			namePlaceholder="e.g. Vegetables"
			onCancel={onSaved}
			onSubmit={onSubmit}
			submitLabel="Create category"
		/>
	);
}

/**
 * The global food-category catalog.
 *
 * **All table state lives in the URL** — page, page size, search and sort are
 * search params, so a filtered view is shareable and the back button walks
 * through it. Search matches the name *or* the description, which is why the
 * placeholder says both.
 *
 * Delete is not offered in place: the row action deep-links to the detail page
 * with `?delete`, where the category's own food items are on screen. That
 * matters because a category still in use answers **409**, and the list has no
 * way to show which items are blocking it.
 */
export function FoodCategoriesPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isCreateOpen, setCreateOpen] = useState(false);

	const categoriesQuery = useQuery(foodCategoriesQueryOptions("admin", search));

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<CatalogListSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const openCategory = (foodCategoryId: string) => {
		navigate({ params: { foodCategoryId }, to: DETAIL_ROUTE });
	};

	const deleteCategory = (foodCategoryId: string) => {
		navigate({
			params: { foodCategoryId },
			search: { delete: true },
			to: DETAIL_ROUTE,
		});
	};

	const categories = categoriesQuery.data?.data ?? [];
	const pagination = categoriesQuery.data?.pagination;
	const isEmpty = !categoriesQuery.isPending && categories.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				actions={
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<PlusIcon aria-hidden />
						New category
					</Button>
				}
				description="The global category catalog. Every food item belongs to at least one category."
				eyebrow="Admin"
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
							action={
								search.q ? null : (
									<Button onClick={() => setCreateOpen(true)} size="sm">
										<PlusIcon aria-hidden />
										New category
									</Button>
								)
							}
							description={
								search.q
									? "No category matches this search. Try different words."
									: "Add the first category to start filing food items."
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
										<TableHead className="w-12">
											<span className="sr-only">Actions</span>
										</TableHead>
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
													onDelete={deleteCategory}
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

			<Dialog onOpenChange={setCreateOpen} open={isCreateOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New food category</DialogTitle>
						<DialogDescription>
							Categories group the food catalog and drive the food-item filter.
						</DialogDescription>
					</DialogHeader>
					{isCreateOpen ? (
						<CreateCategoryForm onSaved={() => setCreateOpen(false)} />
					) : null}
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
