import type { MealDetailDto } from "@brnit/api";
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
import { Skeleton } from "@brnit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	Link,
	useNavigate,
	useParams,
	useSearch,
} from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { DeleteConfirmDialog } from "@/components/admin/delete-confirm-dialog";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { MealItemsCard } from "@/components/nutrition/meal-items-card";
import { MealNutritionSummary } from "@/components/nutrition/meal-nutrition-summary";
import { NutritionConflictNotice } from "@/components/nutrition/nutrition-conflict-notice";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useMealForm } from "@/hooks/use-meal-form";
import { useDeleteMealMutation } from "@/hooks/use-meal-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import { mealQueryOptions } from "@/lib/api/queries/meals";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/admin/meals/$mealId";
const LIST_PATH = "/dashboard/admin/meals";
const SCOPE = "admin" as const;

function MealMetadata({ meal }: Readonly<{ meal: MealDetailDto }>) {
	return (
		<Card>
			<CardContent className="space-y-3 p-5">
				<p className="text-sm leading-relaxed">
					{meal.description ?? (
						<span className="text-muted-foreground">No description</span>
					)}
				</p>
				<p className="text-muted-foreground text-xs">
					Created {toDateStringUTC(meal.createdAt)} · Updated{" "}
					{toDateStringUTC(meal.updatedAt)}
				</p>
			</CardContent>
		</Card>
	);
}

/** Mounted only while open, so the edit dialog reseeds from the live meal. */
function EditMealForm({
	meal,
	onCancel,
	onSaved,
}: Readonly<{
	meal: MealDetailDto;
	onCancel: () => void;
	onSaved: () => void;
}>) {
	const { conflictMessage, form, isSaving, onSubmit } = useMealForm({
		meal,
		onSaved,
		scope: SCOPE,
	});

	return (
		<>
			<NutritionConflictNotice message={conflictMessage} />
			<CatalogDetailsForm
				descriptionPlaceholder="Optional. A short note about this meal."
				form={form}
				idPrefix="edit-meal"
				isSaving={isSaving}
				namePlaceholder="e.g. Breakfast bowl"
				onCancel={onCancel}
				onSubmit={onSubmit}
				submitLabel="Save changes"
			/>
		</>
	);
}

/**
 * One meal: its metadata, its persisted nutrition totals, and its lines.
 *
 * Every line change is a `PATCH` against the live meal rather than a staged
 * form, because the server recomputes `meal.total_*` in the same transaction —
 * so the summary above the table is always the stored figure, never a client
 * estimate.
 *
 * Two different **409**s can land here and they mean different things, so they
 * are shown in different places: editing anything about a meal that belongs to
 * an assigned plan is refused (notice above the table, and inside the edit
 * dialog), while deleting a meal that still holds items or sits in a plan is
 * refused in the delete confirmation itself.
 */
export function MealDetailPage() {
	const { mealId } = useParams({ from: ROUTE_ID });
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });

	const [isEditOpen, setEditOpen] = useState(false);

	const mealQuery = useQuery(mealQueryOptions(SCOPE, mealId));
	const deleteMutation = useDeleteMealMutation(SCOPE, mealId);
	const mealItems = mealQuery.data?.mealItems ?? [];

	/** The dialog is URL state, so `?delete` deep-links into it and Back closes it. */
	const setDeleteOpen = (open: boolean) => {
		navigate({
			search: (current) => ({ ...current, delete: open ? true : undefined }),
		});
	};

	const backLink = (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to meals
		</Button>
	);

	if (mealQuery.isPending) {
		return (
			<ShellPage>
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-64 w-full" />
			</ShellPage>
		);
	}

	if (mealQuery.isError || !mealQuery.data) {
		return (
			<ShellPage>
				{backLink}
				<Card className="border-destructive/40">
					<CardContent className="space-y-3 p-6">
						<p className="text-destructive text-sm" role="alert">
							{getUserFacingErrorMessage(
								mealQuery.error,
								"This meal could not be loaded."
							)}
						</p>
						<Button
							onClick={() => mealQuery.refetch()}
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

	const meal = mealQuery.data;

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
							Edit meal
						</Button>
						<Button
							onClick={() => setDeleteOpen(true)}
							size="sm"
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Delete meal
						</Button>
					</>
				}
				eyebrow="Meal"
				title={meal.name}
			/>

			<MealMetadata meal={meal} />

			<MealNutritionSummary
				mealItems={mealItems}
				storedTotals={{
					calories: meal.totalCalories,
					carbs: meal.totalCarbs,
					fat: meal.totalFat,
					protein: meal.totalProtein,
				}}
			/>

			<MealItemsCard mealId={mealId} mealItems={mealItems} scope={SCOPE} />

			<Dialog onOpenChange={setEditOpen} open={isEditOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit meal</DialogTitle>
						<DialogDescription>
							Changes are blocked while the meal belongs to a diet plan that is
							assigned to somebody.
						</DialogDescription>
					</DialogHeader>
					{isEditOpen ? (
						<EditMealForm
							meal={meal}
							onCancel={() => setEditOpen(false)}
							onSaved={() => setEditOpen(false)}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<DeleteConfirmDialog
				conflictMessage={readConflictMessage(deleteMutation.error)}
				description={`Delete “${meal.name}”? This cannot be undone. A meal that still has food items, or that a diet plan uses, is kept.`}
				isDeleting={deleteMutation.isPending}
				onConfirm={confirmDelete}
				onOpenChange={setDeleteOpen}
				open={search.delete}
				title="Delete meal"
			/>
		</ShellPage>
	);
}
