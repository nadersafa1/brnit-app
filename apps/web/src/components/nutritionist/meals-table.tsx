import type { MealDto, SortOrder } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
import { Button } from "@brnit/ui/components/button";
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
import { Link, useNavigate } from "@tanstack/react-router";
import {
	CopyIcon,
	MoreHorizontalIcon,
	PencilIcon,
	Trash2Icon,
} from "lucide-react";

import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import { formatMacro } from "@/components/nutrition/nutrition-macros";
import type { MealSortBy } from "@/lib/api/queries/meals";

/**
 * The nutritionist meals grid.
 *
 * Rows link into the nutritionist tree, so this stays out of
 * `components/nutrition/**` — the presentational pieces shared with the admin
 * editor are the meal *detail* parts, which have no route of their own.
 *
 * "Delete" navigates to the detail page with `?delete` rather than confirming
 * here: that is where the meal's items are visible, and where a **409** — the
 * meal still has lines, or a plan uses it — has room to be explained.
 */

const SKELETON_ROWS = 6;
const COLUMN_COUNT = 8;

const MACRO_COLUMNS = [
	{ key: "totalCalories", label: "Kcal" },
	{ key: "totalProtein", label: "Protein" },
	{ key: "totalCarbs", label: "Carbs" },
	{ key: "totalFat", label: "Fat" },
] as const satisfies readonly { key: keyof MealDto; label: string }[];

interface MealRowProps {
	isCloning: boolean;
	meal: MealDto;
	onClone: (mealId: string) => void;
	onDelete: (mealId: string) => void;
	onOpen: (mealId: string) => void;
}

function MealRow({
	isCloning,
	meal,
	onClone,
	onDelete,
	onOpen,
}: Readonly<MealRowProps>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(meal.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ mealId: meal.id }}
					to="/dashboard/nutritionist/meals/$mealId"
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
			{/* Stops the row's own open-on-click from firing behind the menu. */}
			<TableCell onClick={(event) => event.stopPropagation()}>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {meal.name}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onOpen(meal.id)}>
							<PencilIcon aria-hidden />
							Open
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={isCloning}
							onClick={() => onClone(meal.id)}
						>
							<CopyIcon aria-hidden />
							Clone
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(meal.id)}
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

interface NutritionistMealsTableProps {
	isCloning: boolean;
	isPending: boolean;
	meals: readonly MealDto[];
	onClone: (mealId: string) => void;
	onSortChange: (sortBy: MealSortBy, sortOrder: SortOrder) => void;
	sortBy: MealSortBy;
	sortOrder: SortOrder;
}

export function NutritionistMealsTable({
	isCloning,
	isPending,
	meals,
	onClone,
	onSortChange,
	sortBy,
	sortOrder,
}: Readonly<NutritionistMealsTableProps>) {
	const navigate = useNavigate();

	const openMeal = (mealId: string) => {
		navigate({
			params: { mealId },
			search: { delete: false },
			to: "/dashboard/nutritionist/meals/$mealId",
		});
	};

	const confirmDelete = (mealId: string) => {
		navigate({
			params: { mealId },
			search: { delete: true },
			to: "/dashboard/nutritionist/meals/$mealId",
		});
	};

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<SortableColumnHeader
							column="name"
							label="Name"
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
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
							onSortChange={onSortChange}
							sortBy={sortBy}
							sortOrder={sortOrder}
						/>
						<TableHead className="w-12">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isPending
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
									isCloning={isCloning}
									key={meal.id}
									meal={meal}
									onClone={onClone}
									onDelete={confirmDelete}
									onOpen={openMeal}
								/>
							))}
				</TableBody>
			</Table>
		</div>
	);
}
