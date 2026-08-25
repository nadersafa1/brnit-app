import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import type { ThemePreference } from "@/store/theme-preference-store";
import type { ThemeColors } from "@/theme/colors";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

const OPTIONS: { value: ThemePreference; label: string }[] = [
	{ value: "light", label: "Light" },
	{ value: "dark", label: "Dark" },
	{ value: "system", label: "Auto" },
];

/**
 * Profile-only control: persisted theme preference (light / dark / follow system).
 * Self-contained so the Profile screen stays focused on layout and navigation.
 */
export function ProfileAppearanceCard() {
	const colors = useColors();
	const elevation = useShadows();
	const { themePreference, setTheme } = useAppTheme();

	return (
		<View style={[styles.card, { backgroundColor: colors.card }, elevation.sm]}>
			<View style={styles.header}>
				<View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
					<Ionicons
						color={colors.accentFg}
						name="color-palette-outline"
						size={16}
					/>
				</View>
				<Text
					size="sm"
					style={{ color: colors.ink, flex: 1 }}
					weight="semibold"
				>
					Appearance
				</Text>
			</View>
			<View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
				{OPTIONS.map((opt) => (
					<AppearanceSegment
						colors={colors}
						key={opt.value}
						label={opt.label}
						onSelect={() => setTheme(opt.value)}
						selected={themePreference === opt.value}
					/>
				))}
			</View>
		</View>
	);
}

function AppearanceSegment({
	colors,
	label,
	selected,
	onSelect,
}: Readonly<{
	colors: ThemeColors;
	label: string;
	selected: boolean;
	onSelect: () => void;
}>) {
	return (
		<Pressable
			onPress={onSelect}
			style={({ pressed }) => [
				styles.segment,
				selected && segmentSelectedStyle(colors),
				{ opacity: pressed ? 0.88 : 1 },
			]}
		>
			<Text
				size="xs"
				style={{ color: selected ? colors.ink : colors.muted }}
				weight={selected ? "semibold" : "medium"}
			>
				{label}
			</Text>
		</Pressable>
	);
}

function segmentSelectedStyle(colors: ThemeColors) {
	return [
		styles.segmentSelected,
		{
			backgroundColor: colors.card,
			borderColor: colors.border,
			shadowColor: colors.black,
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.06,
			shadowRadius: 2,
			elevation: 2,
		},
	];
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radii.lg,
		paddingHorizontal: spacing[3],
		paddingVertical: spacing[3],
		marginBottom: spacing[4],
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
		marginBottom: spacing[2],
	},
	iconWrap: {
		width: 28,
		height: 28,
		borderRadius: radii.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	track: {
		flexDirection: "row",
		borderRadius: radii.pill,
		padding: 3,
	},
	segment: {
		flex: 1,
		paddingVertical: 7,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
	},
	segmentSelected: {
		borderWidth: 1,
	},
});
