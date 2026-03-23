import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import type { FeatureStep } from '@/lib/onboarding/types'

type Props = {
  step: FeatureStep
}

const FEATURES = [
  {
    icon: 'nutrition-outline' as const,
    title: 'Personalized Diet Plans',
    description: 'Get meals tailored to your goals and preferences.',
  },
  {
    icon: 'barbell-outline' as const,
    title: 'Exercise Programs',
    description: 'Follow plans built for your fitness level.',
  },
  {
    icon: 'trophy-outline' as const,
    title: 'Leaderboard & Progress',
    description: 'Track body composition and compete with your team.',
  },
]

export function FeatureBody({ step }: Readonly<Props>) {
  const colors = useColors()

  return (
    <View style={styles.container}>
      <Animated.View
        entering={FadeIn.duration(600).delay(200)}
        style={styles.iconWrap}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
          <Ionicons
            name={(step.icon as any) ?? 'flame'}
            size={56}
            color={colors.white}
          />
        </View>
      </Animated.View>

      <View style={styles.features}>
        {FEATURES.map((feature, i) => (
          <Animated.View
            key={feature.title}
            entering={FadeIn.duration(400).delay(400 + i * 120)}
            style={[styles.featureCard, { backgroundColor: colors.card }]}
          >
            <Ionicons name={feature.icon} size={24} color={colors.accent} />
            <View style={styles.featureText}>
              <Text size="sm" weight="semibold">
                {feature.title}
              </Text>
              <Text size="xs" muted>
                {feature.description}
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
    marginBottom: spacing[8],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  features: {
    width: '100%',
    gap: spacing[3],
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.md,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
})
