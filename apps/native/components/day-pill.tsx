import dayjs from 'dayjs'
import { Pressable, View, StyleSheet } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

interface DayPillProps {
  day: string
  date: Date
  isSelected?: boolean
  isCompleted?: boolean
  onPress?: () => void
}

export function DayPill({ day, date, isSelected, onPress }: DayPillProps) {
  const colors = useColors()
  const dateNumber = dayjs(date).date()

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Text
        size="xs"
        weight="medium"
        style={[styles.dayLabel, { color: isSelected ? colors.accent : colors.muted }]}
      >
        {day}
      </Text>
      <View
        style={[
          styles.pill,
          { backgroundColor: isSelected ? colors.accent : colors.surfaceAlt },
        ]}
      >
        <Text
          size="sm"
          weight="semibold"
          style={{ color: isSelected ? colors.white : colors.subtle }}
        >
          {dateNumber}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
    marginBottom: spacing[1],
  },
  pill: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
