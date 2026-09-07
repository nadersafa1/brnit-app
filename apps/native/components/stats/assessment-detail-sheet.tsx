/**
 * Bottom sheet that shows full InBody-style details for a selected assessment.
 * Controlled by parent: open when assessment is set, onClose clears selection.
 */

import type { MemberAssessmentDto } from "@brnit/api";
import { useEffect, useRef } from "react";
import { Image, StyleSheet, View } from "react-native";
import {
	AppBottomSheet,
	type AppBottomSheetRef,
} from "@/components/bottom-sheet/app-bottom-sheet";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { formatMediumDate } from "@/lib/date/format-date";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

type AssessmentDetailSheetProps = Readonly<{
	assessment: MemberAssessmentDto | null;
	onClose: () => void;
}>;

/** Build metric list from assessment (only non-null values). */
interface MetricEntry {
	label: string;
	unit?: string;
	value: number;
}

function getMetricEntries(assessment: MemberAssessmentDto): MetricEntry[] {
	const entries: MetricEntry[] = [];
	if (assessment.weightKg != null) {
		entries.push({ label: "Weight", value: assessment.weightKg, unit: "kg" });
	}
	if (assessment.heightCm != null) {
		entries.push({ label: "Height", value: assessment.heightCm, unit: "cm" });
	}
	if (assessment.bmi != null) {
		entries.push({ label: "BMI", value: assessment.bmi });
	}
	if (assessment.bodyFatPercent != null) {
		entries.push({
			label: "Body fat",
			value: assessment.bodyFatPercent,
			unit: "%",
		});
	}
	if (assessment.muscleMassKg != null) {
		entries.push({
			label: "Muscle mass",
			value: assessment.muscleMassKg,
			unit: "kg",
		});
	}
	if (assessment.visceralFatAreaCm2 != null) {
		entries.push({
			label: "Visceral fat area",
			value: assessment.visceralFatAreaCm2,
			unit: "cm²",
		});
	}
	if (assessment.bodyWaterL != null) {
		entries.push({
			label: "Body water",
			value: assessment.bodyWaterL,
			unit: "L",
		});
	}
	return entries;
}

function formatMetricValue(value: number, unit?: string): string {
	if (unit === undefined || unit === null) {
		return String(value);
	}
	return `${value} ${unit}`;
}

function MetricRow({ label, value, unit }: Readonly<MetricEntry>) {
	return (
		<View style={styles.metricRow}>
			<Text muted size="sm">
				{label}
			</Text>
			<Text size="base" weight="semibold">
				{formatMetricValue(value, unit)}
			</Text>
		</View>
	);
}

function AssessmentDetailContent({
	assessment,
}: Readonly<{ assessment: MemberAssessmentDto }>) {
	const colors = useColors();
	const metricEntries = getMetricEntries(assessment);

	return (
		<View style={styles.content}>
			<View style={[styles.orgRow, { borderBottomColor: colors.border }]}>
				<Text muted size="sm">
					Organization
				</Text>
				<Text size="base" weight="semibold">
					{assessment.organization.name}
				</Text>
			</View>

			{assessment.imageUrl ? (
				<View style={styles.imageWrap}>
					<Image
						resizeMode="cover"
						source={{ uri: assessment.imageUrl }}
						style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
					/>
				</View>
			) : null}

			<View style={styles.metrics}>
				{metricEntries.map((entry) => (
					<MetricRow
						key={entry.label}
						label={entry.label}
						unit={entry.unit}
						value={entry.value}
					/>
				))}
			</View>
		</View>
	);
}

export function AssessmentDetailSheet({
	assessment,
	onClose,
}: AssessmentDetailSheetProps) {
	const ref = useRef<AppBottomSheetRef>(null);

	useEffect(() => {
		if (assessment == null) {
			ref.current?.close();
		} else {
			const frameId = requestAnimationFrame(() => {
				ref.current?.open(1);
			});
			return () => cancelAnimationFrame(frameId);
		}
	}, [assessment]);

	const headerTitle =
		assessment == null
			? "Assessment details"
			: formatMediumDate(new Date(assessment.assessedAt));

	return (
		<AppBottomSheet headerTitle={headerTitle} onClose={onClose} ref={ref}>
			{assessment ? <AssessmentDetailContent assessment={assessment} /> : null}
		</AppBottomSheet>
	);
}

const styles = StyleSheet.create({
	content: {
		paddingTop: spacing[2],
	},
	orgRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingBottom: spacing[3],
		borderBottomWidth: 1,
		marginBottom: spacing[4],
	},
	imageWrap: {
		marginBottom: spacing[4],
		borderRadius: radii.lg,
		overflow: "hidden",
	},
	image: {
		width: "100%",
		aspectRatio: 4 / 3,
	},
	metrics: {
		gap: spacing[3],
	},
	metricRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
});
