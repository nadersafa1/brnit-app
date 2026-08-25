import { Ionicons } from '@expo/vector-icons'
import { Pressable, View, StyleSheet } from 'react-native'

import { Text } from "@/components/ui/text";
import type { ThemeColors } from '@/theme/colors'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

export type SettingsRowProps = Readonly<{
  icon: keyof typeof Ionicons.glyphMap
  label: string
  colors: ThemeColors
  isLast?: boolean
  onPress?: () => void
  destructive?: boolean
}>

/** Single tappable row inside a settings-style card (icon, label, chevron). */
export function SettingsRow({
  icon,
  label,
  colors,
  isLast,
  onPress,
  destructive,
}: SettingsRowProps) {
  const iconColor = destructive ? colors.danger : colors.subtle
  const chevronColor = destructive ? colors.danger : colors.muted

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text
        size='base'
        weight='medium'
        style={[styles.label, destructive && { color: colors.danger }]}
      >
        {label}
      </Text>
      <Ionicons name='chevron-forward' size={18} color={chevronColor} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    marginLeft: spacing[3],
  },
})
