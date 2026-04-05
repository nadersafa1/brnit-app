import { StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import type { CongratulationsStep } from '@/lib/onboarding/types'

type Props = {
  step: CongratulationsStep
}

const HIGHLIGHTS = [
  {
    icon: 'checkmark-circle' as const,
    title: 'Profile Complete',
    description: 'Your answers have been saved.',
  },
  {
    icon: 'person' as const,
    title: 'Admin Review',
    description: 'Your coach will assign a plan based on your profile.',
  },
  {
    icon: 'rocket' as const,
    title: 'Ready to Go',
    description: 'Start tracking once your plan is assigned.',
  },
]

export function CongratulationsBody({ step }: Readonly<Props>) {
  const colors = useColors()

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.iconWrap}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </View>
      </Animated.View>

      <View style={styles.highlights}>
        {HIGHLIGHTS.map((item, i) => (
          <Animated.View
            key={item.title}
            entering={FadeInDown.delay(300 + i * 150).duration(500)}
            style={[styles.highlightCard, { backgroundColor: colors.card }]}
          >
            <Ionicons name={item.icon} size={22} color={colors.accent} />
            <View style={styles.highlightText}>
              <Text size="sm" weight="semibold">
                {item.title}
              </Text>
              <Text size="xs" muted>
                {item.description}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
  },
  iconWrap: {
    marginBottom: spacing[6],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlights: {
    width: '100%',
    gap: spacing[3],
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.md,
  },
  highlightText: {
    flex: 1,
    gap: 2,
  },
})
