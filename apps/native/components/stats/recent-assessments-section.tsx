import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import type { RecentAssessmentItem } from '@/lib/api/recent-assessments'

type RecentAssessmentsSectionProps = Readonly<{
  assessments: RecentAssessmentItem[]
  isLoading: boolean
}>

/** Formats body fat and weight for display, e.g. "Body fat: 22% · 75 kg". */
function formatAssessmentMeta(a: RecentAssessmentItem): string {
  const parts: string[] = []
  if (a.bodyFatPercent != null) parts.push(`Body fat: ${a.bodyFatPercent}%`)
  if (a.weightKg != null) parts.push(`${a.weightKg} kg`)
  return parts.join(' · ')
}

export function RecentAssessmentsSection({
  assessments,
  isLoading,
}: RecentAssessmentsSectionProps) {
  const colors = useColors()

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
        {assessments.map((a) => {
          const meta = formatAssessmentMeta(a)
          return (
            <View
              key={a.id}
              style={[styles.assessmentRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.assessmentMain}>
                <Text size="base" weight="semibold">
                  {dayjs(a.assessedAt).format('MMM D, YYYY')}
                </Text>
                {meta ? (
                  <View style={styles.assessmentMeta}>
                    <Text size="sm" muted>
                      {meta}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.orgBadge, { backgroundColor: colors.surfaceAlt }]}>
                <Text size="xs" muted numberOfLines={1}>
                  {a.organization.name}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }, shadows.md]}>
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
})
