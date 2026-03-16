import { Ionicons } from '@expo/vector-icons'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

const FLAME_SIZE_ACTIVE = 28
const FLAME_SIZE_ZERO = 18

type CurrentStreakCardProps = Readonly<{
  streak: number
  isLoading: boolean
  error: unknown
}>

/**
 * Displays the user's current consumption streak (consecutive days with ≥1 logged meal).
 * Shows a smaller grey flame when streak is zero.
 */
export function CurrentStreakCard({
  streak,
  isLoading,
  error,
}: CurrentStreakCardProps) {
  const colors = useColors()
  const isZeroStreak = streak === 0
  const flameSize = isZeroStreak ? FLAME_SIZE_ZERO : FLAME_SIZE_ACTIVE
  const flameColor = isZeroStreak ? colors.muted : colors.accent
  const streakColor = isZeroStreak ? colors.muted : colors.accent

  return (
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
            style={[styles.streakNumber, { color: streakColor }]}
          >
            {isLoading || error ? '—' : streak}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
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
