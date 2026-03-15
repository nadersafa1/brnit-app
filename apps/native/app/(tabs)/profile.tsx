import { useRef, useCallback } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Alert, Pressable, View, StyleSheet, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { EditProfileSheet, type EditProfileSheetRef } from '@/components/edit-profile-sheet'
import { Text } from '@/components/ui'
import { authClient } from '@/lib/auth-client'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

export default function Profile() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const router = useRouter()
  const { data: session, refetch: refetchSession } = authClient.useSession()
  const editSheetRef = useRef<EditProfileSheetRef>(null)

  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userImage = session?.user?.image ?? null

  const openEditSheet = useCallback(() => {
    editSheetRef.current?.open()
  }, [])

  const handleEditSaveSuccess = useCallback(() => {
    refetchSession?.()
  }, [refetchSession])

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            authClient.signOut().then(() => router.replace('/(auth)'))
          }
        }
      ],
      { cancelable: true }
    )
  }, [router])

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <View style={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]}>
        <Text
          size='2xl'
          weight='bold'
          style={styles.title}
        >
          Profile
        </Text>

        <View style={[styles.profileCard, { backgroundColor: colors.card }, shadows.md]}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.accent }]}>
            {userImage ? (
              <Image
                source={{ uri: userImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text
                size='3xl'
                weight='bold'
                style={{ color: colors.white }}
              >
                {userName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text
            size='xl'
            weight='bold'
          >
            {userName}
          </Text>
          <Text
            size='sm'
            muted
          >
            {userEmail}
          </Text>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.card }, shadows.md]}>
          <SettingsRow
            icon='person-outline'
            label='Edit Profile'
            colors={colors}
            onPress={openEditSheet}
          />
          <SettingsRow
            icon='notifications-outline'
            label='Notifications'
            colors={colors}
          />
          <SettingsRow
            icon='fitness-outline'
            label='Goals'
            colors={colors}
          />
          <SettingsRow
            icon='help-circle-outline'
            label='Help & Support'
            colors={colors}
            isLast
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutButton, { backgroundColor: colors.card, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadows.md]}
          onPress={handleSignOut}
        >
          <Ionicons
            name='log-out-outline'
            size={20}
            color={colors.danger}
          />
          <Text
            size='base'
            weight='semibold'
            danger
            style={styles.signOutText}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>

      <BottomNav activeTab='profile' />
      <EditProfileSheet
        ref={editSheetRef}
        initialName={userName}
        initialImageUrl={userImage}
        onSaveSuccess={handleEditSaveSuccess}
        onClose={() => {}}
      />
    </View>
  )
}

function SettingsRow({
  icon,
  label,
  colors,
  isLast,
  onPress
}: Readonly<{
  icon: keyof typeof Ionicons.glyphMap
  label: string
  colors: ReturnType<typeof useColors>
  isLast?: boolean
  onPress?: () => void
}>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surfaceAlt }
      ]}
    >
      <View style={[styles.settingsIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons
          name={icon}
          size={18}
          color={colors.subtle}
        />
      </View>
      <Text
        size='base'
        weight='medium'
        style={styles.settingsLabel}
      >
        {label}
      </Text>
      <Ionicons
        name='chevron-forward'
        size={18}
        color={colors.muted}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  decorativeBlob: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: radii.pill
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4]
  },
  title: {
    marginBottom: spacing[6]
  },
  profileCard: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
    alignItems: 'center'
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  settingsCard: {
    borderRadius: radii.xl,
    overflow: 'hidden'
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4]
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  settingsLabel: {
    flex: 1,
    marginLeft: spacing[3]
  },
  signOutButton: {
    borderRadius: radii.xl,
    padding: spacing[4],
    marginTop: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  signOutText: {
    marginLeft: spacing[2]
  }
})
