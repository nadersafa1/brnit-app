import type { DietPlanAssignmentWithMealTimesDto } from "@brnit/api";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@brnit/ui/components/dialog";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";
import { useState } from "react";

import { AssignmentForm } from "@/components/organizations/assignment-form";
import { useDeleteDietPlanAssignmentMutation } from "@/hooks/use-organization-assignment-mutations";

const SKELETON_ROWS = 2;
const OVERRIDE_SUFFIX = "custom meal times";

interface MemberAssignmentsTableProps {
	assignments: readonly DietPlanAssignmentWithMealTimesDto[];
	isPending: boolean;
	memberId: string;
	/** Plan id -> name, so the table shows a plan rather than a uuid. */
	planNames: ReadonlyMap<string, string>;
}

/**
 * The plans a member holds, with the two edits the API supports: move the
 * window, and change the per-meal times.
 *
 * The plan itself is fixed once assigned — replacing it means removing the
 * assignment and creating another, which is also what keeps the org-wide
 * "one plan per day" rule checkable server-side.
 */
export function MemberAssignmentsTable({
	assignments,
	isPending,
	memberId,
	planNames,
}: Readonly<MemberAssignmentsTableProps>) {
	const [editTarget, setEditTarget] =
		useState<DietPlanAssignmentWithMealTimesDto | null>(null);
	const [deleteTarget, setDeleteTarget] =
		useState<DietPlanAssignmentWithMealTimesDto | null>(null);
	const deleteMutation = useDeleteDietPlanAssignmentMutation();

	if (isPending) {
		return (
			<div className="space-y-2">
				{Array.from({ length: SKELETON_ROWS }, (_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
					<Skeleton className="h-10 w-full" key={`assignment-${index}`} />
				))}
			</div>
		);
	}

	if (assignments.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No diet plan assigned yet. Assign an existing plan, or create one and
				assign it in the same step.
			</p>
		);
	}

	const confirmDelete = async () => {
		if (!deleteTarget) {
			return;
		}
		await deleteMutation.mutateAsync(deleteTarget.id);
		setDeleteTarget(null);
	};

	return (
		<>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Diet plan</TableHead>
							<TableHead>Start</TableHead>
							<TableHead>End</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{assignments.map((assignment) => (
							<TableRow key={assignment.id}>
								<TableCell>
									<span className="font-medium">
										{planNames.get(assignment.dietPlanId) ??
											assignment.dietPlanId}
									</span>
									{assignment.mealTimeOverrides.length > 0 ? (
										<p className="text-muted-foreground text-xs">
											{assignment.mealTimeOverrides.length} {OVERRIDE_SUFFIX}
										</p>
									) : null}
								</TableCell>
								<TableCell className="tabular-nums">
									{assignment.startDate}
								</TableCell>
								<TableCell className="tabular-nums">
									{assignment.endDate}
								</TableCell>
								<TableCell>
									<div className="flex flex-wrap gap-2">
										<Button
											onClick={() => setEditTarget(assignment)}
											size="sm"
											variant="outline"
										>
											Edit
										</Button>
										<Button
											onClick={() => setDeleteTarget(assignment)}
											size="sm"
											variant="ghost"
										>
											Remove
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Dialog
				onOpenChange={(next) => {
					if (!next) {
						setEditTarget(null);
					}
				}}
				open={editTarget !== null}
			>
				<DialogContent className="max-h-[90svh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit assignment</DialogTitle>
						<DialogDescription>
							Move the window or adjust the meal times. Clearing a time falls
							back to the plan's own schedule.
						</DialogDescription>
					</DialogHeader>
					{/* Remounted per row, so the form re-defaults to that assignment. */}
					{editTarget ? (
						<AssignmentForm
							assignment={editTarget}
							key={editTarget.id}
							memberId={memberId}
							onCancel={() => setEditTarget(null)}
							onSaved={() => setEditTarget(null)}
						/>
					) : null}
				</DialogContent>
			</Dialog>

			<AlertDialog
				onOpenChange={(next) => {
					if (!next) {
						setDeleteTarget(null);
					}
				}}
				open={deleteTarget !== null}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
						<AlertDialogDescription>
							This also deletes the meal consumptions and meal-time overrides
							recorded against it. It cannot be undone.
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
							{deleteMutation.isPending ? "Removing…" : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
