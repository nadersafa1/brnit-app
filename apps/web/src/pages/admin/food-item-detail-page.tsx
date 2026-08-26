import type { FoodItemDto } from "@brnit/api";
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
import { Badge } from "@brnit/ui/components/badge";
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
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { FoodItemForm } from "@/components/admin/food-item-form";
import Loader from "@/components/loader";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useDeleteFoodItemMutation } from "@/hooks/use-food-item-mutations";
import { foodCategoryPickerQueryOptions } from "@/lib/api/queries/food-categories";
import { foodItemQueryOptions } from "@/lib/api/queries/food-items";
import { formatFoodUnitLabel } from "@/lib/food-unit-display";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/admin/food-items/$foodItemId";
const LIST_PATH = "/dashboard/admin/food-items";
/** Matches the `max-h-56` frame the image is drawn into. */
const IMAGE_FRAME_HEIGHT = 224;
const IMAGE_FRAME_WIDTH = 448;

function MacroRow({
	label,
	value,
}: Readonly<{ label: string; value: string | number }>) {
	return (
		<div className="flex items-baseline justify-between gap-4 border-border border-b py-2 last:border-b-0">
			<span className="text-muted-foreground text-sm">{label}</span>
			<span className="font-semibold tabular-nums">{value}</span>
		</div>
	);
}

function FoodItemSummary({ item }: Readonly<{ item: FoodItemDto }>) {
	return (
		<Card>
			<CardHeader className="gap-2">
				<div className="flex flex-wrap gap-1.5">
					{item.categories.length > 0 ? (
						item.categories.map((category) => (
							<Badge key={category.id} variant="secondary">
								{category.name}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground text-sm">No categories</span>
					)}
				</div>
			</CardHeader>
			<CardContent className="grid gap-6 sm:grid-cols-2">
				<div>
					<MacroRow label="Calories" value={`${item.calories} kcal`} />
					<MacroRow label="Protein" value={`${item.protein} g`} />
					<MacroRow label="Carbs" value={`${item.carbs} g`} />
					<MacroRow label="Fat" value={`${item.fat} g`} />
					<MacroRow label="Unit" value={formatFoodUnitLabel(item.unit)} />
					{item.unit === "100g" ? null : (
						<MacroRow label="Grams per unit" value={item.gramsPerUnit ?? "–"} />
					)}
				</div>
				{item.imageUrl ? (
					<figure className="space-y-2">
						{/*
						 * Explicit dimensions reserve the box before the image loads, so
						 * the macro list beside it does not jump. Cloudinary assets vary in
						 * aspect ratio, which is what `object-contain` is for — the
						 * attributes size the frame, not the picture.
						 */}
						<img
							alt={item.name}
							className="max-h-56 w-full rounded-xl bg-card-alt object-contain"
							height={IMAGE_FRAME_HEIGHT}
							src={item.imageUrl}
							width={IMAGE_FRAME_WIDTH}
						/>
						<figcaption className="text-muted-foreground text-xs">
							<a
								className="underline underline-offset-4"
								href={item.imageUrl}
								rel="noopener"
								target="_blank"
							>
								Open the full image
							</a>
						</figcaption>
					</figure>
				) : null}
			</CardContent>
		</Card>
	);
}

/**
 * The detail + multipart-edit template.
 *
 * Editing happens in a dialog over the read-only summary rather than on a
 * separate route: the form is the same component the list's create dialog
 * mounts, so a field added there appears in both without a second edit.
 */
export function FoodItemDetailPage() {
	const { foodItemId } = useParams({ from: ROUTE_ID });
	const navigate = useNavigate();
	const [isEditOpen, setEditOpen] = useState(false);
	const [isDeleteOpen, setDeleteOpen] = useState(false);

	const foodItemQuery = useQuery(foodItemQueryOptions("admin", foodItemId));
	const categoriesQuery = useQuery(foodCategoryPickerQueryOptions("admin"));
	const deleteMutation = useDeleteFoodItemMutation(foodItemId);

	const backLink = (
		<Button render={<Link to={LIST_PATH} />} size="sm" variant="ghost">
			<ArrowLeftIcon aria-hidden />
			Back to food items
		</Button>
	);

	if (foodItemQuery.isPending) {
		return (
			<ShellPage width="mediumWide">
				<Skeleton className="h-9 w-40" />
				<Skeleton className="h-64 w-full" />
			</ShellPage>
		);
	}

	if (foodItemQuery.isError || !foodItemQuery.data) {
		return (
			<ShellPage width="mediumWide">
				{backLink}
				<Card className="border-destructive/40">
					<CardContent className="space-y-3 p-6">
						<p className="text-destructive text-sm" role="alert">
							{getUserFacingErrorMessage(
								foodItemQuery.error,
								"This food item could not be loaded."
							)}
						</p>
						<Button
							onClick={() => foodItemQuery.refetch()}
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

	const item = foodItemQuery.data;

	const confirmDelete = async () => {
		await deleteMutation.mutateAsync();
		setDeleteOpen(false);
		navigate({ to: LIST_PATH });
	};

	return (
		<ShellPage width="mediumWide">
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
				eyebrow="Food item"
				title={item.name}
			/>

			<FoodItemSummary item={item} />

			<Dialog onOpenChange={setEditOpen} open={isEditOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit food item</DialogTitle>
						<DialogDescription>
							Changes are blocked while the item is referenced by a meal, an
							override or a logged consumption.
						</DialogDescription>
					</DialogHeader>
					{categoriesQuery.isPending ? (
						<Loader />
					) : (
						<FoodItemForm
							categories={categoriesQuery.data?.data ?? []}
							item={item}
							onCancel={() => setEditOpen(false)}
							onSaved={() => setEditOpen(false)}
						/>
					)}
				</DialogContent>
			</Dialog>

			<AlertDialog onOpenChange={setDeleteOpen} open={isDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{item.name}”?</AlertDialogTitle>
						<AlertDialogDescription>
							This cannot be undone. The item is kept if any meal, override or
							logged consumption still references it.
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
