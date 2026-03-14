import { Ionicons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { FoodItemCard } from "@/components/food-item-card";
import { SearchFilterSheet } from "@/components/search-filter-sheet";
import { Input, Spinner, Text } from "@/components/ui";
import { useFoodCategories } from "@/hooks/use-food-categories";
import { useFoodItems } from "@/hooks/use-food-items";
import { useColors } from "@/hooks/use-theme-color";
import {
  useSearchFilterStore,
  useHasActiveFilters,
} from "@/store/search-filter-store";
import { spacing } from "@/theme/spacing";
import { radii } from "@/theme/radii";
import { shadows } from "@/theme/shadows";

export default function Search() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [inputValue, setInputValue] = useState("");
  const deferredQuery = useDeferredValue(inputValue);

  const { categoryId, sortBy, sortOrder, setQuery } = useSearchFilterStore();
  const hasActiveFilters = useHasActiveFilters();

  const { data: categoriesData } = useFoodCategories();
  const categories = categoriesData?.data ?? [];

  const selectedCategoryName = useMemo(() => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  }, [categoryId, categories]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useFoodItems({
    q: deferredQuery || undefined,
    categoryId: categoryId ?? undefined,
    sortBy,
    sortOrder,
  });

  const foodItems = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      setQuery(text);
    },
    [setQuery]
  );

  const openFilterSheet = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <Spinner />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.centered}>
          <Text muted>Failed to load food items</Text>
          <Pressable onPress={() => refetch()}>
            <Text accent>Tap to retry</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlashList
        data={foodItems}
        renderItem={({ item }) => <FoodItemCard item={item} />}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text muted>
              {deferredQuery ? "No results found" : "Start searching for food items"}
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <Spinner size="sm" />
            </View>
          ) : undefined
        }
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View
        style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]}
      />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 16, paddingBottom: spacing[3] },
        ]}
      >
        <Text size="2xl" weight="bold" style={styles.title}>
          Search Foods
        </Text>

        <View style={styles.searchRow}>
          <Input
            icon="search-outline"
            variant="pill"
            placeholder="Search for a food..."
            value={inputValue}
            onChangeText={handleInputChange}
            containerStyle={{ ...styles.searchInput, ...shadows.sm }}
          />
          <Pressable
            onPress={openFilterSheet}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor: hasActiveFilters ? colors.accent : colors.card,
                opacity: pressed ? 0.8 : 1,
              },
              shadows.sm,
            ]}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={hasActiveFilters ? colors.white : colors.ink}
            />
          </Pressable>
        </View>

        {hasActiveFilters && (
          <View style={styles.activeFilters}>
            {selectedCategoryName && (
              <View style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text size="xs" weight="medium">
                  {selectedCategoryName}
                </Text>
              </View>
            )}
            {sortBy !== "name" && (
              <View style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text size="xs" weight="medium">
                  Sort: {sortBy}
                </Text>
              </View>
            )}
            {sortOrder !== "asc" && (
              <View style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }]}>
                <Text size="xs" weight="medium">
                  {sortOrder === "desc" ? "Descending" : "Ascending"}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.listContainer}>{renderContent()}</View>

      <BottomNav activeTab="search" />
      <SearchFilterSheet ref={bottomSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeBlob: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: radii.pill,
  },
  header: {
    paddingHorizontal: spacing[4],
  },
  title: {
    marginBottom: spacing[4],
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  searchInput: {
    flex: 1,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[3],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.pill,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 96,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[8],
    gap: spacing[2],
  },
  footer: {
    paddingVertical: spacing[4],
    alignItems: "center",
  },
});
