import type { AssessmentDto } from "@brnit/api";
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
import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";

import { formatAssessedAt } from "@/components/direct-admin/assessment-datetime";
import { ASSESSMENT_TABLE_METRICS } from "@/components/direct-admin/assessment-metrics";
import { useDeleteAssessmentMutation } from "@/hooks/use-assessment-mutations";

const SKELETON_ROWS = 4;
const COLUMN_COUNT = ASSESSMENT_TABLE_METRICS.length + 3;

function AssessmentRow({
	assessment,
	onDelete,
	onEdit,
}: Readonly<{
	assessment: AssessmentDto;
	onDelete: (assessment: AssessmentDto) => void;
	onEdit: (assessment: AssessmentDto) => void;
}>) {
	return (
		<TableRow>
			<TableCell className="whitespace-nowrap font-medium">
				{formatAssessedAt(assessment.assessedAt)}
			</TableCell>
			{ASSESSMENT_TABLE_METRICS.map((metric) => (
				<TableCell className="text-right tabular-nums" key={metric.name}>
					{assessment[metric.name]}
				</TableCell>
			))}
			<TableCell>
				{/* `imagePublicId` never reaches a client; `imageUrl` is the only handle. */}
				{assessment.imageUrl ? (
					<a
						className="underline underline-offset-4"
						href={assessment.imageUrl}
						rel="noopener"
						target="_blank"
					>
						View
					</a>
				) : (
					<span className="text-muted-foreground">—</span>
				)}
			</TableCell>
			<TableCell className="text-right">
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button size="icon-sm" variant="ghost" />}
					>
						<MoreHorizontalIcon aria-hidden />
						<span className="sr-only">
							Actions for {formatAssessedAt(assessment.assessedAt)}
						</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEdit(assessment)}>
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(assessment)}
							variant="destructive"
						>
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

interface AssessmentsTableProps {
	assessments: readonly AssessmentDto[];
	isPending: boolean;
	onEdit: (assessment: AssessmentDto) => void;
}

/**
 * One member's assessments, newest first, with the row actions a direct admin
 * has over them.
 *
 * Nothing is removed optimistically. The server destroys the Cloudinary asset
 * **before** the row, so a delete that fails halfway leaves the row in place —
 * the list re-reads and shows whatever actually survived rather than a row that
 * has visually disappeared but still exists.
 */
export function AssessmentsTable({
	assessments,
	isPending,
	onEdit,
}: Readonly<AssessmentsTableProps>) {
	const [deleteTarget, setDeleteTarget] = useState<AssessmentDto | null>(null);
	const deleteMutation = useDeleteAssessmentMutation();

	const confirmDelete = async () => {
		if (!deleteTarget) {
			return;
		}
		try {
			await deleteMutation.mutateAsync(deleteTarget.id);
		} catch {
			// The mutation toasts the server's reason. The row stays put.
			return;
		}
		setDeleteTarget(null);
	};

	return (
		<>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Assessed at</TableHead>
							{ASSESSMENT_TABLE_METRICS.map((metric) => (
								<TableHead className="text-right" key={metric.name}>
									{metric.label}
								</TableHead>
							))}
							<TableHead>Image</TableHead>
							<TableHead className="text-right">
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
							: assessments.map((assessment) => (
									<AssessmentRow
										assessment={assessment}
										key={assessment.id}
										onDelete={setDeleteTarget}
										onEdit={onEdit}
									/>
								))}
					</TableBody>
				</Table>
			</div>

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
						<AlertDialogTitle>Delete this assessment?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteTarget
								? `The assessment taken on ${formatAssessedAt(deleteTarget.assessedAt)} and its stored image are removed. This cannot be undone.`
								: null}
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
		</>
	);
}
