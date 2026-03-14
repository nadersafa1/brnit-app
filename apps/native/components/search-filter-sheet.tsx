import { forwardRef, useCallback, useMemo } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, Spinner, Text } from '@/components/ui'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useColors } from '@/hooks/use-theme-color'
import { useSearchFilterStore } from '@/store/search-filter-store'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import type { SortBy, SortOrder } from '@/lib/api/member-food-types'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'calories', label: 'Calories' },
  { value: 'protein', label: 'Protein' },
  { value: 'carbs', label: 'Carbs' },
  { value: 'fat', label: 'Fat' },
]

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
]

export const SearchFilterSheet = forwardRef<BottomSheet>((_, ref) => {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const { data, isLoading } = useFoodCategories()
  const categories = data?.data ?? []

  const snapPoints = useMemo(() => ['50%', '60%', '70%', '80%'], [])

  const { categoryId, sortBy, sortOrder, setCategoryId, setSortBy, setSortOrder, resetFilters } = useSearchFilterStore()

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  const handleClose = useCallback(() => {
    if (typeof ref === 'object' && ref?.current) {
      ref.current.close()
    }
  }, [ref])

  const handleReset = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.appBg,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Button variant='outline' onPress={handleReset} style={styles.footerButton}>
            Reset
          </Button>
          <Button onPress={handleClose} style={styles.footerButton}>
            Apply
          </Button>
        </View>
      </BottomSheetFooter>
    ),
    [colors.appBg, colors.border, handleClose, handleReset, insets.bottom]
  )

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={{ backgroundColor: colors.appBg }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.header}>
        <Text size='lg' weight='bold'>
          Filters
        </Text>
      </View>

      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text size='base' weight='semibold' style={styles.sectionTitle}>
          Category
        </Text>
        {isLoading ? (
          <Spinner size='sm' />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChipRow}
          >
            <Chip label='All' selected={categoryId === null} onPress={() => setCategoryId(null)} />
            {categories.map(cat => (
              <Chip
                key={cat.id}
                label={cat.name}
                selected={categoryId === cat.id}
                onPress={() => setCategoryId(cat.id)}
              />
            ))}
          </ScrollView>
        )}

        <Text size='base' weight='semibold' style={styles.sectionTitle}>
          Sort By
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipRow}>
          {SORT_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={sortBy === opt.value}
              onPress={() => setSortBy(opt.value)}
            />
          ))}
        </ScrollView>

        <Text size='base' weight='semibold' style={styles.sectionTitle}>
          Order
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChipRow}>
          {ORDER_OPTIONS.map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={sortOrder === opt.value}
              onPress={() => setSortOrder(opt.value)}
            />
          ))}
        </ScrollView>
      </BottomSheetScrollView>
    </BottomSheet>
  )
})

SearchFilterSheet.displayName = 'SearchFilterSheet'

function Chip({
  label,
  selected,
  onPress,
}: Readonly<{
  label: string
  selected: boolean
  onPress: () => void
}>) {
  const colors = useColors()

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceAlt,
          borderWidth: selected ? 0 : 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Text size='sm' weight={selected ? 'semibold' : 'medium'} style={{ color: selected ? colors.white : colors.ink }}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  sectionTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  horizontalChipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
  },
  footer: {
    flexDirection: 'column',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
})
