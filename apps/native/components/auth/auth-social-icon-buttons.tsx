import { Ionicons } from '@expo/vector-icons'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { spacing } from '@/theme/spacing'

type AuthSocialIconButtonsProps = {
  isLoading: boolean
  cardBackgroundColor: string
  iconMutedColor: string
  onGooglePress: () => void
  onApplePress?: () => void
  /** When false, only the Google control is shown (same layout). */
  showApple: boolean
}

/**
 * Social OAuth icon row for auth screens (Google + optional Apple on iOS).
 */
export function AuthSocialIconButtons({
  isLoading,
  cardBackgroundColor,
  iconMutedColor,
  onGooglePress,
  onApplePress,
  showApple,
}: Readonly<AuthSocialIconButtonsProps>) {
  return (
    <View style={styles.socialButtons}>
      <TouchableOpacity
        onPress={onGooglePress}
        disabled={isLoading}
        style={[styles.socialButton, { backgroundColor: cardBackgroundColor }, shadows.md]}
      >
        <Ionicons name='logo-google' size={20} color={iconMutedColor} />
      </TouchableOpacity>

      {showApple && onApplePress ? (
        <TouchableOpacity
          onPress={onApplePress}
          disabled={isLoading}
          style={[styles.socialButton, { backgroundColor: cardBackgroundColor }, shadows.md]}
        >
          <Ionicons name='logo-apple' size={20} color={iconMutedColor} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  socialButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  socialButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
})
