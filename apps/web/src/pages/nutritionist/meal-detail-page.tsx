import type { MealDetailDto } from "@brnit/api";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@brnit/ui/components/alert-dialog";
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

const ROUTE_ID = "/dashboard/nutritionist/meals/$mealId";
const LIST_PATH = "/dashboard/nutritionist/meals";

function EditMealDialog({
	meal,
	onOpenChange,
	open,
}: Readonly<{
	meal: MealDetailDto;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}>) {
	const { conflictMessage, form, isSaving, onSubmit } = useMealForm({
		meal,
		onSaved: () => onOpenChange(false),
		scope: "nutritionist",
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit meal</DialogTitle>
					<DialogDescription>
						A meal inside a plan someone is already assigned to cannot be
						changed — clone it instead.
					</DialogDescription>
				</DialogHeader>
				<NutritionConflictNotice
					message={conflictMessage}
					title="This meal cannot be changed"
				/>
				<CatalogDetailsForm
					descriptionPlaceholder="What this meal is for"
					form={form}
					idPrefix="edit-meal"
					isSaving={isSaving}
					namePlaceholder="e.g. Breakfast bowl"
					onCancel={() => onOpenChange(false)}
					onSubmit={onSubmit}
					submitLabel="Save changes"
				/>
			</DialogContent>
		</Dialog>
	);
}

/**
 * One meal: its metadata, its stored totals, and its lines.
 *
 * The delete confirmation is driven by the `?delete` search param rather than
 * by local state, because the list's row action deep-links straight into it.
 *
 * Both writes on this screen can answer **409** — a meal in an assigned plan is
 * frozen, and a meal that still has lines or is used by a plan cannot be
 * deleted. Each refusal is rendered where the user pressed: the edit dialog
 * shows its own, and the delete refusal stays on the page, because the
 * confirmation dialog closes itself on the attempt.
 */
export function NutritionistMealDetailPage() {
	const { mealId } = useParams({ from: ROUTE_ID });
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isEditOpen, setEditOpen] = useState(false);

	const mealQuery = useQuery(mealQueryOptions("nutritionist", mealId));
	const deleteMutation = useDeleteMealMutation("nutritionist", mealId);

	const setDeleteOpen = (open: boolean) => {
		navigate({
			replace: true,
			search: (current) => ({ ...current, delete: open }),
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

	const confirmDelete = async () => {
		try {
			await deleteMutation.mutateAsync();
			setDeleteOpen(false);
			navigate({ to: LIST_PATH });
		} catch {
			// A 409 is expected here; the notice below the header names the blocker.
		}
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
				description={meal.description ?? undefined}
				eyebrow="Meal"
				title={meal.name}
			/>

			<NutritionConflictNotice
				message={readConflictMessage(deleteMutation.error)}
				title="This meal cannot be deleted"
			/>

			<MealNutritionSummary
				mealItems={meal.mealItems}
				storedTotals={{
					calories: meal.totalCalories,
					carbs: meal.totalCarbs,
					fat: meal.totalFat,
					protein: meal.totalProtein,
				}}
			/>

			<MealItemsCard
				mealId={mealId}
				mealItems={meal.mealItems}
				scope="nutritionist"
			/>

			<EditMealDialog
				meal={meal}
				onOpenChange={setEditOpen}
				open={isEditOpen}
			/>

			<AlertDialog onOpenChange={setDeleteOpen} open={search.delete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{meal.name}”?</AlertDialogTitle>
						<AlertDialogDescription>
							This cannot be undone. The meal is kept if it still has food items
							or if any diet plan uses it.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleteMutation.isPending}
							nativeButton
							onClick={confirmDelete}
							variant="destructive"
						>
							{deleteMutation.isPending ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</ShellPage>
	);
}
