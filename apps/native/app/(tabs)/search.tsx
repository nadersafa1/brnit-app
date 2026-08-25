import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useCallback, useEffect, useDeferredValue, useMemo, useRef, useState } from 'react'
import { Pressable, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { FoodItemCard } from '@/components/food-item-card'
import { FoodAlternativesSheet } from "@/components/food-alternatives-sheet/food-alternatives-sheet";
import { SearchFilterSheet } from '@/components/search-filter-sheet'
import type { AppBottomSheetRef } from "@/components/bottom-sheet/app-bottom-sheet";
import type { FoodItem } from '@/lib/api/member-food-types'
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useFoodItems } from '@/hooks/use-food-items'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { showError } from '@/lib/feedback'
import { useSearchFilterStore, useHasActiveFilters } from '@/store/search-filter-store'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
export default function Search() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const elevation = useShadows()
  const bottomSheetRef = useRef<AppBottomSheetRef>(null)

  const [inputValue, setInputValue] = useState('')
  const deferredQuery = useDeferredValue(inputValue)
  const [selectedFoodForAlternatives, setSelectedFoodForAlternatives] = useState<FoodItem | null>(null)

  const { categoryId, sortBy, sortOrder, setQuery } = useSearchFilterStore()
  const hasActiveFilters = useHasActiveFilters()

  const { data: categoriesData } = useFoodCategories()
  const categories = categoriesData?.data ?? []

  const selectedCategoryName = useMemo(() => {
    if (!categoryId) return null
    return categories.find(c => c.id === categoryId)?.name ?? null
  }, [categoryId, categories])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } = useFoodItems({
    q: deferredQuery || undefined,
    categoryId: categoryId ?? undefined,
    sortBy,
    sortOrder
  })

  const foodItems = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data])

  // Toast when search fails so user sees feedback even if they scroll
  useEffect(() => {
    if (isError) showError('Failed to load food items')
  }, [isError])

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text)
      setQuery(text)
    },
    [setQuery]
  )

  const openFilterSheet = useCallback(() => {
    bottomSheetRef.current?.open(2)
  }, [])

  const handleAlternativesPress = useCallback((item: FoodItem) => {
    setSelectedFoodForAlternatives(item)
  }, [])

  const handleCloseAlternatives = useCallback(() => {
    setSelectedFoodForAlternatives(null)
  }, [])

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <Spinner />
        </View>
      )
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <Text muted>Failed to load food items</Text>
          <Pressable onPress={() => refetch()}>
            <Text accent>Tap to retry</Text>
          </Pressable>
        </View>
      )
    }

    return (
      <FlashList
        data={foodItems}
        renderItem={({ item }) => (
          <FoodItemCard
            item={item}
            onAlternativesPress={() => handleAlternativesPress(item)}
          />
        )}
        keyExtractor={item => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text muted>{deferredQuery ? 'No results found' : 'Start searching for food items'}</Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <Spinner size='sm' />
            </View>
          ) : undefined
        }
      />
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: spacing[3] }]}>
        <Text
          size='2xl'
          weight='bold'
          style={styles.title}
        >
          Search Foods
        </Text>

        <View style={styles.searchRow}>
          <Input
            icon='search-outline'
            variant='pill'
            placeholder='Search for a food...'
            value={inputValue}
            onChangeText={handleInputChange}
            containerStyle={{ ...styles.searchInput, ...elevation.sm }}
          />
          <Pressable
            onPress={openFilterSheet}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: hasActiveFilters ? colors.accent : colors.card,
                opacity: pressed ? 0.8 : 1
              },
              elevation.sm
            ]}
          >
            <Ionicons
              name='options-outline'
              size={20}
              color={hasActiveFilters ? colors.white : colors.ink}
            />
          </Pressable>
        </View>

        {hasActiveFilters && (
          <View style={styles.activeFilters}>
            {selectedCategoryName && (
              <View style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text
                  size='xs'
                  weight='medium'
                >
                  {selectedCategoryName}
                </Text>
              </View>
            )}
            {sortBy !== 'name' && (
              <View style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text
                  size='xs'
                  weight='medium'
                >
                  Sort: {sortBy}
                </Text>
              </View>
            )}
            {sortOrder !== 'asc' && (
              <View style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text
                  size='xs'
                  weight='medium'
                >
                  {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.listContainer}>{renderContent()}</View>

      <BottomNav activeTab='search' />
      <SearchFilterSheet ref={bottomSheetRef} />
      <FoodAlternativesSheet
        foodItem={selectedFoodForAlternatives}
        onClose={handleCloseAlternatives}
      />
    </View>
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
  header: {
    paddingHorizontal: spacing[4]
  },
  title: {
    marginBottom: spacing[4]
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3]
  },
  searchInput: {
    flex: 1
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3]
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.pill
  },
  listContainer: {
    flex: 1
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 96
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    gap: spacing[2]
  },
  footer: {
    paddingVertical: spacing[4],
    alignItems: 'center'
  }
})
