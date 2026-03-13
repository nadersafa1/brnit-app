import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import { fontSize } from '@/theme/typography'

interface PasswordInputProps extends Omit<RNTextInputProps, 'style' | 'secureTextEntry'> {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  icon?: keyof typeof Ionicons.glyphMap
  containerStyle?: ViewStyle
}

export function PasswordInput({
  value,
  onChangeText,
  placeholder,
  icon = 'lock-closed-outline',
  autoComplete,
  containerStyle,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)
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
        secureTextEntry={!isVisible}
        autoComplete={autoComplete}
        autoCapitalize="none"
        style={[styles.input, { color: colors.ink }]}
        {...props}
      />
      <TouchableOpacity
        onPress={() => setIsVisible(!isVisible)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.toggleButton}
      >
        <Ionicons
          name={isVisible ? 'eye-outline' : 'eye-off-outline'}
          size={16}
          color={colors.muted}
        />
      </TouchableOpacity>
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
  toggleButton: {
    marginLeft: spacing[3],
  },
})
