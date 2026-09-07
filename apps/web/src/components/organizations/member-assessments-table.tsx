import type { AssessmentDto } from "@brnit/api";
import { toDateStringUTC } from "@brnit/datetime";
import { Skeleton } from "@brnit/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@brnit/ui/components/table";

const SKELETON_ROWS = 3;
const EM_DASH = "—";

const METRIC_COLUMNS = [
	{ key: "weightKg", label: "Weight (kg)" },
	{ key: "bmi", label: "BMI" },
	{ key: "bodyFatPercent", label: "Body fat (%)" },
	{ key: "muscleMassKg", label: "Muscle (kg)" },
	{ key: "visceralFatAreaCm2", label: "Visceral fat" },
	{ key: "bodyWaterL", label: "Body water (L)" },
] as const satisfies readonly { key: keyof AssessmentDto; label: string }[];

interface MemberAssessmentsTableProps {
	assessments: readonly AssessmentDto[];
	isPending: boolean;
}

/**
 * Body-composition readings, newest first and **read-only**.
 *
 * Recording and editing them is a direct-admin job under
 * `/dashboard/direct-admin/members`; a nutritionist reads the same rows through
 * their own guard, which is why there is no row action here.
 *
 * The metrics stay strings: they arrive that way from the `numeric` columns and
 * are shown exactly as recorded, with no re-rounding on the way through.
 */
export function MemberAssessmentsTable({
	assessments,
	isPending,
}: Readonly<MemberAssessmentsTableProps>) {
	if (isPending) {
		return (
			<div className="space-y-2">
				{Array.from({ length: SKELETON_ROWS }, (_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder rows have no identity
					<Skeleton className="h-10 w-full" key={`assessment-${index}`} />
				))}
			</div>
		);
	}

	if (assessments.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				No assessments recorded for this member yet.
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Assessed</TableHead>
						{METRIC_COLUMNS.map((column) => (
							<TableHead className="text-right" key={column.key}>
								{column.label}
							</TableHead>
						))}
						<TableHead>Image</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{assessments.map((assessment) => (
						<TableRow key={assessment.id}>
							<TableCell className="tabular-nums">
								{toDateStringUTC(assessment.assessedAt)}
							</TableCell>
							{METRIC_COLUMNS.map((column) => (
								<TableCell className="text-right tabular-nums" key={column.key}>
									{assessment[column.key]}
								</TableCell>
							))}
							<TableCell>
								{assessment.imageUrl ? (
									<a
										className="text-accent-fg underline underline-offset-4"
										href={assessment.imageUrl}
										rel="noopener"
										target="_blank"
									>
										View
									</a>
								) : (
									EM_DASH
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
