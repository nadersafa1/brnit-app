/**
 * Bottom sheet that shows full InBody-style details for a selected assessment.
 * Controlled by parent: open when assessment is set, onClose clears selection.
 */
import { useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { View, StyleSheet, Image } from 'react-native'
import { AppBottomSheet, type AppBottomSheetRef } from '@/components/bottom-sheet'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import type { RecentAssessmentItem } from '@/lib/api/recent-assessments'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

type AssessmentDetailSheetProps = Readonly<{
  assessment: RecentAssessmentItem | null
  onClose: () => void
}>

// --- Helpers: metric list from assessment (only non-null values) ---

type MetricEntry = { label: string; value: number; unit?: string }

function getMetricEntries(assessment: RecentAssessmentItem): MetricEntry[] {
  const entries: MetricEntry[] = []
  if (assessment.weightKg != null) entries.push({ label: 'Weight', value: assessment.weightKg, unit: 'kg' })
  if (assessment.heightCm != null) entries.push({ label: 'Height', value: assessment.heightCm, unit: 'cm' })
  if (assessment.bmi != null) entries.push({ label: 'BMI', value: assessment.bmi })
  if (assessment.bodyFatPercent != null)
    entries.push({ label: 'Body fat', value: assessment.bodyFatPercent, unit: '%' })
  if (assessment.muscleMassKg != null)
    entries.push({ label: 'Muscle mass', value: assessment.muscleMassKg, unit: 'kg' })
  if (assessment.visceralFatAreaCm2 != null)
    entries.push({ label: 'Visceral fat area', value: assessment.visceralFatAreaCm2, unit: 'cm²' })
  if (assessment.bodyWaterL != null)
    entries.push({ label: 'Body water', value: assessment.bodyWaterL, unit: 'L' })
  return entries
}

function formatMetricValue(value: number, unit?: string): string {
  if (unit === undefined || unit === null) return String(value)
  return `${value} ${unit}`
}

// --- Presentational: single metric row ---

function MetricRow({ label, value, unit }: Readonly<MetricEntry>) {
  return (
    <View style={styles.metricRow}>
      <Text size="sm" muted>{label}</Text>
      <Text size="base" weight="semibold">{formatMetricValue(value, unit)}</Text>
    </View>
  )
}

// --- Presentational: sheet body when an assessment is selected ---

function AssessmentDetailContent({ assessment }: Readonly<{ assessment: RecentAssessmentItem }>) {
  const colors = useColors()
  const metricEntries = getMetricEntries(assessment)

  return (
    <View style={styles.content}>
      <View style={[styles.orgRow, { borderBottomColor: colors.border }]}>
        <Text size="sm" muted>Organization</Text>
        <Text size="base" weight="semibold">{assessment.organization.name}</Text>
      </View>

      {assessment.imageUrl ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: assessment.imageUrl }}
            style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        </View>
      ) : null}

      <View style={styles.metrics}>
        {metricEntries.map((entry) => (
          <MetricRow key={entry.label} label={entry.label} value={entry.value} unit={entry.unit} />
        ))}
      </View>
    </View>
  )
}

// --- Main sheet (open/close + header) ---

export function AssessmentDetailSheet({ assessment, onClose }: AssessmentDetailSheetProps) {
  const ref = useRef<AppBottomSheetRef>(null)

  useEffect(() => {
    if (assessment == null) {
      ref.current?.close()
    } else {
      ref.current?.open(1)
    }
  }, [assessment])

  const headerTitle =
    assessment == null ? 'Assessment details' : dayjs(assessment.assessedAt).format('MMM D, YYYY')

  return (
    <AppBottomSheet ref={ref} onClose={onClose} headerTitle={headerTitle}>
      {assessment ? <AssessmentDetailContent assessment={assessment} /> : null}
    </AppBottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing[2],
  },
  orgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    marginBottom: spacing[4],
  },
  imageWrap: {
    marginBottom: spacing[4],
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  metrics: {
    gap: spacing[3],
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
