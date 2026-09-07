import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { type Ref, useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
	AppBottomSheet,
	type AppBottomSheetRef,
} from "@/components/bottom-sheet/app-bottom-sheet";
import { SheetFooter } from "@/components/bottom-sheet/sheet-footer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useFoodCategories } from "@/hooks/use-food-categories";
import { useColors } from "@/hooks/use-theme-color";
import type { FoodItemSortBy, FoodItemSortOrder } from "@/lib/api/food-query";
import { useSearchFilterStore } from "@/store/search-filter-store";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

const SORT_OPTIONS: { value: FoodItemSortBy; label: string }[] = [
	{ value: "name", label: "Name" },
	{ value: "calories", label: "Calories" },
	{ value: "protein", label: "Protein" },
	{ value: "carbs", label: "Carbs" },
	{ value: "fat", label: "Fat" },
];

const ORDER_OPTIONS: { value: FoodItemSortOrder; label: string }[] = [
	{ value: "asc", label: "Ascending" },
	{ value: "desc", label: "Descending" },
];

export function SearchFilterSheet({
	ref,
}: Readonly<{ ref?: Ref<AppBottomSheetRef | null> }>) {
	const { data, isLoading } = useFoodCategories();
	const categories = data?.data ?? [];

	const {
		categoryId,
		sortBy,
		sortOrder,
		setCategoryId,
		setSortBy,
		setSortOrder,
		resetFilters,
	} = useSearchFilterStore();

	const handleClose = useCallback(() => {
		if (typeof ref === "object" && ref?.current) {
			ref.current.close();
		}
	}, [ref]);

	const handleReset = useCallback(() => {
		resetFilters();
	}, [resetFilters]);

	const renderFooter = useCallback(
		(props: BottomSheetFooterProps) => (
			<SheetFooter {...props}>
				<View style={styles.footer}>
					<Button
						onPress={handleReset}
						style={styles.footerButton}
						variant="outline"
					>
						Reset
					</Button>
					<Button onPress={handleClose} style={styles.footerButton}>
						Apply
					</Button>
				</View>
			</SheetFooter>
		),
		[handleClose, handleReset]
	);

	return (
		<AppBottomSheet
			footerComponent={renderFooter}
			headerTitle="Filters"
			ref={ref}
		>
			<Text size="base" style={styles.sectionTitle} weight="semibold">
				Category
			</Text>
			{isLoading ? (
				<Spinner size="sm" />
			) : (
				<ScrollView
					contentContainerStyle={styles.horizontalChipRow}
					horizontal
					showsHorizontalScrollIndicator={false}
				>
					<Chip
						label="All"
						onPress={() => setCategoryId(null)}
						selected={categoryId === null}
					/>
					{categories.map((cat) => (
						<Chip
							key={cat.id}
							label={cat.name}
							onPress={() => setCategoryId(cat.id)}
							selected={categoryId === cat.id}
							subtitle={cat.description?.trim() || undefined}
						/>
					))}
				</ScrollView>
			)}

			<Text size="base" style={styles.sectionTitle} weight="semibold">
				Sort By
			</Text>
			<ScrollView
				contentContainerStyle={styles.horizontalChipRow}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{SORT_OPTIONS.map((opt) => (
					<Chip
						key={opt.value}
						label={opt.label}
						onPress={() => setSortBy(opt.value)}
						selected={sortBy === opt.value}
					/>
				))}
			</ScrollView>

			<Text size="base" style={styles.sectionTitle} weight="semibold">
				Order
			</Text>
			<ScrollView
				contentContainerStyle={styles.horizontalChipRow}
				horizontal
				showsHorizontalScrollIndicator={false}
			>
				{ORDER_OPTIONS.map((opt) => (
					<Chip
						key={opt.value}
						label={opt.label}
						onPress={() => setSortOrder(opt.value)}
						selected={sortOrder === opt.value}
					/>
				))}
			</ScrollView>
		</AppBottomSheet>
	);
}

SearchFilterSheet.displayName = "SearchFilterSheet";

function Chip({
	label,
	subtitle,
	selected,
	onPress,
}: Readonly<{
	label: string;
	subtitle?: string;
	selected: boolean;
	onPress: () => void;
}>) {
	const colors = useColors();

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
			<View style={styles.chipInner}>
				<Text
					size="sm"
					style={{ color: selected ? colors.onAccent : colors.ink }}
					weight={selected ? "semibold" : "medium"}
				>
					{label}
				</Text>
				{subtitle ? (
					<Text
						numberOfLines={2}
						size="xs"
						style={{
							opacity: selected ? 0.92 : 1,
							color: selected ? colors.onAccent : colors.muted,
						}}
					>
						{subtitle}
					</Text>
				) : null}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	sectionTitle: {
		marginTop: spacing[3],
		marginBottom: spacing[2],
	},
	horizontalChipRow: {
		flexDirection: "row",
		gap: spacing[2],
		paddingRight: spacing[4],
	},
	chip: {
		paddingHorizontal: spacing[4],
		paddingVertical: spacing[2],
		borderRadius: radii.pill,
		maxWidth: 280,
	},
	chipInner: {
		gap: spacing[1],
	},
	footer: {
		flexDirection: "column",
		gap: spacing[3],
	},
	footerButton: {
		flex: 1,
	},
});
