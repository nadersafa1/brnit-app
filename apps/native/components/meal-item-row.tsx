import type { CurrentDietPlanMealItemDto } from "@brnit/api";
import { roundUpToTenth } from "@brnit/domain";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import {
	formatCalorieDisplay,
	formatQuantityWithUnit,
} from "@/lib/utils/numbers";
import { spacing } from "@/theme/spacing";

interface MealItemRowProps {
	item: CurrentDietPlanMealItemDto;
	onPress?: () => void;
}

export function MealItemRow({ item, onPress }: Readonly<MealItemRowProps>) {
	const unit = item.unit ?? "100g";
	const primary = `${item.foodName} (${formatQuantityWithUnit(item.quantity, unit)})`;
	const hasReplacement = item.isOverridden && item.originalFoodName != null;
	const originalQtyText =
		typeof item.originalQuantity === "number"
			? ` (${formatQuantityWithUnit(item.originalQuantity, item.originalUnit ?? "100g")})`
			: "";
	const caloriesText = formatCalorieDisplay(
		roundUpToTenth(item.macros?.calories ?? 0)
	);

	return (
		<Pressable onPress={onPress} style={styles.row}>
			<View style={styles.content}>
				<Text
					numberOfLines={1}
					size="sm"
					style={styles.mealItemName}
					weight="medium"
				>
					{primary}
				</Text>
				<Text muted size="xs" weight="normal">
					{caloriesText} kcal
				</Text>
			</View>
			{hasReplacement ? (
				<Text muted size="xs" style={styles.override} weight="normal">
					replaced {item.originalFoodName}
					{originalQtyText}
				</Text>
			) : null}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		marginBottom: spacing[1],
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: spacing[1],
	},
	override: {
		marginTop: spacing[0.5],
		marginLeft: spacing[2],
	},
	mealItemName: {
		flex: 0.8,
	},
});
