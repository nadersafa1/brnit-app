import { Ionicons } from '@expo/vector-icons'
import { Pressable, View, StyleSheet } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { Colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

interface MealCardProps {
  title: string
  calories: number
  time: string
  icon: keyof typeof Ionicons.glyphMap
  items: string[]
}

export function MealCard({ title, calories, time, icon, items }: MealCardProps) {
  const colors = useColors()

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.95 : 1 },
        shadows.sm,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name={icon} size={20} color={colors.accent} />
          </View>
          <View>
            <Text size="base" weight="semibold">
              {title}
            </Text>
            <Text size="xs" weight="medium" muted>
              {time}
            </Text>
          </View>
        </View>
        <View style={styles.caloriesContainer}>
          <Text size="base" weight="bold" accent>
            {calories}
          </Text>
          <Text size="xs" weight="medium" muted style={styles.kcalLabel}>
            kcal
          </Text>
        </View>
      </View>
      <Text size="sm" weight="medium" muted numberOfLines={1}>
        {items.join(' • ')}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kcalLabel: {
    marginLeft: spacing[0.5],
  },
})
