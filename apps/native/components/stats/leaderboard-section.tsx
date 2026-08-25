import type { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import type { OrganizationLeaderboardResponse } from '@/lib/api/organization-leaderboard'

type LeaderboardSectionProps = Readonly<{
  selectedOrgId: string | null
  data: OrganizationLeaderboardResponse | null | undefined
  isLoading: boolean
  isError: boolean
  isNoOrgError: boolean
}>

function getEmptyMessage(
  selectedOrgId: string | null,
  isNoOrgError: boolean,
  isGenericError: boolean
): string | null {
  if (selectedOrgId === null) {
    return 'Select an organization to see the leaderboard'
  }
  if (isNoOrgError) {
    return "You're not a member of this organization."
  }
  if (isGenericError) {
    return 'Something went wrong. Try again.'
  }
  return null
}

function SelfRow({ data }: Readonly<{ data: OrganizationLeaderboardResponse }>) {
  const { self } = data
  if (self.eligibility === 'not_enough_assessments') {
    return (
      <Text size="sm" muted>
        You need at least 2 assessments to be ranked
      </Text>
    )
  }
  const rank = self.rank
  if (rank == null) return null

  let pointsPart: ReactNode = null
  if (self.fatLossPoints != null) {
    pointsPart = (
      <Text size="sm" muted>
        {' '}
        ({self.fatLossPoints > 0 ? '+' : ''}
        {self.fatLossPoints.toFixed(1)} pts)
      </Text>
    )
  }
  return (
    <Text size="base" weight="semibold">
      Your rank: #{rank}
      {pointsPart}
    </Text>
  )
}

export function LeaderboardSection({
  selectedOrgId,
  data: leaderboardData,
  isLoading,
  isError,
  isNoOrgError,
}: LeaderboardSectionProps) {
  const colors = useColors()
  const elevation = useShadows()
  const isGenericError = selectedOrgId !== null && isError && !isNoOrgError
  const emptyMessage = getEmptyMessage(selectedOrgId, isNoOrgError, isGenericError)
  const showContent = selectedOrgId != null && leaderboardData != null && !isError

  let body: ReactNode
  if (emptyMessage !== null) {
    body = (
      <Text size="sm" muted>
        {emptyMessage}
      </Text>
    )
  } else if (isLoading) {
    body = (
      <View style={styles.sectionLoading}>
        <Spinner size="sm" color={colors.muted} />
      </View>
    )
  } else if (showContent) {
    const topList =
      leaderboardData.top.length === 0 ? (
        <Text size="sm" muted>
          No rankings yet
        </Text>
      ) : (
        <View style={styles.leaderboardList}>
          {leaderboardData.top.map((entry) => (
            <View
              key={entry.memberId}
              style={[
                styles.leaderboardRow,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text size="sm" weight="bold" style={styles.rank}>
                #{entry.rank}
              </Text>
              <Text size="base" numberOfLines={1} style={styles.leaderName}>
                {entry.name}
              </Text>
              <Text size="sm" accent weight="semibold">
                {entry.fatLossPoints > 0 ? '+' : ''}
                {entry.fatLossPoints.toFixed(1)} pts
              </Text>
            </View>
          ))}
        </View>
      )
    body = (
      <>
        {topList}
        <View style={[styles.selfRow, { marginTop: spacing[3] }]}>
          <SelfRow data={leaderboardData} />
        </View>
      </>
    )
  } else {
    body = null
  }

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }, elevation.md]}>
      <Text size="lg" weight="bold" style={styles.sectionTitle}>
        Leaderboard
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
  leaderboardList: {
    gap: 0,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    gap: spacing[3],
  },
  rank: {
    minWidth: 28,
  },
  leaderName: {
    flex: 1,
  },
  selfRow: {
    paddingTop: spacing[2],
  },
})
