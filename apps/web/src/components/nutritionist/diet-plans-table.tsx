import type { DietPlanListItemDto, SortOrder } from "@brnit/api";
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
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import type { DietPlanSortBy } from "@/lib/api/queries/diet-plans";

/**
 * The nutritionist diet-plans grid.
 *
 * `slotCount` is computed server-side, so the list never loads a plan's slots
 * to count them.
 *
 * "Delete" deep-links to the detail page with `?delete`, where a **409** — the
 * plan is assigned, and therefore immutable — has somewhere to be explained.
 */

const SKELETON_ROWS = 6;
const COLUMN_COUNT = 5;

function slotCountLabel(slotCount: number): string {
	return `${slotCount} ${slotCount === 1 ? "slot" : "slots"}`;
}

interface DietPlanRowProps {
	onDelete: (dietPlanId: string) => void;
	onOpen: (dietPlanId: string) => void;
	plan: DietPlanListItemDto;
}

function DietPlanRow({ onDelete, onOpen, plan }: Readonly<DietPlanRowProps>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(plan.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ dietPlanId: plan.id }}
					to="/dashboard/nutritionist/diet-plans/$dietPlanId"
				>
					{plan.name}
				</Link>
			</TableCell>
			<TableCell className="max-w-md truncate text-muted-foreground">
				{plan.description ?? "–"}
			</TableCell>
			<TableCell className="tabular-nums">
				{slotCountLabel(plan.slotCount)}
			</TableCell>
			<TableCell className="text-muted-foreground tabular-nums">
				{toDateStringUTC(plan.createdAt)}
			</TableCell>
			{/* Stops the row's own open-on-click from firing behind the menu. */}
			<TableCell onClick={(event) => event.stopPropagation()}>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">Actions for {plan.name}</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onOpen(plan.id)}>
							<PencilIcon aria-hidden />
							Open
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(plan.id)}
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

interface NutritionistDietPlansTableProps {
	isPending: boolean;
	onSortChange: (sortBy: DietPlanSortBy, sortOrder: SortOrder) => void;
	plans: readonly DietPlanListItemDto[];
	sortBy: DietPlanSortBy;
	sortOrder: SortOrder;
}

export function NutritionistDietPlansTable({
	isPending,
	onSortChange,
	plans,
	sortBy,
	sortOrder,
}: Readonly<NutritionistDietPlansTableProps>) {
	const navigate = useNavigate();

	const openPlan = (dietPlanId: string) => {
		navigate({
			params: { dietPlanId },
			search: { delete: false },
			to: "/dashboard/nutritionist/diet-plans/$dietPlanId",
		});
	};

	const confirmDelete = (dietPlanId: string) => {
		navigate({
			params: { dietPlanId },
			search: { delete: true },
			to: "/dashboard/nutritionist/diet-plans/$dietPlanId",
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
						<TableHead>Slots</TableHead>
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
						: plans.map((plan) => (
								<DietPlanRow
									key={plan.id}
									onDelete={confirmDelete}
									onOpen={openPlan}
									plan={plan}
								/>
							))}
				</TableBody>
			</Table>
		</div>
	);
}
