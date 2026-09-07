import type { FoodItemAlternativeDto } from "@brnit/api";
import { StyleSheet, View } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/spacing";

import { MealItemAlternativeRow } from "./meal-item-alternative-row";

interface MealItemAlternativesSuggestionsProps {
	alternatives: FoodItemAlternativeDto[];
	isError: boolean;
	isLoading: boolean;
	onSelectAlternative: (alternative: FoodItemAlternativeDto) => void;
	selectedAlternative: FoodItemAlternativeDto | null;
}

/** Loading, error, empty, and list states for the "replace with" suggestion list. */
export function MealItemAlternativesSuggestions({
	isLoading,
	isError,
	alternatives,
	selectedAlternative,
	onSelectAlternative,
}: Readonly<MealItemAlternativesSuggestionsProps>) {
	if (isLoading) {
		return (
			<View style={styles.centered}>
				<Spinner size="lg" />
				<Text muted style={styles.statusText}>
					Loading suggestions...
				</Text>
			</View>
		);
	}

	if (isError) {
		return (
			<Text muted style={styles.statusText}>
				Could not load suggestions.
			</Text>
		);
	}

	if (alternatives.length === 0) {
		return (
			<Text muted style={styles.statusText}>
				No suggestions found.
			</Text>
		);
	}

	return (
		<>
			{alternatives.map((alternative) => (
				<MealItemAlternativeRow
					alternative={alternative}
					key={alternative.foodItemId}
					onPress={onSelectAlternative}
					selected={selectedAlternative?.foodItemId === alternative.foodItemId}
				/>
			))}
		</>
	);
}

const styles = StyleSheet.create({
	centered: { alignItems: "center", paddingVertical: spacing[4] },
	statusText: { marginBottom: spacing[2] },
});
