import type { FoodItemAlternativeDto } from "@brnit/api";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface MealItemAlternativeRowProps {
	alternative: FoodItemAlternativeDto;
	onPress: (alternative: FoodItemAlternativeDto) => void;
	selected: boolean;
}

export function MealItemAlternativeRow({
	alternative,
	selected,
	onPress,
}: Readonly<MealItemAlternativeRowProps>) {
	const colors = useColors();
	return (
		<Pressable
			onPress={() => onPress(alternative)}
			style={({ pressed }) => [
				styles.container,
				{
					backgroundColor: colors.card,
					borderColor: selected ? colors.accent : colors.surfaceAlt,
					opacity: pressed ? 0.8 : 1,
				},
			]}
		>
			<Text size="base" weight="semibold">
				{alternative.name}
			</Text>
			<View style={styles.row}>
				<Text accent size="sm">
					{formatQuantityWithUnit(
						alternative.suggestedQuantity,
						alternative.unit
					)}
				</Text>
				<Text muted size="sm">
					{alternative.calories} kcal
				</Text>
			</View>
			<Text muted size="xs">
				P: {alternative.protein}g • C: {alternative.carbs}g • F:{" "}
				{alternative.fat}g
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: radii.sm,
		borderWidth: 1,
		padding: spacing[3],
		marginBottom: spacing[2],
		gap: spacing[1],
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
});
