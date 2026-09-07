import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { spacing } from "@/theme/spacing";

import { MealItemAlternativesSuggestions } from "./meal-item-alternatives-suggestions";
import type { MealItemDetailContentProps } from "./types";

/** Current meal item summary plus alternative foods the member can swap in. */
export function MealItemDetailContent({
	item,
	alternatives,
	isLoading,
	isError,
	selectedAlternative,
	onSelectAlternative,
}: Readonly<MealItemDetailContentProps>) {
	return (
		<View style={styles.container}>
			<Text size="base" weight="semibold">
				{item.foodName}
			</Text>
			<Text muted size="sm">
				{formatQuantityWithUnit(item.quantity, item.unit)} •{" "}
				{item.macros.calories} kcal
			</Text>
			<Text muted size="xs">
				P: {item.macros.protein}g • C: {item.macros.carbs}g • F:{" "}
				{item.macros.fat}g
			</Text>
			{item.isOverridden && item.originalFoodName ? (
				<Text muted size="xs">
					Replacing {item.originalFoodName}
				</Text>
			) : null}

			<Text size="sm" style={styles.sectionTitle} weight="semibold">
				Suggestions to replace
			</Text>
			<MealItemAlternativesSuggestions
				alternatives={alternatives}
				isError={isError}
				isLoading={isLoading}
				onSelectAlternative={onSelectAlternative}
				selectedAlternative={selectedAlternative}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { gap: spacing[1] },
	sectionTitle: { marginTop: spacing[3], marginBottom: spacing[1] },
});
