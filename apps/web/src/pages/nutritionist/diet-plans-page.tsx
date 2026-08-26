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
import { CalendarRangeIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { NutritionistDietPlansTable } from "@/components/nutritionist/diet-plans-table";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useDietPlanForm } from "@/hooks/use-diet-plan-form";
import { dietPlansQueryOptions } from "@/lib/api/queries/diet-plans";
import type { CatalogListSearch } from "@/lib/catalog-list-search";

const ROUTE_ID = "/dashboard/nutritionist/diet-plans/";
const FIRST_PAGE = 1;

function CreateDietPlanDialog({
	onOpenChange,
	open,
}: Readonly<{ onOpenChange: (open: boolean) => void; open: boolean }>) {
	const { form, isSaving, onSubmit } = useDietPlanForm({
		onSaved: () => onOpenChange(false),
		plan: null,
		scope: "nutritionist",
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>New diet plan</DialogTitle>
					<DialogDescription>
						A plan starts with no slots — open it afterwards to schedule meals
						by day and meal type.
					</DialogDescription>
				</DialogHeader>
				<CatalogDetailsForm
					descriptionPlaceholder="Who this plan is for"
					form={form}
					idPrefix="new-diet-plan"
					isSaving={isSaving}
					namePlaceholder="e.g. 7-day cleanse"
					onCancel={() => onOpenChange(false)}
					onSubmit={onSubmit}
					submitLabel="Create diet plan"
				/>
			</DialogContent>
		</Dialog>
	);
}

/** Reusable plan templates. Assigning one to a member happens elsewhere. */
export function NutritionistDietPlansPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isCreateOpen, setCreateOpen] = useState(false);

	const dietPlansQuery = useQuery(
		dietPlansQueryOptions("nutritionist", search)
	);

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<CatalogListSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const plans = dietPlansQuery.data?.data ?? [];
	const pagination = dietPlansQuery.data?.pagination;
	const isEmpty = !dietPlansQuery.isPending && plans.length === 0;

	return (
		<ShellPage>
			<ShellPageHeader
				actions={
					<Button onClick={() => setCreateOpen(true)} size="sm">
						<PlusIcon aria-hidden />
						New diet plan
					</Button>
				}
				description="Plan templates built from meals. A plan becomes immutable once anybody is assigned to it — clone it to make a variant."
				eyebrow="Nutritionist"
				title="Diet plans"
			/>

			<Card>
				<CardContent className="space-y-4 p-4 sm:p-5">
					<DataTableSearch
						label="Search diet plans"
						onSearchChange={(q) => applySearch({ q })}
						placeholder="Search by name"
						value={search.q}
					/>

					{isEmpty ? (
						<ShellEmptyState
							description={
								search.q
									? "No diet plan matches this search."
									: "Create the first plan, then schedule meals into it."
							}
							icon={CalendarRangeIcon}
							title="No diet plans"
						/>
					) : (
						<NutritionistDietPlansTable
							isPending={dietPlansQuery.isPending}
							onSortChange={(sortBy, sortOrder) =>
								applySearch({ sortBy, sortOrder })
							}
							plans={plans}
							sortBy={search.sortBy}
							sortOrder={search.sortOrder}
						/>
					)}

					{pagination ? (
						<DataTablePagination
							itemLabel="diet plans"
							onPageChange={(page) =>
								navigate({ search: (current) => ({ ...current, page }) })
							}
							onPerPageChange={(perPage) => applySearch({ perPage })}
							pagination={pagination}
						/>
					) : null}
				</CardContent>
			</Card>

			<CreateDietPlanDialog onOpenChange={setCreateOpen} open={isCreateOpen} />
		</ShellPage>
	);
}
