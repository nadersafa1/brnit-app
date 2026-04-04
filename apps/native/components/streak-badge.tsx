/**
 * Reusable streak display: flame icon + count.
 * Used in HomeProgressCard (header) and CurrentStreakCard.
 * Shows loading spinner in place of flame and "—" for count when loading or error.
 */

import { View, StyleSheet } from 'react-native'
import { FlameIcon, Spinner, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'

/** Active streak uses a larger flame; zero streak stays muted and smaller (previous Ionicons behavior). */
const FLAME_SIZE_ACTIVE = 28
const FLAME_SIZE_ZERO = 18

type TextSizeVariant = 'xl' | '3xl'

export type StreakBadgeProps = Readonly<{
  streak: number
  isLoading: boolean
  error: unknown
  /** Size of the streak number text. Default 'xl' for inline/compact use, '3xl' for emphasis. */
  numberSize?: TextSizeVariant
}>

export function StreakBadge({
  streak,
  isLoading,
  error,
  numberSize = 'xl'
}: StreakBadgeProps) {
  const colors = useColors()
  const isZeroStreak = streak === 0
  const flameSize = isZeroStreak ? FLAME_SIZE_ZERO : FLAME_SIZE_ACTIVE
  const accentColor = isZeroStreak ? colors.muted : colors.accent

  const displayValue = isLoading || error ? '—' : streak

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Spinner size='sm' color={colors.muted} />
      ) : (
        <FlameIcon size={flameSize} color={accentColor} />
      )}
      <Text size={numberSize} weight='bold' style={[styles.number, { color: accentColor }]}>
        {displayValue}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2]
  },
  number: {
    minWidth: 20
  }
})
