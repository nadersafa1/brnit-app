import { Ionicons } from '@expo/vector-icons'
import { Pressable, TextInput, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { fontSize } from '@/theme/typography'

export default function Search() {
  const insets = useSafeAreaInsets()
  const colors = useColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
        ]}
      >
        <Text size="2xl" weight="bold" style={styles.title}>
          Search Foods
        </Text>

        <View style={[styles.searchInput, { backgroundColor: colors.card }, shadows.sm]}>
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <TextInput
            placeholder="Search for a food..."
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.ink }]}
          />
        </View>

        <Text size="lg" weight="bold" style={styles.sectionTitle}>
          Quick Add
        </Text>
        <View style={styles.categories}>
          {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks', 'Desserts'].map((category) => (
            <Pressable
              key={category}
              style={({ pressed }) => [
                styles.categoryPill,
                { backgroundColor: colors.card, transform: [{ scale: pressed ? 0.95 : 1 }] },
                shadows.sm,
              ]}
            >
              <Text size="sm" weight="semibold" style={{ color: colors.subtle }}>
                {category}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <BottomNav activeTab="search" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeBlob: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: radii.pill,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  title: {
    marginBottom: spacing[6],
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[6],
  },
  input: {
    flex: 1,
    marginLeft: spacing[3],
    fontSize: fontSize.base,
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  categoryPill: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.pill,
  },
})
