import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Platform, Pressable, StyleSheet, type ViewStyle } from 'react-native'
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated'

import { useAppTheme } from '@/hooks/use-app-theme'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

type ThemeToggleProps = {
  /** `iconButton`: same footprint as header action chips (e.g. next to notifications). */
  variant?: 'minimal' | 'iconButton'
  style?: ViewStyle
}

export function ThemeToggle({ variant = 'minimal', style }: Readonly<ThemeToggleProps>) {
  const { toggleTheme, isLight } = useAppTheme()
  const colors = useColors()
  const elevation = useShadows()

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    toggleTheme()
  }

  const isIconButton = variant === 'iconButton'

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        isIconButton ? styles.iconButton : styles.minimal,
        isIconButton && {
          backgroundColor: colors.card,
          opacity: pressed ? 0.85 : 1,
          ...elevation.sm,
        },
        style,
      ]}
    >
      {isLight ? (
        <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
          <Ionicons name="moon" size={20} color={colors.ink} />
        </Animated.View>
      ) : (
        <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
          <Ionicons name="sunny" size={20} color={colors.ink} />
        </Animated.View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  minimal: {
    paddingHorizontal: spacing[2.5],
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
