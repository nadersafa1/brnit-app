import { type PropsWithChildren } from 'react'
import { ScrollView, View, StyleSheet, type ViewProps, ViewStyle } from 'react-native'
import Animated, { type AnimatedProps } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '@/hooks/use-theme-color'

const AnimatedView = Animated.createAnimatedComponent(View)

type Props = AnimatedProps<ViewProps> & {
  style?: ViewStyle
}

export function Container({ children, style, ...props }: PropsWithChildren<Props>) {
  const insets = useSafeAreaInsets()
  const colors = useColors()

  return (
    <AnimatedView
      style={[styles.container, { backgroundColor: colors.appBg, paddingBottom: insets.bottom }, style]}
      {...props}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
    </AnimatedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
})
