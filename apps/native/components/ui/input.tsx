import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { TextInput, StyleSheet, TextInputProps, View, ViewStyle } from 'react-native'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import { fontSize } from '@/theme/typography'

type InputVariant = 'default' | 'pill'

export interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle
  error?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  variant?: InputVariant
}

export function Input({ containerStyle, error, icon, variant = 'default', style, ...props }: Readonly<InputProps>) {
  const colors = useColors()
  const [isFocused, setIsFocused] = useState(false)

  const isPill = variant === 'pill'

  const getBorderColor = () => {
    if (error) return colors.danger
    if (isFocused) return colors.accent
    return colors.border
  }

  return (
    <View
      style={[
        styles.container,
        isPill && styles.containerPill,
        { backgroundColor: colors.card, borderColor: isPill ? 'transparent' : getBorderColor() },
        containerStyle,
      ]}
    >
      {icon && <Ionicons name={icon} size={20} color={colors.muted} style={styles.icon} />}
      <TextInput
        style={[styles.input, { color: colors.ink }, style]}
        placeholderTextColor={colors.muted}
        onFocus={e => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={e => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[4],
    height: 48,
  },
  containerPill: {
    borderRadius: radii.pill,
    borderWidth: 0,
    paddingVertical: spacing[3],
    height: 'auto' as any,
  },
  icon: {
    marginRight: spacing[3],
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    height: '100%',
  },
})
