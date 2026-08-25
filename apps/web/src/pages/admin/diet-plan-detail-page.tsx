import type { DietPlanDetailDto } from "@brnit/api";
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
import { DietPlanSlotsCard } from "@/components/nutrition/diet-plan-slots-card";
import { NutritionConflictNotice } from "@/components/nutrition/nutrition-conflict-notice";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useDietPlanForm } from "@/hooks/use-diet-plan-form";
import { useDeleteDietPlanMutation } from "@/hooks/use-diet-plan-mutations";
import { readConflictMessage } from "@/lib/api/conflict-error";
import { dietPlanQueryOptions } from "@/lib/api/queries/diet-plans";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/admin/diet-plans/$dietPlanId";
const LIST_PATH = "/dashboard/admin/diet-plans";
const SCOPE = "admin" as const;

function DietPlanMetadata({ plan }: Readonly<{ plan: DietPlanDetailDto }>) {
	return (
		<Card>
			<CardContent className="space-y-3 p-5">
				<p className="text-sm leading-relaxed">
					{plan.description ?? (
						<span className="text-muted-foreground">No description</span>
					)}
				</p>
				<p className="text-muted-foreground text-xs">
					Created {toDateStringUTC(plan.createdAt)} · Updated{" "}
					{toDateStringUTC(plan.updatedAt)}
				</p>
			</CardContent>
		</Card>
	);
}

/** Mounted only while open, so the edit dialog reseeds from the live plan. */
function EditDietPlanForm({
	onCancel,
	onSaved,
	plan,
}: Readonly<{
	onCancel: () => void;
	onSaved: () => void;
	plan: DietPlanDetailDto;
}>) {
	const { conflictMessage, form, isSaving, onSubmit } = useDietPlanForm({
		onSaved,
		plan,
		scope: SCOPE,
	});

	return (
		<>
			<NutritionConflictNotice message={conflictMessage} />
			<CatalogDetailsForm
				descriptionPlaceholder="Optional. Who this plan is for and how it runs."
				form={form}
				idPrefix="edit-diet-plan"
				isSaving={isSaving}
				namePlaceholder="e.g. 7-day cleanse"
				onCancel={onCancel}
				onSubmit={onSubmit}
				submitLabel="Save changes"
			/>
		</>
	);
}

/**
 * One diet plan: its metadata and its meal slots.
 *
 * A slot says *when* a meal is eaten — `dayNumber` `0` repeats it on every day
 * of the plan, `>= 1` pins it to that day; `mealType` is free text; the
 * optional `scheduledTime` is `HH:mm`. The meal's own lines belong to the meal
 * and change with it, which is why they are shown here read-only.
 *
 * **Once the plan has an assignment it is frozen** — the API refuses both the
 * metadata edit and every slot change with a 409, because consumption rows and
 * per-member overrides already point at these slots. The refusal is rendered as
 * a standing notice rather than a toast, since cloning the plan is the only way
 * forward. The API exposes no "is assigned" flag, so the notice appears on the
 * first refused write rather than before it.
 */
export function DietPlanDetailPage() {
	const { dietPlanId } = useParams({ from: ROUTE_ID });
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });

	const [isEditOpen, setEditOpen] = useState(false);

	const dietPlanQuery = useQuery(dietPlanQueryOptions(SCOPE, dietPlanId));
	const deleteMutation = useDeleteDietPlanMutation(SCOPE, dietPlanId);
	const slots = dietPlanQuery.data?.dietPlanMeals ?? [];

	/** The dialog is URL state, so `?delete` deep-links into it and Back closes it. */
	const setDeleteOpen = (open: boolean) => {
		navigate({
			search: (current) => ({ ...current, delete: open ? true : undefined }),
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
				eyebrow="Diet plan"
				title={plan.name}
			/>

			<DietPlanMetadata plan={plan} />

			<DietPlanSlotsCard dietPlanId={dietPlanId} scope={SCOPE} slots={slots} />

			<Dialog onOpenChange={setEditOpen} open={isEditOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit diet plan</DialogTitle>
						<DialogDescription>
							Changes are blocked once the plan is assigned to anybody — clone
							it instead.
						</DialogDescription>
					</DialogHeader>
					{isEditOpen ? (
						<EditDietPlanForm
							onCancel={() => setEditOpen(false)}
							onSaved={() => setEditOpen(false)}
							plan={plan}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<DeleteConfirmDialog
				conflictMessage={readConflictMessage(deleteMutation.error)}
				description={`Delete “${plan.name}”? This cannot be undone. A plan that is assigned to anybody is kept.`}
				isDeleting={deleteMutation.isPending}
				onConfirm={confirmDelete}
				onOpenChange={setDeleteOpen}
				open={search.delete}
				title="Delete diet plan"
			/>
		</ShellPage>
	);
}
