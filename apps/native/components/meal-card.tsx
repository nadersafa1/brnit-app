import type { CurrentDietPlanMealItemDto, MacrosDto } from "@brnit/api";
import { roundUpToTenth } from "@brnit/domain";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useMarkMealConsumed } from "@/hooks/use-mark-meal-consumed";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { useUnmarkMealConsumed } from "@/hooks/use-unmark-meal-consumed";
import { getConsumptionMarkEligibility } from "@/lib/consumption-date-window";
import { formatCalorieDisplay } from "@/lib/utils/numbers";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import { MealItemRow } from "./meal-item-row";

interface MealCardProps {
	assignmentEndDate?: string;
	assignmentStartDate?: string;
	calories: number;
	consumed?: boolean;
	consumedDate?: string;
	/** When provided, shows mark-as-consumed button. Omit when no plan for the day. */
	dietPlanAssignmentId?: string;
	dietPlanMealId?: string;
	icon: keyof typeof Ionicons.glyphMap;
	items: CurrentDietPlanMealItemDto[];
	macros: MacrosDto;
	maxPastDays?: number;
	onMealItemPress?: (item: CurrentDietPlanMealItemDto) => void;
	time: string;
	title: string;
}

export function MealCard({
	title,
	calories,
	time,
	icon,
	macros,
	items,
	dietPlanAssignmentId,
	dietPlanMealId,
	consumed = false,
	consumedDate,
	assignmentStartDate,
	assignmentEndDate,
	maxPastDays,
	onMealItemPress,
}: Readonly<MealCardProps>) {
	const colors = useColors();
	const elevation = useShadows();
	const [expanded, setExpanded] = useState(false);
	const markConsumed = useMarkMealConsumed();
	const unmarkConsumed = useUnmarkMealConsumed();

	const showConsumedControl = Boolean(
		dietPlanAssignmentId && dietPlanMealId && consumedDate
	);
	const markEligibility = useMemo(() => {
		if (!showConsumedControl) {
			return { allowed: false };
		}
		return getConsumptionMarkEligibility(String(consumedDate), {
			maxPastDays,
			assignmentStartDate,
			assignmentEndDate,
		});
	}, [
		assignmentEndDate,
		assignmentStartDate,
		consumedDate,
		maxPastDays,
		showConsumedControl,
	]);
	const isConsumedActionPending =
		markConsumed.isPending || unmarkConsumed.isPending;

	const handleConsumedPress = () => {
		if (!(dietPlanAssignmentId && dietPlanMealId && consumedDate)) {
			return;
		}
		if (consumed) {
			unmarkConsumed.mutate({
				dietPlanAssignmentId,
				dietPlanMealId,
				consumedDate,
			});
		} else {
			markConsumed.mutate({
				dietPlanAssignmentId,
				dietPlanMealId,
				consumedDate,
			});
		}
	};

	const toggleExpanded = () => {
		LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
		setExpanded((prev) => !prev);
	};

	const p = roundUpToTenth(macros.protein);
	const c = roundUpToTenth(macros.carbs);
	const f = roundUpToTenth(macros.fat);
	const itemSuffix = items.length === 1 ? "" : "s";
	const itemsLabel =
		items.length === 0
			? "View items"
			: `View ${items.length} item${itemSuffix}`;

	return (
		<View
			style={[styles.container, { backgroundColor: colors.card }, elevation.sm]}
		>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<View
						style={[
							styles.iconContainer,
							{ backgroundColor: colors.surfaceAlt },
						]}
					>
						<Ionicons color={colors.accentFg} name={icon} size={20} />
					</View>
					<View>
						<Text size="base" weight="semibold">
							{title}
						</Text>
						<Text muted size="xs" weight="medium">
							{time}
						</Text>
					</View>
				</View>
				<View style={styles.headerRight}>
					<View style={styles.caloriesContainer}>
						<Text accent size="base" weight="bold">
							{formatCalorieDisplay(calories)}
						</Text>
						<Text muted size="xs" style={styles.kcalLabel} weight="medium">
							kcal
						</Text>
					</View>
					{/* Mark/unmark consumed: one icon, toggles between outline (unconsumed) and filled (consumed). */}
					{showConsumedControl &&
						(markEligibility.allowed ? (
							<Pressable
								disabled={isConsumedActionPending}
								hitSlop={8}
								onPress={handleConsumedPress}
								style={({ pressed }) => [
									styles.consumedButton,
									pressed && { opacity: 0.7 },
								]}
							>
								{isConsumedActionPending ? (
									<Spinner size="sm" />
								) : (
									<Ionicons
										color={consumed ? colors.muted : colors.accentFg}
										name={
											consumed ? "checkmark-circle" : "checkmark-circle-outline"
										}
										size={28}
									/>
								)}
							</Pressable>
						) : null)}
				</View>
			</View>

			<View style={styles.macrosRow}>
				<Text muted size="xs">
					P: {p}g
				</Text>
				<Text muted size="xs" style={styles.macroDivider}>
					•
				</Text>
				<Text muted size="xs">
					C: {c}g
				</Text>
				<Text muted size="xs" style={styles.macroDivider}>
					•
				</Text>
				<Text muted size="xs">
					F: {f}g
				</Text>
			</View>

			<Pressable
				onPress={toggleExpanded}
				style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.7 }]}
			>
				<Text muted size="sm" weight="medium">
					{itemsLabel}
				</Text>
				<Ionicons
					color={colors.muted}
					name={expanded ? "chevron-up" : "chevron-down"}
					size={18}
				/>
			</Pressable>

			{expanded && items.length === 0 && (
				<Text muted size="sm" weight="medium">
					No items
				</Text>
			)}
			{expanded && items.length > 0 && (
				<View style={styles.itemsList}>
					{items.map((item) => (
						<MealItemRow
							item={item}
							key={item.mealItemId}
							onPress={() => onMealItemPress?.(item)}
						/>
					))}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		borderRadius: radii.sm,
		padding: spacing[4],
		marginBottom: spacing[3],
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing[3],
	},
	headerLeft: {
		flexDirection: "row",
		alignItems: "center",
	},
	iconContainer: {
		width: 40,
		height: 40,
		borderRadius: radii.xl,
		alignItems: "center",
		justifyContent: "center",
		marginRight: spacing[3],
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
	},
	caloriesContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	kcalLabel: {
		marginLeft: spacing[0.5],
	},
	consumedButton: {
		padding: spacing[1],
		justifyContent: "center",
		alignItems: "center",
		minWidth: 36,
		minHeight: 36,
	},
	macrosRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: spacing[2],
	},
	macroDivider: {
		marginHorizontal: spacing[1],
	},
	toggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing[2],
	},
	itemsList: {
		marginTop: spacing[1],
	},
});
