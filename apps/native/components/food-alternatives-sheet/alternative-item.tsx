import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { formatQuantityWithUnit } from "@/lib/utils/numbers";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import type { AlternativeItemProps } from "./types";

export function AlternativeItem({
	alternative,
	onCopy,
}: Readonly<AlternativeItemProps>) {
	const colors = useColors();
	const quantityText = formatQuantityWithUnit(
		alternative.suggestedQuantity,
		alternative.unit ?? "100g"
	);

	return (
		<Pressable
			onPress={() => onCopy(alternative)}
			style={({ pressed }) => [
				styles.container,
				{ backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
			]}
		>
			<View style={styles.content}>
				<View style={styles.info}>
					<Text numberOfLines={1} size="base" weight="semibold">
						{alternative.name}
					</Text>
					<Text accent size="sm" weight="medium">
						{quantityText}
					</Text>
					<View style={styles.macros}>
						<Text muted size="xs">
							P: {alternative.protein}g
						</Text>
						<Text muted size="xs" style={styles.dot}>
							•
						</Text>
						<Text muted size="xs">
							C: {alternative.carbs}g
						</Text>
						<Text muted size="xs" style={styles.dot}>
							•
						</Text>
						<Text muted size="xs">
							F: {alternative.fat}g
						</Text>
					</View>
				</View>
				<View style={styles.right}>
					<Text accent size="base" weight="bold">
						{alternative.calories}
					</Text>
					<Text muted size="xs">
						kcal
					</Text>
					<Ionicons
						color={colors.muted}
						name="copy-outline"
						size={16}
						style={styles.copyIcon}
					/>
				</View>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: radii.sm,
		padding: spacing[3],
		marginBottom: spacing[2],
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
	},
	info: {
		flex: 1,
	},
	macros: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: spacing[1],
	},
	dot: {
		marginHorizontal: spacing[1],
	},
	right: {
		alignItems: "flex-end",
	},
	copyIcon: {
		marginTop: spacing[2],
	},
});
