import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { spacing } from '@/theme/spacing'

type SurfaceVariant = 'default' | 'secondary' | 'elevated'

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant
  padding?: keyof typeof spacing
  radius?: keyof typeof radii
  shadow?: keyof typeof shadows
}

export function Surface({
  variant = 'default',
  padding = 4,
  radius = 'lg',
  shadow = 'none',
  style,
  children,
  ...props
}: SurfaceProps) {
  const colors = useColors()

  const backgroundColor =
    variant === 'secondary' ? colors.surfaceAlt : colors.card

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor,
          padding: spacing[padding],
          borderRadius: radii[radius],
        },
        shadows[shadow],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
})
