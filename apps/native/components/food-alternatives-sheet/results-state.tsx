import type { FoodItemAlternativeDto } from "@brnit/api";
import type { FoodUnit } from "@brnit/domain";
import { StyleSheet, View } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { spacing } from "@/theme/spacing";
import { AlternativeItem } from "./alternative-item";

interface ResultsStateProps {
	alternatives: FoodItemAlternativeDto[];
	foodItemName: string;
	isError: boolean;
	isLoading: boolean;
	onCopy: (alternative: FoodItemAlternativeDto) => void;
	quantity: number;
	quantityUnit: FoodUnit;
}

export function ResultsState({
	alternatives,
	isLoading,
	isError,
	quantity,
	quantityUnit,
	foodItemName,
	onCopy,
}: Readonly<ResultsStateProps>) {
	if (isLoading) {
		return (
			<View style={styles.centered}>
				<Spinner size="lg" />
				<Text muted style={styles.loadingText}>
					Finding alternatives...
				</Text>
			</View>
		);
	}

	if (isError) {
		return (
			<View style={styles.centered}>
				<Text muted>Failed to load alternatives. Please try again.</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text muted size="sm" style={styles.summary}>
				Alternatives for {formatQuantityWithUnit(quantity, quantityUnit)} of{" "}
				{foodItemName}
			</Text>
			<Text muted size="xs" style={styles.hint}>
				Tap to copy
			</Text>

			{alternatives.length === 0 ? (
				<View style={styles.centered}>
					<Text muted>No alternatives found with similar nutrition.</Text>
				</View>
			) : (
				alternatives.map((alt) => (
					<AlternativeItem
						alternative={alt}
						key={alt.foodItemId}
						onCopy={onCopy}
					/>
				))
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingTop: spacing[2],
	},
	centered: {
		alignItems: "center",
		paddingVertical: spacing[8],
	},
	loadingText: {
		marginTop: spacing[3],
	},
	summary: {
		marginBottom: spacing[1],
	},
	hint: {
		marginBottom: spacing[3],
	},
});
