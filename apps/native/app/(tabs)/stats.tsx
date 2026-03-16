import { Ionicons } from '@expo/vector-icons'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { useConsumptionStreak } from '@/hooks/use-consumption-streak'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

const FLAME_SIZE_ACTIVE = 28
const FLAME_SIZE_ZERO = 18

export default function Stats() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { data, isLoading, error } = useConsumptionStreak()
  const streak = data?.streak ?? 0
  const isZeroStreak = streak === 0
  const flameSize = isZeroStreak ? FLAME_SIZE_ZERO : FLAME_SIZE_ACTIVE
  const flameColor = isZeroStreak ? colors.muted : colors.accent

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
        ]}
      >
        <Text size="2xl" weight="bold" style={styles.title}>
          Statistics
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }, shadows.md]}>
          <Text size="lg" weight="bold" style={styles.cardTitle}>
            This Week
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text size="2xl" weight="bold" accent>
                12,450
              </Text>
              <Text size="xs" muted>
                Calories
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text size="2xl" weight="bold" style={{ color: colors.info }}>
                520g
              </Text>
              <Text size="xs" muted>
                Carbs
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text size="2xl" weight="bold" style={{ color: colors.success }}>
                340g
              </Text>
              <Text size="xs" muted>
                Protein
              </Text>
            </View>
          </View>
        </View>

        {/* Current Streak: consecutive days with ≥1 logged meal (ending today). Zero streak = smaller, grey flame. */}
        <View style={[styles.card, { backgroundColor: colors.card }, shadows.md]}>
          <View style={styles.streakRow}>
            <View>
              <Text size="lg" weight="bold">
                Current Streak
              </Text>
              <Text size="sm" muted>
                Keep it going!
              </Text>
            </View>
            <View style={styles.streakValue}>
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.muted} />
              ) : (
                <Ionicons name="flame" size={flameSize} color={flameColor} />
              )}
              <Text
                size="3xl"
                weight="bold"
                style={[
                  styles.streakNumber,
                  { color: isZeroStreak ? colors.muted : colors.accent },
                ]}
              >
                {isLoading || error ? '—' : streak}
              </Text>
            </View>
          </View>
        </View>
      </View>

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
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  title: {
    marginBottom: spacing[6],
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  cardTitle: {
    marginBottom: spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakNumber: {
    marginLeft: spacing[2],
  },
})
