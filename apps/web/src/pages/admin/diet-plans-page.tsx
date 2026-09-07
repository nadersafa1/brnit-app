import type { DietPlanListItemDto } from "@brnit/api";
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
	CalendarRangeIcon,
	MoreHorizontalIcon,
	PlusIcon,
	SquareArrowOutUpRightIcon,
	Trash2Icon,
} from "lucide-react";
import { useState } from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { SortableColumnHeader } from "@/components/data-table/sortable-column-header";
import { CatalogDetailsForm } from "@/components/nutrition/catalog-details-form";
import { ShellEmptyState } from "@/components/shell/shell-empty-state";
import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { useDietPlanForm } from "@/hooks/use-diet-plan-form";
import { dietPlansQueryOptions } from "@/lib/api/queries/diet-plans";
import type { CatalogListSearch } from "@/lib/catalog-list-search";

const ROUTE_ID = "/dashboard/admin/diet-plans/";
const DETAIL_ROUTE = "/dashboard/admin/diet-plans/$dietPlanId";
const SKELETON_ROWS = 6;
const COLUMN_COUNT = 5;
const FIRST_PAGE = 1;
const SINGLE_SLOT = 1;

/** `slotCount` is computed server-side, so a plan with no slots still reads "0 slots". */
function formatSlotCount(slotCount: number): string {
	return `${slotCount} ${slotCount === SINGLE_SLOT ? "slot" : "slots"}`;
}

function DietPlanRow({
	onDelete,
	onOpen,
	plan,
}: Readonly<{
	onDelete: (dietPlanId: string) => void;
	onOpen: (dietPlanId: string) => void;
	plan: DietPlanListItemDto;
}>) {
	return (
		<TableRow className="cursor-pointer" onClick={() => onOpen(plan.id)}>
			<TableCell>
				<Link
					className="font-medium text-foreground outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-accent"
					params={{ dietPlanId: plan.id }}
					to={DETAIL_ROUTE}
				>
					{plan.name}
				</Link>
			</TableCell>
			<TableCell className="max-w-md truncate text-muted-foreground">
				{plan.description ?? "–"}
			</TableCell>
			<TableCell className="tabular-nums">
				{formatSlotCount(plan.slotCount)}
			</TableCell>
			<TableCell className="text-muted-foreground tabular-nums">
				{toDateStringUTC(plan.createdAt)}
			</TableCell>
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
							<SquareArrowOutUpRightIcon aria-hidden />
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

/** Mounted only while open, so the create dialog starts blank each time. */
function CreateDietPlanForm({ onSaved }: Readonly<{ onSaved: () => void }>) {
	const { form, isSaving, onSubmit } = useDietPlanForm({
		onSaved,
		plan: null,
		scope: "admin",
	});

	return (
		<CatalogDetailsForm
			descriptionPlaceholder="Optional. Who this plan is for and how it runs."
			form={form}
			idPrefix="create-diet-plan"
			isSaving={isSaving}
			namePlaceholder="e.g. 7-day cleanse"
			onCancel={onSaved}
			onSubmit={onSubmit}
			submitLabel="Create diet plan"
		/>
	);
}

/**
 * The global diet-plan catalog.
 *
 * A plan is a set of **slots** — which meal, on which day, at which time — and
 * `slotCount` is the only aggregate the list needs. Slots themselves are edited
 * on the plan's own page.
 *
 * Delete deep-links to the detail page rather than confirming here: a plan with
 * any assignment is undeletable and answers **409**, and the detail page is
 * where that refusal can be shown next to what the plan contains.
 */
export function DietPlansPage() {
	const search = useSearch({ from: ROUTE_ID });
	const navigate = useNavigate({ from: ROUTE_ID });
	const [isCreateOpen, setCreateOpen] = useState(false);

	const dietPlansQuery = useQuery(dietPlansQueryOptions("admin", search));

	/** Any filter change resets to page 1 — page 7 of a new filter is meaningless. */
	const applySearch = (next: Partial<CatalogListSearch>) => {
		navigate({
			search: (current) => ({ ...current, page: FIRST_PAGE, ...next }),
		});
	};

	const openDietPlan = (dietPlanId: string) => {
		navigate({ params: { dietPlanId }, to: DETAIL_ROUTE });
	};

	const deleteDietPlan = (dietPlanId: string) => {
		navigate({
			params: { dietPlanId },
			search: { delete: true },
			to: DETAIL_ROUTE,
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
				description="Reusable plans of meal slots. Assigning a plan to a member freezes it — clone a plan to change one that is in use."
				eyebrow="Admin"
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
							action={
								search.q ? null : (
									<Button onClick={() => setCreateOpen(true)} size="sm">
										<PlusIcon aria-hidden />
										New diet plan
									</Button>
								)
							}
							description={
								search.q
									? "No diet plan matches this search. Try different words."
									: "Create a plan, then add the meals that make up its days."
							}
							icon={CalendarRangeIcon}
							title="No diet plans"
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
										<TableHead>Slots</TableHead>
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
									{dietPlansQuery.isPending
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
													onDelete={deleteDietPlan}
													onOpen={openDietPlan}
													plan={plan}
												/>
											))}
								</TableBody>
							</Table>
						</div>
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

			<Dialog onOpenChange={setCreateOpen} open={isCreateOpen}>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>New diet plan</DialogTitle>
						<DialogDescription>
							A plan starts with no slots — add the meals on the plan&apos;s own
							page once it exists.
						</DialogDescription>
					</DialogHeader>
					{isCreateOpen ? (
						<CreateDietPlanForm onSaved={() => setCreateOpen(false)} />
					) : null}
				</DialogContent>
			</Dialog>
		</ShellPage>
	);
}
