import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { Platform, Pressable, StyleSheet } from 'react-native'
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated'

import { useAppTheme } from '@/contexts/app-theme-context'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'

export function ThemeToggle() {
  const { toggleTheme, isLight } = useAppTheme()
  const colors = useColors()

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    toggleTheme()
  }

  return (
    <Pressable onPress={handlePress} style={styles.container}>
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
  container: {
    paddingHorizontal: spacing[2.5],
  },
})
