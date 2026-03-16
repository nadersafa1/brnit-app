import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { useConsumptionStreak } from '@/hooks/use-consumption-streak'
import { useRecentAssessments } from '@/hooks/use-recent-assessments'
import { useOrganizationLeaderboard } from '@/hooks/use-organization-leaderboard'
import { OrgPickerModal } from '@/components/stats/org-picker-modal'
import { RecentAssessmentsSection } from '@/components/stats/recent-assessments-section'
import { LeaderboardSection } from '@/components/stats/leaderboard-section'
import { CurrentStreakCard } from '@/components/stats/current-streak-card'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { ApiError } from '@/lib/api/types'

const RECENT_ASSESSMENTS_LIMIT = 5

/**
 * Stats tab: organization picker, recent assessments, leaderboard (by body-fat % drop),
 * and current consumption streak. Uses session active org from Better Auth.
 */
export default function Stats() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const [orgPickerVisible, setOrgPickerVisible] = useState(false)

  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: orgsList, isPending: orgsLoading } = authClient.useListOrganizations()
  const organizations = (orgsList ?? []).map((o) => ({ id: o.id, name: o.name }))
  const selectedOrgId = activeOrg?.id ?? null

  // When user has only one org, set it as active so leaderboard and assessments load.
  useEffect(() => {
    if (organizations.length === 1 && selectedOrgId === null) {
      authClient.organization.setActive({ organizationId: organizations[0].id })
    }
  }, [organizations, selectedOrgId])

  const { data: assessmentsData, isLoading: assessmentsLoading } = useRecentAssessments({
    limit: RECENT_ASSESSMENTS_LIMIT,
    orgId: selectedOrgId,
  })

  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    error: leaderboardError,
    isError: leaderboardIsError,
  } = useOrganizationLeaderboard({
    orgId: selectedOrgId,
    enabled: !!selectedOrgId,
  })
  const isNoOrgError =
    leaderboardIsError &&
    leaderboardError instanceof ApiError &&
    leaderboardError.status === 400

  const { data: streakData, isLoading: streakLoading, error: streakError } = useConsumptionStreak()
  const selectedOrgName =
    activeOrg?.name ?? organizations.find((o) => o.id === selectedOrgId)?.name ?? null

  const handleSelectOrg = useCallback((id: string) => {
    authClient.organization.setActive({ organizationId: id })
    setOrgPickerVisible(false)
  }, [])

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 96,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text size="2xl" weight="bold" style={styles.title}>
          Statistics
        </Text>

        <Pressable
          style={[styles.orgPicker, { backgroundColor: colors.card }, shadows.sm]}
          onPress={() => setOrgPickerVisible(true)}
        >
          <Text size="sm" weight="medium" muted>
            Organization
          </Text>
          <View style={styles.orgPickerValue}>
            {orgsLoading ? (
              <ActivityIndicator size="small" color={colors.muted} />
            ) : (
              <Text
                size="base"
                weight="semibold"
                numberOfLines={1}
                style={selectedOrgName ? undefined : { color: colors.muted }}
              >
                {selectedOrgName ?? 'Select organization'}
              </Text>
            )}
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </View>
        </Pressable>

        <OrgPickerModal
          visible={orgPickerVisible}
          onClose={() => setOrgPickerVisible(false)}
          organizations={organizations}
          selectedOrgId={selectedOrgId}
          onSelect={handleSelectOrg}
          isLoading={orgsLoading}
        />

        <RecentAssessmentsSection
          assessments={assessmentsData?.assessments ?? []}
          isLoading={assessmentsLoading}
        />

        <LeaderboardSection
          selectedOrgId={selectedOrgId}
          data={leaderboardData}
          isLoading={leaderboardLoading}
          isError={leaderboardIsError}
          isNoOrgError={isNoOrgError}
        />

        <CurrentStreakCard
          streak={streakData?.streak ?? 0}
          isLoading={streakLoading}
          error={streakError}
        />
      </ScrollView>

      <BottomNav activeTab="stats" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeBlob: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: radii.pill,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[4],
  },
  title: {
    marginBottom: spacing[4],
  },
  orgPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    marginBottom: spacing[4],
  },
  orgPickerValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    justifyContent: 'flex-end',
  },
})
