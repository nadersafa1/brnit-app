import { ImpactFeedbackStyle, impactAsync } from "expo-haptics";
import { useRef } from "react";
import {
	Animated,
	Pressable,
	StyleSheet,
	type TextStyle,
	type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { fontSize, fontWeight } from "@/theme/typography";
import { Spinner } from "./spinner";
import { Text } from "./text";

type ButtonVariant = "solid" | "outline" | "soft" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
	children: React.ReactNode;
	disabled?: boolean;
	fullWidth?: boolean;
	haptic?: boolean;
	loading?: boolean;
	/** Optional so `<Link asChild>` can inject its own navigation handler. */
	onPress?: () => void;
	size?: ButtonSize;
	style?: ViewStyle;
	textStyle?: TextStyle;
	variant?: ButtonVariant;
}

export function Button(props: Readonly<ButtonProps>) {
	const {
		children,
		onPress,
		variant = "solid",
		size = "md",
		disabled = false,
		loading = false,
		fullWidth = true,
		haptic = true,
		style,
		textStyle,
	} = props;

	const colors = useColors();
	const scaleAnim = useRef(new Animated.Value(1)).current;

	const isDisabled = disabled || loading;

	const handlePressIn = () => {
		Animated.spring(scaleAnim, {
			toValue: 0.97,
			useNativeDriver: true,
		}).start();
	};

	const handlePressOut = () => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			friction: 3,
			tension: 100,
			useNativeDriver: true,
		}).start();
	};

	const handlePress = () => {
		if (isDisabled) {
			return;
		}
		if (haptic) {
			const impactStyle =
				variant === "solid"
					? ImpactFeedbackStyle.Medium
					: ImpactFeedbackStyle.Light;
			impactAsync(impactStyle);
		}
		onPress?.();
	};

	const variantStyles = getVariantStyles(variant, colors, isDisabled);
	const sizeStyle = SIZE_STYLES[size];
	const textSizeStyle = TEXT_SIZE_STYLES[size];

	const renderContent = () => {
		if (loading) {
			return <Spinner color={variantStyles.textColor} size="sm" />;
		}

		if (typeof children === "string") {
			return (
				<Text
					style={[
						styles.text,
						textSizeStyle,
						{ color: variantStyles.textColor },
						textStyle,
					]}
				>
					{children}
				</Text>
			);
		}

		return children;
	};

	return (
		<Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
			<Pressable
				disabled={isDisabled}
				onPress={handlePress}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				style={[
					styles.button,
					sizeStyle,
					variantStyles.container,
					fullWidth && styles.fullWidth,
					isDisabled && styles.disabled,
					style,
				]}
			>
				{renderContent()}
			</Pressable>
		</Animated.View>
	);
}

function getVariantStyles(
	variant: ButtonVariant,
	colors: ReturnType<typeof useColors>,
	disabled: boolean
) {
	const fillColor = disabled ? colors.muted : colors.accent;
	const copyColor = disabled ? colors.muted : colors.accentFg;

	switch (variant) {
		case "solid":
			return {
				container: {
					backgroundColor: fillColor,
					borderWidth: 0,
				} as ViewStyle,
				textColor: colors.onAccent,
			};
		case "outline":
			return {
				container: {
					backgroundColor: colors.transparent,
					borderWidth: 1,
					borderColor: fillColor,
				} as ViewStyle,
				textColor: copyColor,
			};
		case "soft":
			return {
				container: {
					backgroundColor: colors.accentSoft,
					borderWidth: 0,
				} as ViewStyle,
				textColor: copyColor,
			};
		default:
			// `ghost` and anything added later: no fill, accent copy.
			return {
				container: {
					backgroundColor: colors.transparent,
					borderWidth: 0,
				} as ViewStyle,
				textColor: copyColor,
			};
	}
}

const styles = StyleSheet.create({
	button: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radii.pill,
		gap: 8,
	},
	fullWidth: {
		width: "100%",
	},
	disabled: {
		opacity: 0.6,
	},
	text: {
		fontWeight: fontWeight.medium,
	},
});

const SIZE_STYLES = StyleSheet.create({
	sm: { height: 36, paddingHorizontal: 16 },
	md: { height: 44, paddingHorizontal: 20 },
	lg: { height: 52, paddingHorizontal: 24 },
});

const TEXT_SIZE_STYLES = StyleSheet.create({
	sm: { fontSize: fontSize.sm },
	md: { fontSize: fontSize.base },
	lg: { fontSize: fontSize.lg },
});
