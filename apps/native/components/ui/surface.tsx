import { View, StyleSheet, ViewProps } from 'react-native'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import type { ShadowKey } from '@/theme/shadows'
import { spacing } from '@/theme/spacing'

type SurfaceVariant = 'default' | 'secondary' | 'elevated'

export interface SurfaceProps extends ViewProps {
  variant?: SurfaceVariant
  padding?: keyof typeof spacing
  radius?: keyof typeof radii
  shadow?: ShadowKey
}

export function Surface({ variant = 'default', padding = 4, radius = 'lg', shadow = 'none', style, children, ...props }: Readonly<SurfaceProps>) {
  const colors = useColors()
  const elevation = useShadows()

  const backgroundColor = variant === 'secondary' ? colors.surfaceAlt : colors.card

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor,
          padding: spacing[padding],
          borderRadius: radii[radius]
        },
        elevation[shadow],
        style
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden'
  }
})
