import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { Colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

interface MacroBarProps {
  label: string
  current: number
  goal: number
  color: 'accent' | 'info' | 'success'
  unit?: string
}

const colorMap = {
  accent: Colors.light.accent,
  info: Colors.light.info,
  success: Colors.light.success,
}

export function MacroBar({ label, current, goal, color, unit = 'g' }: MacroBarProps) {
  const colors = useColors()
  const progress = Math.min(current / goal, 1)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text size="xs" weight="semibold" style={{ color: colors.subtle }}>
          {label}
        </Text>
        <Text size="xs" weight="medium" muted>
          {current}/{goal}
          {unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progress,
            { backgroundColor: colorMap[color], width: `${progress * 100}%` },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: radii.pill,
  },
})
