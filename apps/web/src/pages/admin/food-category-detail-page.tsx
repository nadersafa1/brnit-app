import type { FoodCategoryDto } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent, CardHeader } from "@brnit/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { Skeleton } from "@brnit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	Link,
	useNavigate,
	useParams,
	useSearch,
} from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { AdminFoodItemsTable } from "@/components/admin/admin-food-items-table";
import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { FoodItemForm } from "@/components/admin/food-item-form";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import Loader from "@/components/loader";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useFoodCategoryForm } from "@/hooks/use-food-category-form";
import { useDeleteFoodCategoryMutation } from "@/hooks/use-food-category-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import {
	foodCategoryPickerQueryOptions,
	foodCategoryQueryOptions,
} from "@/lib/api/queries/food-categories";
import { foodItemsQueryOptions } from "@/lib/api/queries/food-items";
import type { FoodCategoryDetailSearch } from "@/lib/food-category-detail-search";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/admin/categories/$foodCategoryId";
const LIST_PATH = "/dashboard/admin/categories";
const FIRST_PAGE = 1;

function CategorySummary({
	category,
}: Readonly<{ category: FoodCategoryDto }>) {
	return (
		<Card>
			<CardContent className="space-y-3 p-5">
				<p className="text-sm leading-relaxed">
					{category.description ?? (
						<span className="text-muted-foreground">No description</span>
					)}
				</p>
				<p className="text-muted-foreground text-xs">
					Created {toDateStringUTC(category.createdAt)}
				</p>
			</CardContent>
		</Card>
	);
}

/** Mounted only while the dialog is open, so it reseeds from the live category. */
function EditCategoryForm({
	category,
	onCancel,
	onSaved,
}: Readonly<{
	category: FoodCategoryDto;
	onCancel: () => void;
	onSaved: () => void;
}>) {
	const { form, isSaving, onSubmit } = useFoodCategoryForm({
		category,
		onSaved,
	});

	return (
		<CatalogDetailsForm
			descriptionPlaceholder="Optional. Shown wherever the category appears."
			form={form}
			idPrefix="edit-food-category"
			isSaving={isSaving}
			namePlaceholder="e.g. Vegetables"
			onCancel={onCancel}
			onSubmit={onSubmit}
			submitLabel="Save changes"
		/>
	);
}

/**
 * One category, plus the food items filed under it.
 *
 * The items table pages and sorts through the **same** search params the
 * food-items list uses, so the parser is shared; only `categoryId` is
 * overridden, because here the category is the path.
 *
 * Deleting answers **409** while any item still references the category — the
 * confirmation stays open and names that, with the blocking items already on
 * screen below it.
 */
export function FoodCategoryDetailPage() {
	const { foodCategoryId } = useParams({ from: ROUTE_ID });
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isEditOpen, setEditOpen] = useState(false);
	const [isCreateItemOpen, setCreateItemOpen] = useState(false);

	const categoryQuery = useQuery(
		foodCategoryQueryOptions("admin", foodCategoryId)
	);
	const foodItemsQuery = useQuery(
		foodItemsQueryOptions("admin", { ...search, categoryId: foodCategoryId })
	);
	const categoriesQuery = useQuery(foodCategoryPickerQueryOptions("admin"));
	const deleteMutation = useDeleteFoodCategoryMutation(foodCategoryId);

	const applySearch = (next: Partial<FoodCategoryDetailSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	/** The dialog is URL state, so `?delete` deep-links into it and Back closes it. */
	const setDeleteOpen = (open: boolean) => {
		navigate({
			search: (current) => ({ ...current, delete: open ? true : undefined }),
		});
	};

	const backLink = (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to categories
		</Button>
	);

	if (categoryQuery.isPending) {
		return (
			<ShellPage>
				<Skeleton className="h-9 w-40" />
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
	const isItemsEmpty = !foodItemsQuery.isPending && items.length === 0;

	const confirmDelete = () => {
		deleteMutation.mutate(undefined, {
			onSuccess: () => navigate({ to: LIST_PATH }),
		});
	};

	return (
		<ShellPage>
			{backLink}
			<ShellPageHeader
				actions={
					<>
						<Button
							onClick={() => setEditOpen(true)}
							size="sm"
							variant="outline"
						>
							<PencilIcon aria-hidden />
							Edit
						</Button>
						<Button
							onClick={() => setDeleteOpen(true)}
							size="sm"
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Delete
						</Button>
					</>
				}
				eyebrow="Food category"
				title={category.name}
			/>

			<CategorySummary category={category} />

			<Card>
				<CardHeader className="flex flex-row items-center justify-between gap-4">
					<h2 className="font-semibold text-sm">Food items in this category</h2>
					<Button
						onClick={() => setCreateItemOpen(true)}
						size="sm"
						variant="outline"
					>
						<PlusIcon aria-hidden />
						New food item
					</Button>
				</CardHeader>
				<CardContent className="space-y-4">
					<DataTableSearch
						label="Search food items in this category"
						onSearchChange={(q) => applySearch({ q })}
						placeholder="Search by name"
						value={search.q}
					/>

					{isItemsEmpty ? (
						<ShellEmptyState
							description={
								search.q
									? "No food item in this category matches this search."
									: "Nothing is filed under this category yet."
							}
							title="No food items"
						/>
					) : (
						<AdminFoodItemsTable
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

			<Dialog onOpenChange={setEditOpen} open={isEditOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit food category</DialogTitle>
						<DialogDescription>
							The name and description are replaced outright — both fields are
							saved as they read here.
						</DialogDescription>
					</DialogHeader>
					{isEditOpen ? (
						<EditCategoryForm
							category={category}
							onCancel={() => setEditOpen(false)}
							onSaved={() => setEditOpen(false)}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<Dialog onOpenChange={setCreateItemOpen} open={isCreateItemOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New food item</DialogTitle>
						<DialogDescription>
							Tick “{category.name}” below to file the new item under this
							category. Macros are per unit: per 100 g for `100g`, per single
							item for everything else.
						</DialogDescription>
					</DialogHeader>
					{categoriesQuery.isPending ? (
						<Loader />
					) : (
						<FoodItemForm
							categories={categoriesQuery.data?.data ?? []}
							item={null}
							onCancel={() => setCreateItemOpen(false)}
							onSaved={() => setCreateItemOpen(false)}
						/>
					)}
				</DialogContent>
			</Dialog>

			<DeleteConfirmDialog
				conflictMessage={readConflictMessage(deleteMutation.error)}
				description={`Delete “${category.name}”? This cannot be undone. Food items filed under it must be moved or removed first.`}
				isDeleting={deleteMutation.isPending}
				onConfirm={confirmDelete}
				onOpenChange={setDeleteOpen}
				open={search.delete}
				title="Delete food category"
			/>
		</ShellPage>
	);
}
