import { useState } from 'react'
import {
  TextInput,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import { fontSize } from '@/theme/typography'

export interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle
  error?: boolean
}

export function Input({
  containerStyle,
  error,
  style,
  ...props
}: InputProps) {
  const colors = useColors()
  const [isFocused, setIsFocused] = useState(false)

  const borderColor = error
    ? colors.danger
    : isFocused
      ? colors.accent
      : colors.border

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor },
        containerStyle,
      ]}
    >
      <TextInput
        style={[styles.input, { color: colors.ink }, style]}
        placeholderTextColor={colors.muted}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
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
  input: {
    flex: 1,
    fontSize: fontSize.base,
    height: '100%',
  },
})
