import type { FoodItemDto } from "@brnit/api";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "@/components/bottom-nav";
import type { AppBottomSheetRef } from "@/components/bottom-sheet/app-bottom-sheet";
import { FoodAlternativesSheet } from "@/components/food-alternatives-sheet/food-alternatives-sheet";
import { FoodItemCard } from "@/components/food-item-card";
import { SearchFilterSheet } from "@/components/search-filter-sheet";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useFoodCategories } from "@/hooks/use-food-categories";
import { useFoodItems } from "@/hooks/use-food-items";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { showError } from "@/lib/feedback";
import {
	useHasActiveFilters,
	useSearchFilterStore,
} from "@/store/search-filter-store";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
export default function Search() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const elevation = useShadows();
	const bottomSheetRef = useRef<AppBottomSheetRef>(null);

	const [inputValue, setInputValue] = useState("");
	const deferredQuery = useDeferredValue(inputValue);
	const [selectedFoodForAlternatives, setSelectedFoodForAlternatives] =
		useState<FoodItemDto | null>(null);

	const { categoryId, sortBy, sortOrder, setQuery } = useSearchFilterStore();
	const hasActiveFilters = useHasActiveFilters();

	const { data: categoriesData } = useFoodCategories();
	const categories = categoriesData?.data ?? [];

	const selectedCategoryName = useMemo(() => {
		if (!categoryId) {
			return null;
		}
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

	// Toast when search fails so user sees feedback even if they scroll
	useEffect(() => {
		if (isError) {
			showError("Failed to load food items");
		}
	}, [isError]);

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
		bottomSheetRef.current?.open(2);
	}, []);

	const handleAlternativesPress = useCallback((item: FoodItemDto) => {
		setSelectedFoodForAlternatives(item);
	}, []);

	const handleCloseAlternatives = useCallback(() => {
		setSelectedFoodForAlternatives(null);
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
				contentContainerStyle={styles.listContent}
				data={foodItems}
				keyExtractor={(item) => item.id}
				ListEmptyComponent={
					<View style={styles.centered}>
						<Text muted>
							{deferredQuery
								? "No results found"
								: "Start searching for food items"}
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
				onEndReached={handleEndReached}
				onEndReachedThreshold={0.5}
				renderItem={({ item }) => (
					<FoodItemCard
						item={item}
						onAlternativesPress={() => handleAlternativesPress(item)}
					/>
				)}
			/>
		);
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.appBg }]}>
			<View
				style={[styles.decorativeBlob, { backgroundColor: colors.decorative }]}
			/>

			<View
				style={[
					styles.header,
					{ paddingTop: insets.top + 16, paddingBottom: spacing[3] },
				]}
			>
				<Text size="2xl" style={styles.title} weight="bold">
					Search Foods
				</Text>

				<View style={styles.searchRow}>
					<Input
						containerStyle={{ ...styles.searchInput, ...elevation.sm }}
						icon="search-outline"
						onChangeText={handleInputChange}
						placeholder="Search for a food..."
						value={inputValue}
						variant="pill"
					/>
					<Pressable
						onPress={openFilterSheet}
						style={({ pressed }) => [
							styles.filterButton,
							{
								backgroundColor: hasActiveFilters ? colors.accent : colors.card,
								opacity: pressed ? 0.8 : 1,
							},
							elevation.sm,
						]}
					>
						<Ionicons
							color={hasActiveFilters ? colors.onAccent : colors.ink}
							name="options-outline"
							size={20}
						/>
					</Pressable>
				</View>

				{hasActiveFilters && (
					<View style={styles.activeFilters}>
						{selectedCategoryName && (
							<View
								style={[
									styles.filterChip,
									{ backgroundColor: colors.surfaceAlt },
								]}
							>
								<Text size="xs" weight="medium">
									{selectedCategoryName}
								</Text>
							</View>
						)}
						{sortBy !== "name" && (
							<View
								style={[
									styles.filterChip,
									{ backgroundColor: colors.surfaceAlt },
								]}
							>
								<Text size="xs" weight="medium">
									Sort: {sortBy}
								</Text>
							</View>
						)}
						{sortOrder !== "asc" && (
							<View
								style={[
									styles.filterChip,
									{ backgroundColor: colors.surfaceAlt },
								]}
							>
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
			<FoodAlternativesSheet
				foodItem={selectedFoodForAlternatives}
				onClose={handleCloseAlternatives}
			/>
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
