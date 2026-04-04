import { View, StyleSheet } from 'react-native'
import { StreakBadge } from '@/components/streak-badge'
import { Text } from '@/components/ui'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

type CurrentStreakCardProps = Readonly<{
  streak: number
  isLoading: boolean
  error: unknown
}>

/**
 * Card showing the user's current consumption streak (consecutive days with ≥1 logged meal).
 * Uses shared StreakBadge for the flame + count display.
 */
export function CurrentStreakCard({ streak, isLoading, error }: CurrentStreakCardProps) {
  const colors = useColors()
  const elevation = useShadows()

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, elevation.md]}>
      <View style={styles.streakRow}>
        <View>
          <Text size='lg' weight='bold'>
            Current Streak
          </Text>
          <Text size='sm' muted>
            Keep it going!
          </Text>
        </View>
        <StreakBadge
          streak={streak}
          isLoading={isLoading}
          error={error}
          numberSize='3xl'
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4]
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
})
