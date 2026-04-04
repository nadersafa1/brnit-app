import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useRouter, useSegments } from 'expo-router'
import { useCallback, useEffect, useRef } from 'react'
import { Platform, Pressable, StyleSheet } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColorSchemeValue, useColors, useShadows } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import { fontSize as fontSizes, fontWeight as fontWeights } from '@/theme/typography'

type TabName = 'home' | 'search' | 'stats' | 'profile'

const TABS: {
  name: TabName
  icon: keyof typeof Ionicons.glyphMap
  label: string
}[] = [
  { name: 'home', icon: 'home', label: 'Home' },
  { name: 'search', icon: 'search-outline', label: 'Search' },
  { name: 'stats', icon: 'bar-chart-outline', label: 'Stats' },
  { name: 'profile', icon: 'person-outline', label: 'Profile' }
]

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const PILL_SPRING = { damping: 17, stiffness: 150, mass: 0.8 }

function pillSpringLayout() {
  return LinearTransition.springify()
    .damping(PILL_SPRING.damping)
    .stiffness(PILL_SPRING.stiffness)
    .mass(PILL_SPRING.mass)
}

interface NavItemProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  isActive: boolean
  onPress: () => void
  accentColor: string
  iconColor: string
}

function NavItem({ icon, label, isActive, onPress, accentColor, iconColor }: Readonly<NavItemProps>) {
  const scale = useSharedValue(1)
  const iconScale = useSharedValue(1)
  const pillOpacity = useSharedValue(isActive ? 1 : 0)
  const wasActive = useRef(isActive)

  useEffect(() => {
    pillOpacity.value = withTiming(isActive ? 1 : 0, { duration: 220 })

    if (isActive && !wasActive.current) {
      iconScale.value = withSequence(
        withSpring(1.25, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      )
    }
    wasActive.current = isActive
  }, [isActive, pillOpacity, iconScale])

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }))

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }]
  }))

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value
  }))

  const handlePressIn = () => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 220 })
  }

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 160 })
  }

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    onPress()
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      layout={pillSpringLayout()}
      style={[styles.navItem, pressAnimatedStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.pillBg, { backgroundColor: accentColor }, pillAnimatedStyle]} />

      <Animated.View
        style={[styles.navItemContent, isActive && styles.activeNavItemContent]}
        layout={pillSpringLayout()}
      >
        <Animated.View style={iconAnimatedStyle}>
          <Ionicons
            name={icon}
            size={isActive ? 18 : 22}
            color={isActive ? '#FFFFFF' : iconColor}
          />
        </Animated.View>
        {isActive && (
          <Animated.Text
            entering={FadeIn.duration(280).delay(60)}
            exiting={FadeOut.duration(120)}
            style={styles.label}
          >
            {label}
          </Animated.Text>
        )}
      </Animated.View>
    </AnimatedPressable>
  )
}

interface BottomNavProps {
  activeTab?: TabName
}

export function BottomNav({ activeTab }: Readonly<BottomNavProps>) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const segments = useSegments()
  const colors = useColors()
  const scheme = useColorSchemeValue()
  const elevation = useShadows()

  const currentTab = activeTab || (segments[1] as TabName) || 'home'
  const inactiveIconColor = scheme === 'dark' ? colors.muted : colors.white

  const navigate = useCallback(
    (tab: TabName) => {
      if (tab === currentTab) return
      const route = tab === 'home' ? '/(tabs)' : `/(tabs)/${tab}`
      router.push(route as any)
    },
    [currentTab, router]
  )

  return (
    <Animated.View style={[styles.container, { bottom: insets.bottom + 16, backgroundColor: colors.navPill }, elevation.md]}>
      {TABS.map(tab => (
        <NavItem
          key={tab.name}
          icon={tab.icon}
          label={tab.label}
          isActive={currentTab === tab.name}
          onPress={() => navigate(tab.name)}
          accentColor={colors.accent}
          iconColor={inactiveIconColor}
        />
      ))}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[2],
    borderRadius: radii.pill
  },
  navItem: {
    overflow: 'hidden',
    borderRadius: radii.pill
  },
  pillBg: {
    borderRadius: radii.pill
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    height: 42
  },
  activeNavItemContent: {
    paddingHorizontal: spacing[3],
    gap: spacing[1.5]
  },
  label: {
    color: '#FFFFFF',
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    lineHeight: 16
  }
})
