import type { FoodItemDto } from "@brnit/api";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { formatFoodCategoriesDisplay } from "@/lib/helpers/food-item-display";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface FoodItemCardProps {
	item: FoodItemDto;
	onAlternativesPress?: () => void;
	onPress?: () => void;
}

type FoodItemThumbnailProps = Readonly<{
	imageUrl?: string | null;
}>;

/**
 * Loads the food thumbnail or shows an icon placeholder. Parent should pass `key`
 * including `imageUrl` so a failed load resets when the URL changes.
 */
function FoodItemThumbnail({ imageUrl }: FoodItemThumbnailProps) {
	const colors = useColors();
	const [loadFailed, setLoadFailed] = useState(false);
	const uri = imageUrl ?? undefined;

	if (!uri || loadFailed) {
		return (
			<View
				style={[
					styles.imagePlaceholder,
					{ backgroundColor: colors.surfaceAlt },
				]}
			>
				<Ionicons color={colors.muted} name="image-outline" size={20} />
			</View>
		);
	}

	return (
		<Image
			contentFit="cover"
			onError={() => setLoadFailed(true)}
			source={{ uri }}
			style={[styles.image, { backgroundColor: colors.surfaceAlt }]}
		/>
	);
}

export function FoodItemCard({
	item,
	onPress,
	onAlternativesPress,
}: Readonly<FoodItemCardProps>) {
	const colors = useColors();
	const elevation = useShadows();

	const thumbnailKey = `${item.id}-${item.imageUrl ?? ""}`;

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.container,
				{
					backgroundColor: colors.card,
					transform: [{ scale: pressed ? 0.98 : 1 }],
					opacity: pressed ? 0.95 : 1,
				},
				elevation.sm,
			]}
		>
			<View style={styles.content}>
				<FoodItemThumbnail imageUrl={item.imageUrl} key={thumbnailKey} />
				<View style={styles.info}>
					<Text numberOfLines={1} size="base" weight="semibold">
						{item.name}
					</Text>
					{item.categories?.length ? (
						<Text muted numberOfLines={1} size="xs">
							{formatFoodCategoriesDisplay(item.categories)}
						</Text>
					) : null}
					<View style={styles.macros}>
						<Text muted size="xs">
							P: {item.protein}g
						</Text>
						<Text muted size="xs" style={styles.macroDivider}>
							•
						</Text>
						<Text muted size="xs">
							C: {item.carbs}g
						</Text>
						<Text muted size="xs" style={styles.macroDivider}>
							•
						</Text>
						<Text muted size="xs">
							F: {item.fat}g
						</Text>
					</View>
				</View>

				<View style={styles.rightSection}>
					<View style={styles.caloriesContainer}>
						<Text accent size="base" weight="bold">
							{item.calories}
						</Text>
						<Text muted size="xs">
							kcal
						</Text>
					</View>
					{onAlternativesPress ? (
						<Pressable
							hitSlop={8}
							onPress={onAlternativesPress}
							style={({ pressed }) => [
								styles.alternativesButton,
								{
									backgroundColor: colors.surfaceAlt,
									opacity: pressed ? 0.7 : 1,
								},
							]}
						>
							<Ionicons
								color={colors.accentFg}
								name="swap-horizontal"
								size={18}
							/>
						</Pressable>
					) : null}
				</View>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: radii.sm,
		padding: spacing[3],
		marginBottom: spacing[3],
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
	},
	image: {
		width: 48,
		height: 48,
		borderRadius: radii.sm,
	},
	imagePlaceholder: {
		width: 48,
		height: 48,
		borderRadius: radii.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	info: {
		flex: 1,
		marginLeft: spacing[3],
	},
	macros: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: spacing[1],
	},
	macroDivider: {
		marginHorizontal: spacing[1],
	},
	rightSection: {
		alignItems: "flex-end",
		gap: spacing[2],
	},
	caloriesContainer: {
		alignItems: "flex-end",
	},
	alternativesButton: {
		padding: spacing[1],
		borderRadius: radii.xs,
	},
});
