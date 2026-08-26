import type { MealDto } from "@brnit/api";
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
	CopyIcon,
	MoreHorizontalIcon,
	PlusIcon,
	SaladIcon,
	SquareArrowOutUpRightIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { formatMacro } from "@/components/nutrition/nutrition-macros";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useMealForm } from "@/hooks/use-meal-form";
import { useCloneMealMutation } from "@/hooks/use-meal-mutations";
import { mealsQueryOptions } from "@/lib/api/queries/meals";
import type { CatalogListSearch } from "@/lib/catalog-list-search";

const ROUTE_ID = "/dashboard/admin/meals/";
const DETAIL_ROUTE = "/dashboard/admin/meals/$mealId";
const SKELETON_ROWS = 6;
const COLUMN_COUNT = 8;
const FIRST_PAGE = 1;

/** The four persisted totals, narrowed so the cells stay `number` without a cast. */
type MealTotalKey =
	| "totalCalories"
	| "totalCarbs"
	| "totalFat"
	| "totalProtein";

const MACRO_COLUMNS = [
	{ key: "totalCalories", label: "Kcal" },
	{ key: "totalProtein", label: "Protein" },
	{ key: "totalCarbs", label: "Carbs" },
	{ key: "totalFat", label: "Fat" },
] as const satisfies readonly { key: MealTotalKey; label: string }[];

interface MealRowActions {
	onClone: (mealId: string) => void;
	onDelete: (mealId: string) => void;
	onOpen: (mealId: string) => void;
}

function MealRow({
	actions,
	isCloning,
	meal,
}: Readonly<{
	actions: MealRowActions;
	isCloning: boolean;
	meal: MealDto;
}>) {
	return (
		<TableRow
			className="cursor-pointer"
			onClick={() => actions.onOpen(meal.id)}
		>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ mealId: meal.id }}
					to={DETAIL_ROUTE}
				>
					{meal.name}
				</Link>
			</TableCell>
			<TableCell className="max-w-xs truncate text-muted-foreground">
				{meal.description ?? "–"}
			</TableCell>
			{MACRO_COLUMNS.map((macro) => (
				<TableCell className="text-right tabular-nums" key={macro.key}>
					{formatMacro(meal[macro.key])}
				</TableCell>
			))}
			<TableCell className="text-muted-foreground tabular-nums">
				{toDateStringUTC(meal.createdAt)}
			</TableCell>
			<TableCell onClick={(event) => event.stopPropagation()}>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {meal.name}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => actions.onOpen(meal.id)}>
							<SquareArrowOutUpRightIcon aria-hidden />
							Open
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={isCloning}
							onClick={() => actions.onClone(meal.id)}
						>
							<CopyIcon aria-hidden />
							Clone
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => actions.onDelete(meal.id)}
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

/** Mounted only while open, so the create dialog starts blank each time. */
function CreateMealForm({ onSaved }: Readonly<{ onSaved: () => void }>) {
	const { form, isSaving, onSubmit } = useMealForm({
		meal: null,
		onSaved,
		scope: "admin",
	});

	return (
		<CatalogDetailsForm
			descriptionPlaceholder="Optional. A short note about this meal."
			form={form}
			idPrefix="create-meal"
			isSaving={isSaving}
			namePlaceholder="e.g. Breakfast bowl"
			onCancel={onSaved}
			onSubmit={onSubmit}
			submitLabel="Create meal"
		/>
	);
}

/**
 * The global meal catalog.
 *
 * The macro columns are the meal's **persisted** totals, recomputed server-side
 * whenever a line changes and rounded to 2dp — this screen never adds them up
 * itself, so a row and the meal's own page can never disagree.
 *
 * Cloning is a server action (`POST /meals/:id/clone`): the copy is named
 * `"{name} clone"`, truncated to fit the 255-character limit, and belongs to no
 * diet plan. The new meal opens straight away, which is the point of cloning.
 *
 * Delete deep-links to the detail page rather than confirming here, because a
 * meal that still holds items or sits in a plan answers **409** — and the
 * detail page is where those items are visible.
 */
export function MealsPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isCreateOpen, setCreateOpen] = useState(false);

	const mealsQuery = useQuery(mealsQueryOptions("admin", search));
	const cloneMutation = useCloneMealMutation("admin");

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<CatalogListSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const openMeal = (mealId: string) => {
		navigate({ params: { mealId }, to: DETAIL_ROUTE });
	};

	const rowActions: MealRowActions = {
		onClone: (mealId) => {
			cloneMutation.mutate(mealId, {
				onSuccess: (created) => openMeal(created.id),
			});
		},
		onDelete: (mealId) => {
			navigate({
				params: { mealId },
				search: { delete: true },
				to: DETAIL_ROUTE,
			});
		},
		onOpen: openMeal,
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
				description="Meals are reusable sets of food items. Totals are recomputed by the server whenever a line changes."
				eyebrow="Admin"
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
							action={
								search.q ? null : (
									<Button onClick={() => setCreateOpen(true)} size="sm">
										<PlusIcon aria-hidden />
										New meal
									</Button>
								)
							}
							description={
								search.q
									? "No meal matches this search. Try different words."
									: "Create a meal, then add food items to it."
							}
							icon={SaladIcon}
							title="No meals"
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
										{MACRO_COLUMNS.map((macro) => (
											<TableHead className="text-right" key={macro.key}>
												{macro.label}
											</TableHead>
										))}
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
									{mealsQuery.isPending
										? Array.from({ length: SKELETON_ROWS }, (_, index) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
												<TableRow key={`skeleton-${index}`}>
													<TableCell colSpan={COLUMN_COUNT}>
														<Skeleton className="h-6 w-full" />
													</TableCell>
												</TableRow>
											))
										: meals.map((meal) => (
												<MealRow
													actions={rowActions}
													isCloning={cloneMutation.isPending}
													key={meal.id}
													meal={meal}
												/>
											))}
								</TableBody>
							</Table>
						</div>
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

			<Dialog onOpenChange={setCreateOpen} open={isCreateOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New meal</DialogTitle>
						<DialogDescription>
							A meal starts empty — add its food items on the meal&apos;s own
							page once it exists.
						</DialogDescription>
					</DialogHeader>
					{isCreateOpen ? (
						<CreateMealForm onSaved={() => setCreateOpen(false)} />
					) : null}
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
