import type { MemberAssessmentDto } from "@brnit/api";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { formatMediumDate } from "@/lib/date/format-date";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

type RecentAssessmentsSectionProps = Readonly<{
	assessments: MemberAssessmentDto[];
	isLoading: boolean;
	onSelectAssessment?: (assessment: MemberAssessmentDto) => void;
}>;

/** Formats body fat and weight for list subtitle, e.g. "Body fat: 22% · 75 kg". */
function formatAssessmentMeta(a: MemberAssessmentDto): string {
	const parts: string[] = [];
	if (a.bodyFatPercent != null) {
		parts.push(`Body fat: ${a.bodyFatPercent}%`);
	}
	if (a.weightKg != null) {
		parts.push(`${a.weightKg} kg`);
	}
	return parts.join(" · ");
}

/** Single assessment row: date, meta, org badge. Pressable when onSelect is provided. */
function AssessmentRow({
	assessment,
	onSelect,
}: Readonly<{
	assessment: MemberAssessmentDto;
	onSelect?: (assessment: MemberAssessmentDto) => void;
}>) {
	const colors = useColors();
	const meta = formatAssessmentMeta(assessment);

	const rowContent = (
		<View style={[styles.assessmentRow, { borderBottomColor: colors.border }]}>
			<View style={styles.assessmentMain}>
				<Text size="base" weight="semibold">
					{formatMediumDate(new Date(assessment.assessedAt))}
				</Text>
				{meta ? (
					<View style={styles.assessmentMeta}>
						<Text muted size="sm">
							{meta}
						</Text>
					</View>
				) : null}
			</View>
			<View style={[styles.orgBadge, { backgroundColor: colors.surfaceAlt }]}>
				<Text muted numberOfLines={1} size="xs">
					{assessment.organization.name}
				</Text>
			</View>
		</View>
	);

	if (onSelect) {
		return (
			<Pressable
				onPress={() => onSelect(assessment)}
				style={({ pressed }) =>
					pressed ? styles.assessmentRowPressed : undefined
				}
			>
				{rowContent}
			</Pressable>
		);
	}

	return rowContent;
}

/** Lists recent body-composition assessments; supports opening a detail sheet on tap. */
export function RecentAssessmentsSection({
	assessments,
	isLoading,
	onSelectAssessment,
}: RecentAssessmentsSectionProps) {
	const colors = useColors();
	const elevation = useShadows();

	let body: ReactNode;
	if (isLoading) {
		body = (
			<View style={styles.sectionLoading}>
				<Spinner color={colors.muted} size="sm" />
			</View>
		);
	} else if (assessments.length === 0) {
		body = (
			<Text muted size="sm">
				No assessments yet
			</Text>
		);
	} else {
		body = (
			<View style={styles.assessmentList}>
				{assessments.map((a) => (
					<AssessmentRow
						assessment={a}
						key={a.id}
						onSelect={onSelectAssessment}
					/>
				))}
			</View>
		);
	}

	return (
		<View
			style={[
				styles.sectionCard,
				{ backgroundColor: colors.card },
				elevation.md,
			]}
		>
			<Text size="lg" style={styles.sectionTitle} weight="bold">
				Recent Assessments
			</Text>
			{body}
		</View>
	);
}

const styles = StyleSheet.create({
	sectionCard: {
		borderRadius: radii.xl,
		padding: spacing[5],
		marginBottom: spacing[4],
	},
	sectionTitle: {
		marginBottom: spacing[4],
	},
	sectionLoading: {
		paddingVertical: spacing[4],
		alignItems: "center",
	},
	assessmentList: {
		gap: 0,
	},
	assessmentRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: spacing[3],
		borderBottomWidth: 1,
	},
	assessmentMain: {
		flex: 1,
	},
	assessmentMeta: {
		marginTop: spacing[1],
	},
	orgBadge: {
		paddingHorizontal: spacing[2],
		paddingVertical: spacing[1],
		borderRadius: radii.sm,
		maxWidth: 120,
	},
	assessmentRowPressed: {
		opacity: 0.7,
	},
});
