import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import { fontSize } from '@/theme/typography'

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  icon?: keyof typeof Ionicons.glyphMap
  containerStyle?: ViewStyle
}

export function TextInput({
  value,
  onChangeText,
  placeholder,
  icon = 'mail-outline',
  keyboardType,
  autoCapitalize,
  autoComplete,
  containerStyle,
  ...props
}: TextInputProps) {
  const colors = useColors()

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
        containerStyle,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={colors.muted}
          style={styles.icon}
        />
      )}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        style={[styles.input, { color: colors.ink }]}
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
  },
  icon: {
    marginRight: spacing[3],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
  },
})
