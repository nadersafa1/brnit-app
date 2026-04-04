import { Ionicons } from '@expo/vector-icons'
import { useRouter, useSegments } from 'expo-router'
import { Pressable, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui'
import { useColorSchemeValue, useColors, useShadows } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

type TabName = 'home' | 'search' | 'stats' | 'profile'

interface NavItemProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  isActive?: boolean
  onPress?: () => void
}

function NavItem({ icon, label, isActive, onPress }: Readonly<NavItemProps>) {
  const colors = useColors()
  const scheme = useColorSchemeValue()
  const inactiveIconColor = scheme === 'dark' ? colors.muted : colors.white

  if (isActive) {
    return (
      <View style={[styles.activeItem, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={20} color={colors.white} />
        <Text size='xs' weight='bold' style={[styles.activeLabel, { color: colors.white }]}>
          {label}
        </Text>
      </View>
    )
  }

  return (
    <Pressable style={styles.inactiveItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={inactiveIconColor} />
    </Pressable>
  )
}

interface BottomNavProps {
  activeTab?: TabName
}

export function BottomNav({ activeTab }: Readonly<BottomNavProps>) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const segments = useSegments()
  const colors = useColors()
  const elevation = useShadows()

  const currentTab = activeTab || (segments[1] as TabName) || 'home'

  const navigate = (tab: TabName) => {
    if (tab === currentTab) return

    const route = tab === 'home' ? '/(tabs)' : `/(tabs)/${tab}`
    router.push(route as any)
  }

  return (
    <View
      style={[
        styles.container,
        { bottom: insets.bottom + 16, backgroundColor: colors.navPill },
        elevation.md,
      ]}
    >
      <NavItem icon='home' label='Home' isActive={currentTab === 'home'} onPress={() => navigate('home')} />
      <NavItem
        icon='search-outline'
        label='Search'
        isActive={currentTab === 'search'}
        onPress={() => navigate('search')}
      />
      <NavItem
        icon='bar-chart-outline'
        label='Stats'
        isActive={currentTab === 'stats'}
        onPress={() => navigate('stats')}
      />
      <NavItem
        icon='person-outline'
        label='Profile'
        isActive={currentTab === 'profile'}
        onPress={() => navigate('profile')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[2],
    borderRadius: radii.pill,
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    height: 40,
    borderRadius: radii.pill,
  },
  activeLabel: {
    marginLeft: spacing[2],
  },
  inactiveItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
})
