import type { FoodItemDto } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
import { Badge } from "@brnit/ui/components/badge";
import { Button } from "@brnit/ui/components/button";
import { Card, CardContent, CardHeader } from "@brnit/ui/components/card";
import { Skeleton } from "@brnit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { foodItemQueryOptions } from "@/lib/api/queries/food-items";
import { formatFoodUnitLabel } from "@/lib/food-unit-display";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

const ROUTE_ID = "/dashboard/nutritionist/food-items/$foodItemId";
const LIST_PATH = "/dashboard/nutritionist/food-items";
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

/** Each category links to its own page, which lists the rest of the foods in it. */
function CategoryLinks({ item }: Readonly<{ item: FoodItemDto }>) {
	if (item.categories.length === 0) {
		return <span className="text-muted-foreground text-sm">No categories</span>;
	}
	return (
		<div className="flex flex-wrap gap-1.5">
			{item.categories.map((category) => (
				<Link
					className="outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand-accent"
					key={category.id}
					params={{ foodCategoryId: category.id }}
					to="/dashboard/nutritionist/categories/$foodCategoryId"
				>
					<Badge variant="secondary">{category.name}</Badge>
				</Link>
			))}
		</div>
	);
}

function FoodItemSummary({ item }: Readonly<{ item: FoodItemDto }>) {
	return (
		<Card>
			<CardHeader className="gap-2">
				<CategoryLinks item={item} />
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
					<MacroRow label="Created" value={toDateStringUTC(item.createdAt)} />
				</div>
				{item.imageUrl ? (
					<figure className="space-y-2">
						{/*
						 * Explicit dimensions reserve the box before the image loads, so
						 * the macro list beside it does not jump.
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
 * One food item, **read only**.
 *
 * The admin screen wraps this same summary in edit and delete dialogs; here
 * there is nothing to press, because the nutritionist tree serves food items as
 * `GET` only.
 */
export function NutritionistFoodItemDetailPage() {
	const { foodItemId } = useParams({ from: ROUTE_ID });
	const foodItemQuery = useQuery(
		foodItemQueryOptions("nutritionist", foodItemId)
	);

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

	return (
		<ShellPage width="mediumWide">
			{backLink}
			<ShellPageHeader eyebrow="Food item" title={item.name} />
			<FoodItemSummary item={item} />
		</ShellPage>
	);
}
