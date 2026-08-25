import { Button } from "@brnit/ui/components/button";
import { Card, CardContent } from "@brnit/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { PlusIcon, SaladIcon } from "lucide-react";
import { useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { NutritionistMealsTable } from "@/components/nutritionist/meals-table";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useMealForm } from "@/hooks/use-meal-form";
import { useCloneMealMutation } from "@/hooks/use-meal-mutations";
import { mealsQueryOptions } from "@/lib/api/queries/meals";
import type { CatalogListSearch } from "@/lib/catalog-list-search";

const ROUTE_ID = "/dashboard/nutritionist/meals/";
const FIRST_PAGE = 1;

function CreateMealDialog({
	onOpenChange,
	open,
}: Readonly<{ onOpenChange: (open: boolean) => void; open: boolean }>) {
	const { form, isSaving, onSubmit } = useMealForm({
		meal: null,
		onSaved: () => onOpenChange(false),
		scope: "nutritionist",
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New meal</DialogTitle>
					<DialogDescription>
						A meal starts empty — open it afterwards to add food items, which is
						what gives it its macros.
					</DialogDescription>
				</DialogHeader>
				<CatalogDetailsForm
					descriptionPlaceholder="What this meal is for"
					form={form}
					idPrefix="new-meal"
					isSaving={isSaving}
					namePlaceholder="e.g. Breakfast bowl"
					onCancel={() => onOpenChange(false)}
					onSubmit={onSubmit}
					submitLabel="Create meal"
				/>
			</DialogContent>
		</Dialog>
	);
}

/** Meals are a global catalog: the nutritionist tree has the same full CRUD as admin. */
export function NutritionistMealsPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isCreateOpen, setCreateOpen] = useState(false);

	const mealsQuery = useQuery(mealsQueryOptions("nutritionist", search));
	const cloneMutation = useCloneMealMutation("nutritionist");

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<CatalogListSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	/** Cloning opens the copy, which is the only way to tell the two apart. */
	const cloneMeal = async (mealId: string) => {
		const clone = await cloneMutation.mutateAsync(mealId);
		navigate({
			params: { mealId: clone.id },
			search: { delete: false },
			to: "/dashboard/nutritionist/meals/$mealId",
		});
	};

	const meals = mealsQuery.data?.data ?? [];
	const pagination = mealsQuery.data?.pagination;
	const isEmpty = !mealsQuery.isPending && meals.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				actions={
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<PlusIcon aria-hidden />
						New meal
					</Button>
				}
				description="Reusable meals built from the food catalog. Totals are recomputed by the server whenever a meal's items change."
				eyebrow="Nutritionist"
				title="Meals"
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					<DataTableSearch
						label="Search meals"
						onSearchChange={(q) => applySearch({ q })}
						placeholder="Search by name"
						value={search.q}
					/>

					{isEmpty ? (
						<ShellEmptyState
							description={
								search.q
									? "No meal matches this search."
									: "Create the first meal, then add food items to it."
							}
							icon={SaladIcon}
							title="No meals"
						/>
					) : (
						<NutritionistMealsTable
							isCloning={cloneMutation.isPending}
							isPending={mealsQuery.isPending}
							meals={meals}
							onClone={cloneMeal}
							onSortChange={(sortBy, sortOrder) =>
								applySearch({ sortBy, sortOrder })
							}
							sortBy={search.sortBy}
							sortOrder={search.sortOrder}
						/>
					)}

					{pagination ? (
						<DataTablePagination
							itemLabel="meals"
							onPageChange={(page) =>
								navigate({ search: (current) => ({ ...current, page }) })
							}
							onPerPageChange={(perPage) => applySearch({ perPage })}
							pagination={pagination}
						/>
					) : null}
				</CardContent>
			</Card>

			<CreateMealDialog onOpenChange={setCreateOpen} open={isCreateOpen} />
		</ShellPage>
	);
}
