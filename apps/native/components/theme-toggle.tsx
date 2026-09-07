import { Ionicons } from "@expo/vector-icons";
import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";
import { Platform, Pressable, StyleSheet, type ViewStyle } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { useAppTheme } from "@/hooks/use-app-theme";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface ThemeToggleProps {
	style?: ViewStyle;
	/** `iconButton`: same footprint as header action chips (e.g. next to notifications). */
	variant?: "minimal" | "iconButton";
}

export function ThemeToggle({
	variant = "minimal",
	style,
}: Readonly<ThemeToggleProps>) {
	const { toggleTheme, isLight } = useAppTheme();
	const colors = useColors();
	const elevation = useShadows();

	const handlePress = () => {
		if (Platform.OS === "ios") {
			impactAsync(ImpactFeedbackStyle.Light);
		}
		toggleTheme();
	};

	const isIconButton = variant === "iconButton";

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				isIconButton ? styles.iconButton : styles.minimal,
				isIconButton && {
					backgroundColor: colors.card,
					opacity: pressed ? 0.85 : 1,
					...elevation.sm,
				},
				style,
			]}
		>
			{isLight ? (
				<Animated.View entering={ZoomIn} exiting={FadeOut} key="moon">
					<Ionicons color={colors.ink} name="moon" size={20} />
				</Animated.View>
			) : (
				<Animated.View entering={ZoomIn} exiting={FadeOut} key="sun">
					<Ionicons color={colors.ink} name="sunny" size={20} />
				</Animated.View>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	minimal: {
		paddingHorizontal: spacing[2.5],
	},
	iconButton: {
		width: 44,
		height: 44,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
	},
});
