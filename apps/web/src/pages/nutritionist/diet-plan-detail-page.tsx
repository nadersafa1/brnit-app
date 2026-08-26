import type { DietPlanDetailDto } from "@brnit/api";
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
import { DietPlanSlotsCard } from "@/components/nutrition/diet-plan-slots-card";
import { NutritionConflictNotice } from "@/components/nutrition/nutrition-conflict-notice";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useDietPlanForm } from "@/hooks/use-diet-plan-form";
import { useDeleteDietPlanMutation } from "@/hooks/use-diet-plan-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import { dietPlanQueryOptions } from "@/lib/api/queries/diet-plans";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/nutritionist/diet-plans/$dietPlanId";
const LIST_PATH = "/dashboard/nutritionist/diet-plans";

function EditDietPlanDialog({
	onOpenChange,
	open,
	plan,
}: Readonly<{
	onOpenChange: (open: boolean) => void;
	open: boolean;
	plan: DietPlanDetailDto;
}>) {
	const { conflictMessage, form, isSaving, onSubmit } = useDietPlanForm({
		onSaved: () => onOpenChange(false),
		plan,
		scope: "nutritionist",
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90svh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Edit diet plan</DialogTitle>
					<DialogDescription>
						A plan that anybody is assigned to is immutable — clone it to make a
						variant.
					</DialogDescription>
				</DialogHeader>
				<NutritionConflictNotice
					message={conflictMessage}
					title="This plan cannot be changed"
				/>
				<CatalogDetailsForm
					descriptionPlaceholder="Who this plan is for"
					form={form}
					idPrefix="edit-diet-plan"
					isSaving={isSaving}
					namePlaceholder="e.g. 7-day cleanse"
					onCancel={() => onOpenChange(false)}
					onSubmit={onSubmit}
					submitLabel="Save changes"
				/>
			</DialogContent>
		</Dialog>
	);
}

/**
 * One diet plan: its metadata and its meal slots.
 *
 * The delete confirmation is driven by the `?delete` search param, because the
 * list's row action deep-links straight into it.
 *
 * Editing *and* deleting answer **409** once the plan has any assignment —
 * consumption rows, meal-time overrides and food swaps all point at its slots.
 * The edit dialog shows its own refusal; the delete refusal stays on the page,
 * because the confirmation dialog closes itself on the attempt.
 */
export function NutritionistDietPlanDetailPage() {
	const { dietPlanId } = useParams({ from: ROUTE_ID });
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isEditOpen, setEditOpen] = useState(false);

	const dietPlanQuery = useQuery(
		dietPlanQueryOptions("nutritionist", dietPlanId)
	);
	const deleteMutation = useDeleteDietPlanMutation("nutritionist", dietPlanId);

	const setDeleteOpen = (open: boolean) => {
		navigate({
			replace: true,
			search: (current) => ({ ...current, delete: open }),
		});
	};

	const backLink = (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to diet plans
		</Button>
	);

	if (dietPlanQuery.isPending) {
		return (
			<ShellPage>
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-64 w-full" />
			</ShellPage>
		);
	}

	if (dietPlanQuery.isError || !dietPlanQuery.data) {
		return (
			<ShellPage>
				{backLink}
				<Card className="border-destructive/40">
					<CardContent className="space-y-3 p-6">
						<p className="text-destructive text-sm" role="alert">
							{getUserFacingErrorMessage(
								dietPlanQuery.error,
								"This diet plan could not be loaded."
							)}
						</p>
						<Button
							onClick={() => dietPlanQuery.refetch()}
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

	const plan = dietPlanQuery.data;

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
							Edit plan
						</Button>
						<Button
							onClick={() => setDeleteOpen(true)}
							size="sm"
							variant="destructive"
						>
							<Trash2Icon aria-hidden />
							Delete plan
						</Button>
					</>
				}
				description={plan.description ?? undefined}
				eyebrow="Diet plan"
				title={plan.name}
			/>

			<NutritionConflictNotice
				message={readConflictMessage(deleteMutation.error)}
				title="This plan cannot be deleted"
			/>

			<DietPlanSlotsCard
				dietPlanId={dietPlanId}
				scope="nutritionist"
				slots={plan.dietPlanMeals}
			/>

			<EditDietPlanDialog
				onOpenChange={setEditOpen}
				open={isEditOpen}
				plan={plan}
			/>

			<AlertDialog onOpenChange={setDeleteOpen} open={search.delete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{plan.name}”?</AlertDialogTitle>
						<AlertDialogDescription>
							This cannot be undone. The plan is kept if anybody is assigned to
							it.
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
