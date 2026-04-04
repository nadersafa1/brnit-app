import { forwardRef, useCallback } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'

import { AppBottomSheet, SheetFooter, type AppBottomSheetRef } from '@/components/bottom-sheet'
import { Button, Spinner, Text } from '@/components/ui'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useSearchFilterStore } from '@/store/search-filter-store'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import type { SortBy, SortOrder } from '@/lib/api/member-food-types'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'calories', label: 'Calories' },
  { value: 'protein', label: 'Protein' },
  { value: 'carbs', label: 'Carbs' },
  { value: 'fat', label: 'Fat' }
]

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
]

export const SearchFilterSheet = forwardRef<AppBottomSheetRef>((_, ref) => {
  const { data, isLoading } = useFoodCategories()
  const categories = data?.data ?? []

  const { categoryId, sortBy, sortOrder, setCategoryId, setSortBy, setSortOrder, resetFilters } = useSearchFilterStore()

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
      <SheetFooter {...props}>
        <View style={styles.footer}>
          <Button
            variant='outline'
            onPress={handleReset}
            style={styles.footerButton}
          >
            Reset
          </Button>
          <Button
            onPress={handleClose}
            style={styles.footerButton}
          >
            Apply
          </Button>
        </View>
      </SheetFooter>
    ),
    [handleClose, handleReset]
  )

  return (
    <AppBottomSheet
      ref={ref}
      headerTitle='Filters'
      footerComponent={renderFooter}
    >
      <Text
        size='base'
        weight='semibold'
        style={styles.sectionTitle}
      >
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
          <Chip
            label='All'
            selected={categoryId === null}
            onPress={() => setCategoryId(null)}
          />
          {categories.map(cat => (
            <Chip
              key={cat.id}
              label={cat.name}
              subtitle={cat.description?.trim() || undefined}
              selected={categoryId === cat.id}
              onPress={() => setCategoryId(cat.id)}
            />
          ))}
        </ScrollView>
      )}

      <Text
        size='base'
        weight='semibold'
        style={styles.sectionTitle}
      >
        Sort By
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalChipRow}
      >
        {SORT_OPTIONS.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={sortBy === opt.value}
            onPress={() => setSortBy(opt.value)}
          />
        ))}
      </ScrollView>

      <Text
        size='base'
        weight='semibold'
        style={styles.sectionTitle}
      >
        Order
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalChipRow}
      >
        {ORDER_OPTIONS.map(opt => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={sortOrder === opt.value}
            onPress={() => setSortOrder(opt.value)}
          />
        ))}
      </ScrollView>
    </AppBottomSheet>
  )
})

SearchFilterSheet.displayName = 'SearchFilterSheet'

function Chip({
  label,
  subtitle,
  selected,
  onPress
}: Readonly<{
  label: string
  subtitle?: string
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
          opacity: pressed ? 0.8 : 1
        }
      ]}
    >
      <View style={styles.chipInner}>
        <Text
          size='sm'
          weight={selected ? 'semibold' : 'medium'}
          style={{ color: selected ? colors.white : colors.ink }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            size='xs'
            numberOfLines={2}
            style={{ opacity: selected ? 0.92 : 1, color: selected ? colors.white : colors.muted }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[2]
  },
  horizontalChipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4]
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
    maxWidth: 280
  },
  chipInner: {
    gap: spacing[1]
  },
  footer: {
    flexDirection: 'column',
    gap: spacing[3]
  },
  footerButton: {
    flex: 1
  }
})
