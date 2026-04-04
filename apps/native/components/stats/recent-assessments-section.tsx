import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { Text } from '@/components/ui'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import type { RecentAssessmentItem } from '@/lib/api/recent-assessments'

type RecentAssessmentsSectionProps = Readonly<{
  assessments: RecentAssessmentItem[]
  isLoading: boolean
  onSelectAssessment?: (assessment: RecentAssessmentItem) => void
}>

/** Formats body fat and weight for list subtitle, e.g. "Body fat: 22% · 75 kg". */
function formatAssessmentMeta(a: RecentAssessmentItem): string {
  const parts: string[] = []
  if (a.bodyFatPercent != null) parts.push(`Body fat: ${a.bodyFatPercent}%`)
  if (a.weightKg != null) parts.push(`${a.weightKg} kg`)
  return parts.join(' · ')
}

/** Single assessment row: date, meta, org badge. Pressable when onSelect is provided. */
function AssessmentRow({
  assessment,
  onSelect,
}: Readonly<{
  assessment: RecentAssessmentItem
  onSelect?: (assessment: RecentAssessmentItem) => void
}>) {
  const colors = useColors()
  const meta = formatAssessmentMeta(assessment)

  const rowContent = (
    <View style={[styles.assessmentRow, { borderBottomColor: colors.border }]}>
      <View style={styles.assessmentMain}>
        <Text size="base" weight="semibold">
          {dayjs(assessment.assessedAt).format('MMM D, YYYY')}
        </Text>
        {meta ? (
          <View style={styles.assessmentMeta}>
            <Text size="sm" muted>{meta}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.orgBadge, { backgroundColor: colors.surfaceAlt }]}>
        <Text size="xs" muted numberOfLines={1}>
          {assessment.organization.name}
        </Text>
      </View>
    </View>
  )

  if (onSelect) {
    return (
      <Pressable
        onPress={() => onSelect(assessment)}
        style={({ pressed }) => (pressed ? styles.assessmentRowPressed : undefined)}
      >
        {rowContent}
      </Pressable>
    )
  }

  return rowContent
}

/** Lists recent body-composition assessments; supports opening a detail sheet on tap. */
export function RecentAssessmentsSection({
  assessments,
  isLoading,
  onSelectAssessment,
}: RecentAssessmentsSectionProps) {
  const colors = useColors()
  const elevation = useShadows()

  let body: ReactNode
  if (isLoading) {
    body = (
      <View style={styles.sectionLoading}>
        <ActivityIndicator size="small" color={colors.muted} />
      </View>
    )
  } else if (assessments.length === 0) {
    body = (
      <Text size="sm" muted>
        No assessments yet
      </Text>
    )
  } else {
    body = (
      <View style={styles.assessmentList}>
        {assessments.map((a) => (
          <AssessmentRow key={a.id} assessment={a} onSelect={onSelectAssessment} />
        ))}
      </View>
    )
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }, elevation.md]}>
      <Text size="lg" weight="bold" style={styles.sectionTitle}>
        Recent Assessments
      </Text>
      {body}
    </View>
  )
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
    alignItems: 'center',
  },
  assessmentList: {
    gap: 0,
  },
  assessmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
})
