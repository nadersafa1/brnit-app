import { useRef } from 'react'
import {
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { fontSize, fontWeight } from '@/theme/typography'
import { Text } from './text'

type ButtonVariant = 'solid' | 'outline' | 'soft' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  children: React.ReactNode
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  haptic?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export function Button(props: Readonly<ButtonProps>) {
  const {
    children,
    onPress,
    variant = 'solid',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = true,
    haptic = true,
    style,
    textStyle,
  } = props

  const colors = useColors()
  const scaleAnim = useRef(new Animated.Value(1)).current

  const isDisabled = disabled || loading

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start()
  }

  const handlePress = () => {
    if (isDisabled) return
    if (haptic) {
      const impactStyle =
        variant === 'solid'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light
      Haptics.impactAsync(impactStyle)
    }
    onPress()
  }

  const variantStyles = getVariantStyles(variant, colors, isDisabled)
  const sizeStyle = SIZE_STYLES[size]
  const textSizeStyle = TEXT_SIZE_STYLES[size]

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={variantStyles.textColor} />
    }

    if (typeof children === 'string') {
      return (
        <Text
          style={[
            styles.text,
            textSizeStyle,
            { color: variantStyles.textColor },
            textStyle,
          ]}
        >
          {children}
        </Text>
      )
    }

    return children
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.button,
          sizeStyle,
          variantStyles.container,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {renderContent()}
      </Pressable>
    </Animated.View>
  )
}

function getVariantStyles(
  variant: ButtonVariant,
  colors: ReturnType<typeof useColors>,
  disabled: boolean
) {
  const baseColor = disabled ? colors.muted : colors.accent

  switch (variant) {
    case 'solid':
      return {
        container: {
          backgroundColor: baseColor,
          borderWidth: 0,
        } as ViewStyle,
        textColor: colors.white,
      }
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: baseColor,
        } as ViewStyle,
        textColor: baseColor,
      }
    case 'soft':
      return {
        container: {
          backgroundColor: `${baseColor}15`,
          borderWidth: 0,
        } as ViewStyle,
        textColor: baseColor,
      }
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 0,
        } as ViewStyle,
        textColor: baseColor,
      }
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontWeight: fontWeight.medium,
  },
})

const SIZE_STYLES = StyleSheet.create({
  sm: { height: 36, paddingHorizontal: 16 },
  md: { height: 44, paddingHorizontal: 20 },
  lg: { height: 52, paddingHorizontal: 24 },
})

const TEXT_SIZE_STYLES = StyleSheet.create({
  sm: { fontSize: fontSize.sm },
  md: { fontSize: fontSize.base },
  lg: { fontSize: fontSize.lg },
})
