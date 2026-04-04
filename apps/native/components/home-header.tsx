/**
 * Home screen header: avatar, greeting, user name, and notification button.
 */

import { Ionicons } from '@expo/vector-icons'
import { Pressable, View, StyleSheet, Image } from 'react-native'
import { ThemeToggle } from '@/components/theme-toggle'
import { Text } from '@/components/ui'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

interface HomeHeaderProps {
  userName: string
  userImageUrl?: string | null
}

export function HomeHeader({ userName, userImageUrl }: Readonly<HomeHeaderProps>) {
  const colors = useColors()
  const elevation = useShadows()

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          {userImageUrl ? (
            <Image source={{ uri: userImageUrl }} style={styles.avatarImage} />
          ) : (
            <Text
              size='lg'
              weight='bold'
              style={{ color: colors.white }}
            >
              {userName.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View>
          <Text
            size='sm'
            weight='medium'
            muted
          >
            Good morning 👋
          </Text>
          <Text
            size='lg'
            weight='bold'
          >
            {userName}
          </Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <ThemeToggle variant='iconButton' />
        <Pressable style={[styles.notificationButton, { backgroundColor: colors.card }, elevation.sm]}>
          <Ionicons
            name='notifications-outline'
            size={20}
            color={colors.ink}
          />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[6]
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
